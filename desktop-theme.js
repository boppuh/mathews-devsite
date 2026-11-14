(function () {
  'use strict';

  const key = 'desktop-theme-preference';
  const root = document.documentElement;
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const choices = ['classic', 'dark', 'system'];

  function readPreference() {
    try {
      const saved = localStorage.getItem(key);
      if (choices.includes(saved)) return saved;
    } catch {
      // The current page still works when storage is unavailable.
    }
    return 'classic';
  }

  let preference = readPreference();

  function applyPalette() {
    root.dataset.desktopTheme = preference === 'dark' || (preference === 'system' && systemTheme.matches)
      ? 'dark'
      : 'classic';
  }

  function syncControls() {
    document.querySelectorAll('input[name="desktop-theme"]').forEach(input => {
      input.checked = input.value === preference;
    });
  }

  applyPalette();
  document.addEventListener('DOMContentLoaded', syncControls, { once: true });
  systemTheme.addEventListener('change', applyPalette);

  document.addEventListener('change', event => {
    const input = event.target;
    if (!input.matches('input[name="desktop-theme"]:checked') || !choices.includes(input.value)) return;
    preference = input.value;
    applyPalette();
    try {
      localStorage.setItem(key, preference);
    } catch {
      // Keep the choice applied for this page.
    }
  });

  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = readPreference();
    applyPalette();
    syncControls();
  });
})();
