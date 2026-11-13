(function () {
  'use strict';

  document.querySelector('.desktop-preview-link').hidden = false;
  if (new URLSearchParams(location.search).get('view') !== 'desktop') return;

  const main = document.getElementById('main');
  const workspace = document.getElementById('desktop-workspace');
  const taskbar = document.getElementById('desktop-taskbar');
  const start = document.getElementById('desktop-start');
  const startPanel = document.getElementById('desktop-start-panel');
  const tasks = document.getElementById('desktop-tasks');
  const compact = matchMedia('(max-width: 47.99rem)');
  const windows = {
    welcome: createWindow('desktop-welcome', 'Welcome', 'icon-window'),
    about: createWindow('about', 'About Me', 'icon-document')
  };

  // Least recently active to most recently active, including minimized windows.
  const windowStack = [];
  let activeWindow = null;
  let drag = null;
  let keyboardMove = null;

  function createWindow(id, label, icon) {
    const section = document.getElementById(id);
    const task = document.createElement('button');
    task.type = 'button';
    task.className = 'desktop-button desktop-task';
    task.dataset.taskWindow = section.dataset.desktopWindow;
    task.setAttribute('aria-controls', id);

    const taskIcon = document.createElement('span');
    taskIcon.className = `desktop-icon ${icon}`;
    taskIcon.setAttribute('aria-hidden', 'true');
    const taskLabel = document.createElement('span');
    taskLabel.textContent = label;
    task.append(taskIcon, taskLabel);

    return {
      section,
      task,
      heading: document.getElementById(section.getAttribute('aria-labelledby')),
      titlebar: section.querySelector('.desktop-titlebar'),
      maximizeButton: section.querySelector('[data-window-action="maximize"]'),
      closeButton: section.querySelector('[data-window-action="close"]'),
      moveButton: section.querySelector('[data-window-action="move"]'),
      label,
      state: 'closed',
      maximized: false,
      launcher: null
    };
  }

  function renderWindows() {
    main.dataset.desktopWindow = activeWindow?.section.dataset.desktopWindow || '';

    for (const entry of Object.values(windows)) {
      const { section, task, label } = entry;
      section.dataset.windowState = entry.state;
      section.toggleAttribute('data-active', entry === activeWindow);
      section.toggleAttribute('data-maximized', entry.maximized);
      section.style.setProperty('--window-z', windowStack.indexOf(entry) + 1);
      task.setAttribute('aria-pressed', String(entry === activeWindow));
      const maximizeLabel = `${entry.maximized ? 'Restore' : 'Maximize'} ${label}`;
      entry.maximizeButton.setAttribute('aria-label', maximizeLabel);
      entry.maximizeButton.title = maximizeLabel;
      entry.moveButton.disabled = entry.maximized;
      entry.closeButton.setAttribute('aria-label', compact.matches ? `Back (close ${label})` : `Close ${label}`);

      if (entry.state === 'closed') {
        task.remove();
      } else if (!tasks.contains(task)) {
        tasks.append(task);
      }
    }
  }

  function activate(entry, pushHistory = false) {
    if (entry === activeWindow) return;
    if (keyboardMove && keyboardMove.entry !== entry) finishKeyboardMove();
    const index = windowStack.indexOf(entry);
    if (index !== -1) windowStack.splice(index, 1);
    windowStack.push(entry);
    activeWindow = entry;
    renderWindows();
    if (pushHistory) writeLocation(entry, true);
  }

  function writeLocation(entry, push = false) {
    const url = new URL(location.href);
    url.hash = entry ? entry.section.id : '';
    if (url.href === location.href) return;
    if (push) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
  }

  function focusHeading(entry) {
    const heading = entry.heading.getBoundingClientRect();
    const titlebar = entry.titlebar.getBoundingClientRect();
    const target = heading.top < titlebar.bottom ? entry.titlebar : entry.heading;
    target.focus({ preventScroll: true });
  }

  function openWindow(entry, launcher, pushHistory = false) {
    if (launcher) entry.launcher = launcher.closest('#desktop-start-panel') ? start : launcher;
    entry.state = 'open';
    activate(entry, pushHistory);
    keepWindowInBounds(entry);
  }

  function hideWindow(entry, state) {
    if (keyboardMove?.entry === entry) finishKeyboardMove();
    entry.state = state;
    if (state === 'closed') {
      windowStack.splice(windowStack.indexOf(entry), 1);
      entry.maximized = false;
      entry.section.style.removeProperty('--window-x');
      entry.section.style.removeProperty('--window-y');
    }
    if (entry === activeWindow) {
      activeWindow = windowStack.findLast(candidate => candidate.state === 'open') || null;
    }
    renderWindows();
    writeLocation(activeWindow);

    if (state === 'minimized') {
      entry.task.focus();
      return;
    }

    const shortcut = workspace.querySelector(`[data-open-window="${entry.section.dataset.desktopWindow}"]`);
    const launcher = entry.launcher || shortcut;
    const launcherVisible = launcher?.getClientRects().length
      && getComputedStyle(launcher).visibility === 'visible';
    (launcherVisible ? launcher : start).focus();
    entry.launcher = null;
  }

  function toggleMaximize(entry) {
    if (compact.matches) return;
    if (keyboardMove) finishKeyboardMove();
    entry.maximized = !entry.maximized;
    renderWindows();
    keepWindowInBounds(entry);
  }

  function windowPosition(entry) {
    const rect = entry.section.getBoundingClientRect();
    const desktop = main.getBoundingClientRect();
    return { x: rect.left - desktop.left, y: rect.top - desktop.top };
  }

  function moveWindow(entry, x, y) {
    const margin = 6;
    const rect = entry.section.getBoundingClientRect();
    const desktop = main.getBoundingClientRect();
    const taskbarTop = taskbar.getBoundingClientRect().top;
    const maxX = Math.max(margin, desktop.width - rect.width - margin);
    const maxY = Math.max(margin, taskbarTop - desktop.top - rect.height - margin);
    entry.section.style.setProperty('--window-x', `${Math.min(Math.max(x, margin), maxX)}px`);
    entry.section.style.setProperty('--window-y', `${Math.min(Math.max(y, margin), maxY)}px`);
  }

  function keepWindowInBounds(entry) {
    if (compact.matches || entry.maximized || entry.state !== 'open') return;
    // CSS keeps the initial position responsive until the visitor moves a window.
    if (!entry.section.style.getPropertyValue('--window-x')) return;
    const { x, y } = windowPosition(entry);
    moveWindow(entry, x, y);
  }

  function finishKeyboardMove(cancel = false) {
    const { entry, x, y } = keyboardMove;
    keyboardMove = null;
    entry.section.removeAttribute('data-moving');
    entry.moveButton.setAttribute('aria-pressed', 'false');
    if (cancel) moveWindow(entry, x, y);
  }

  function startKeyboardMove(entry) {
    if (compact.matches || entry.maximized) return;
    if (keyboardMove) finishKeyboardMove();
    keyboardMove = { entry, ...windowPosition(entry) };
    entry.section.setAttribute('data-moving', '');
    entry.moveButton.setAttribute('aria-pressed', 'true');
    keepWindowInBounds(entry);
    entry.moveButton.focus();
  }

  function setStartOpen(open) {
    startPanel.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
    if (open) startPanel.querySelector('a').focus();
  }

  function readLocation(moveFocus = false) {
    const hash = location.hash;
    const entry = Object.values(windows).find(candidate => hash === `#${candidate.section.id}`)
      || ((!hash || hash === '#main') ? windows.welcome : null);
    if (entry) {
      setStartOpen(false);
      openWindow(entry);
      if (moveFocus) focusHeading(entry);
      return true;
    }

    // Sections outside the prototype use their original anchors in reading view.
    const readingUrl = new URL(location.href);
    readingUrl.searchParams.delete('view');
    location.replace(readingUrl);
    return false;
  }

  if (!readLocation()) return;
  workspace.hidden = false;
  taskbar.hidden = false;
  windows.welcome.section.hidden = false;
  windows.about.titlebar.hidden = false;
  windows.about.section.querySelector('.container').tabIndex = 0;
  document.body.classList.add('desktop-mode');

  function entryFor(element) {
    const section = element.closest('section[data-desktop-window]');
    return section ? windows[section.dataset.desktopWindow] : null;
  }

  document.querySelector('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    main.focus({ preventScroll: true });
  });

  start.addEventListener('click', () => setStartOpen(startPanel.hidden));

  main.addEventListener('click', (event) => {
    const shortcut = event.target.closest('[data-open-window]');
    if (shortcut && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      const entry = windows[shortcut.dataset.openWindow];
      setStartOpen(false);
      openWindow(entry, shortcut, true);
      focusHeading(entry);
      return;
    }

    if (!startPanel.hidden && !event.target.closest('#desktop-start, #desktop-start-panel')) {
      const restoreStartFocus = startPanel.contains(document.activeElement);
      setStartOpen(false);
      if (restoreStartFocus) start.focus();
    }

    const task = event.target.closest('[data-task-window]');
    if (task) {
      const entry = windows[task.dataset.taskWindow];
      openWindow(entry, null, true);
      focusHeading(entry);
      return;
    }

    const control = event.target.closest('[data-window-action]');
    if (!control) return;
    const entry = entryFor(control);
    switch (control.dataset.windowAction) {
      case 'close':
        hideWindow(entry, 'closed');
        break;
      case 'minimize':
        hideWindow(entry, 'minimized');
        break;
      case 'maximize':
        toggleMaximize(entry);
        break;
      case 'move':
        startKeyboardMove(entry);
        break;
    }
  });

  main.addEventListener('focusin', (event) => {
    const entry = entryFor(event.target);
    if (entry?.state === 'open') activate(entry, true);
  });

  main.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const entry = entryFor(event.target);
    if (!entry || entry.state !== 'open') return;
    const hadFocusInBackground = activeWindow !== entry
      && activeWindow?.section.contains(document.activeElement);
    activate(entry, true);
    if (hadFocusInBackground) focusHeading(entry);

    if (compact.matches || entry.maximized || event.target.closest('button')) return;
    if (!event.target.closest('.desktop-titlebar')) return;
    if (keyboardMove) finishKeyboardMove();
    drag = {
      entry,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ...windowPosition(entry)
    };
    entry.titlebar.setPointerCapture(event.pointerId);
  });

  main.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    moveWindow(drag.entry, drag.x + event.clientX - drag.startX, drag.y + event.clientY - drag.startY);
  });

  main.addEventListener('lostpointercapture', (event) => {
    if (drag?.pointerId === event.pointerId) drag = null;
  });

  const arrowSteps = {
    ArrowLeft: [-12, 0],
    ArrowRight: [12, 0],
    ArrowUp: [0, -12],
    ArrowDown: [0, 12]
  };

  main.addEventListener('keydown', (event) => {
    if (keyboardMove) {
      const step = arrowSteps[event.key];
      if (step) {
        event.preventDefault();
        const { entry } = keyboardMove;
        const { x, y } = windowPosition(entry);
        moveWindow(entry, x + step[0], y + step[1]);
      } else if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
        event.preventDefault();
        finishKeyboardMove(event.key === 'Escape');
      }
      return;
    }
    if (event.key === 'Escape' && !startPanel.hidden) {
      setStartOpen(false);
      start.focus();
    }
  });

  for (const entry of Object.values(windows)) {
    entry.moveButton.addEventListener('blur', () => {
      if (keyboardMove?.entry === entry) finishKeyboardMove();
    });
  }

  taskbar.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !taskbar.contains(event.relatedTarget)) setStartOpen(false);
  });

  compact.addEventListener('change', () => {
    if (keyboardMove) finishKeyboardMove();
    if (drag) {
      const { entry, pointerId } = drag;
      drag = null;
      if (entry.titlebar.hasPointerCapture(pointerId)) entry.titlebar.releasePointerCapture(pointerId);
    }
    renderWindows();
  });

  window.addEventListener('resize', () => Object.values(windows).forEach(keepWindowInBounds));
  window.addEventListener('hashchange', () => readLocation(true));
})();
