/**
 * Resume Website - Minimal JavaScript
 *
 * Features:
 * - Auto-updates copyright year
 * - Theme toggle (light/dark mode)
 * - Smooth scroll fallback (for older browsers)
 * - Respects prefers-reduced-motion
 */

(function () {
  'use strict';

  // ==========================================================================
  // Auto-update Copyright Year
  // ==========================================================================

  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // ==========================================================================
  // Theme Toggle
  // ==========================================================================

  const THEME_KEY = 'theme-preference';
  const themeToggle = document.getElementById('theme-toggle');

  /**
   * Get the user's theme preference
   * Priority: localStorage > system preference > light
   */
  function getThemePreference() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Apply theme to document
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    // Update toggle button aria-label
    if (themeToggle) {
      const isDark = theme === 'dark';
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || getThemePreference();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Initialize theme on page load
  const initialTheme = getThemePreference();
  setTheme(initialTheme);

  // Add click handler to toggle button
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Listen for system theme changes (when no manual preference is set)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    const stored = localStorage.getItem(THEME_KEY);
    if (!stored) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  // ==========================================================================
  // Smooth Scroll (Progressive Enhancement)
  // ==========================================================================

  // Check if native smooth scroll is supported
  const supportsNativeSmoothScroll = 'scrollBehavior' in document.documentElement.style;

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!supportsNativeSmoothScroll && !prefersReducedMotion) {
    // Polyfill smooth scroll for older browsers
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();

          // Calculate scroll position accounting for sticky header
          const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Update URL hash without jumping
          history.pushState(null, '', targetId);

          // Move focus to target for accessibility
          targetElement.setAttribute('tabindex', '-1');
          targetElement.focus({ preventScroll: true });
        }
      });
    });
  }

  // ==========================================================================
  // Intersection Observer for Scroll Animations (Optional Enhancement)
  // ==========================================================================

  // Only add animations if user doesn't prefer reduced motion
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe sections for subtle fade-in effect
    document.querySelectorAll('.section').forEach(section => {
      section.classList.add('fade-in');
      observer.observe(section);
    });
  }

})();
