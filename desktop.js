(function () {
  'use strict';

  const previewLink = document.querySelector('.desktop-preview-link');
  previewLink.hidden = false;
  if (new URLSearchParams(location.search).get('view') !== 'desktop') return;

  const workspace = document.getElementById('desktop-workspace');
  const main = document.getElementById('main');
  const taskbar = document.getElementById('desktop-taskbar');
  const start = document.getElementById('desktop-start');
  const startPanel = document.getElementById('desktop-start-panel');
  const task = document.getElementById('desktop-task');
  const taskLabel = document.getElementById('desktop-task-label');
  const taskIcon = document.getElementById('desktop-task-icon');
  const aboutBar = document.getElementById('desktop-about-bar');
  const windows = {
    welcome: {
      section: document.getElementById('desktop-welcome'),
      heading: document.getElementById('desktop-welcome-heading'),
      label: 'Welcome',
      icon: 'icon-window'
    },
    about: {
      section: document.getElementById('about'),
      heading: document.getElementById('about-heading'),
      label: 'About Me',
      icon: 'icon-document'
    }
  };

  let activeWindow;
  let launcher;

  function setStartOpen(open) {
    startPanel.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
    if (open) startPanel.querySelector('a').focus();
  }

  function showWindow(name, source) {
    activeWindow = name;
    main.dataset.desktopWindow = name || '';
    windows.welcome.section.hidden = name !== 'welcome';
    aboutBar.hidden = name !== 'about';
    task.hidden = !name;
    if (name) {
      const window = windows[name];
      taskLabel.textContent = window.label;
      taskIcon.className = `desktop-icon ${window.icon}`;
      task.setAttribute('aria-controls', window.section.id);
    }

    if (source) {
      launcher = source.closest('#desktop-start-panel') ? start : source;
      windows[name].heading.focus({ preventScroll: true });
    }
  }

  function replaceFragment(fragment) {
    const url = new URL(location.href);
    url.hash = fragment;
    history.replaceState(null, '', url);
  }

  function closeWindow() {
    const shortcut = workspace.querySelector(`[data-open-window="${activeWindow}"]`);
    showWindow(null);
    replaceFragment('');
    (launcher || shortcut || start).focus();
    launcher = null;
  }

  start.addEventListener('click', () => setStartOpen(startPanel.hidden));

  main.addEventListener('click', (event) => {
    const shortcut = event.target.closest('[data-open-window]');
    if (shortcut && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      setStartOpen(false);
      showWindow(shortcut.dataset.openWindow, shortcut);
      replaceFragment(shortcut.hash);
      return;
    }

    if (event.target.closest('[data-close-window]')) closeWindow();
    if (!startPanel.hidden && !event.target.closest('#desktop-start, #desktop-start-panel')) {
      const restoreStartFocus = startPanel.contains(document.activeElement);
      setStartOpen(false);
      if (restoreStartFocus) start.focus();
    }
  });

  task.addEventListener('click', () => windows[activeWindow].heading.focus());

  main.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !startPanel.hidden) {
      setStartOpen(false);
      start.focus();
    }
  });

  taskbar.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !taskbar.contains(event.relatedTarget)) setStartOpen(false);
  });

  function syncFragment() {
    const hash = location.hash;
    if (!hash || hash === '#main' || hash === '#desktop-welcome' || hash === '#about') {
      launcher = null;
      showWindow(hash === '#about' ? 'about' : 'welcome');
      return true;
    }

    // Sections outside the prototype use their original anchors in reading view.
    const readingUrl = new URL(location.href);
    readingUrl.searchParams.delete('view');
    location.replace(readingUrl);
    return false;
  }

  if (!syncFragment()) return;
  workspace.hidden = false;
  taskbar.hidden = false;
  windows.about.section.querySelector('.container').tabIndex = 0;
  document.body.classList.add('desktop-mode');
  window.addEventListener('hashchange', syncFragment);
})();
