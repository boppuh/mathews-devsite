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
  function setTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      localStorage.setItem(THEME_KEY, theme);
    }

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
  setTheme(initialTheme, false);

  // Add click handler to toggle button
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Listen for system theme changes (when no manual preference is set)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    const stored = localStorage.getItem(THEME_KEY);
    if (!stored) {
      setTheme(e.matches ? 'dark' : 'light', false);
    }
  });

  // ==========================================================================
  // Navigation State & Reading Progress
  // ==========================================================================

  const navLinks = Array.from(document.querySelectorAll('.nav-list a[href^="#"]'));
  const navTargets = navLinks
    .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter(item => item.section);
  let scrollUpdateQueued = false;

  function updateNavigationState() {
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = documentHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / documentHeight)) : 0;
    document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));

    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
    const activationLine = headerHeight + window.innerHeight * 0.24;
    let activeLink = null;

    navTargets.forEach(({ link, section }) => {
      if (section.getBoundingClientRect().top <= activationLine) {
        activeLink = link;
      }
    });

    navLinks.forEach(link => {
      if (link === activeLink) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    scrollUpdateQueued = false;
  }

  function scheduleNavigationUpdate() {
    if (!scrollUpdateQueued) {
      scrollUpdateQueued = true;
      window.requestAnimationFrame(updateNavigationState);
    }
  }

  window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
  window.addEventListener('resize', scheduleNavigationUpdate);
  updateNavigationState();

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
  // Intersection Observer — Scroll Reveal
  // ==========================================================================

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.1
    });

    // Section headings fade in
    document.querySelectorAll('.section h2').forEach(el => {
      el.classList.add('reveal');
      observer.observe(el);
    });

    // Cards and project panels stagger within each grid
    const grids = '.impact-grid, .project-showcase, .experience-grid';
    document.querySelectorAll(grids).forEach(grid => {
      grid.querySelectorAll('.card, .project-panel').forEach((item, i) => {
        item.style.setProperty('--reveal-delay', `${i * 60}ms`);
        item.classList.add('reveal');
        observer.observe(item);
      });
    });

    // Skill groups stagger (they're not .card elements)
    document.querySelectorAll('.skills-grid .skill-group').forEach((group, i) => {
      group.style.setProperty('--reveal-delay', `${i * 60}ms`);
      group.classList.add('reveal');
      observer.observe(group);
    });

    document.querySelectorAll('.current-work-story').forEach(story => {
      story.classList.add('reveal');
      observer.observe(story);
    });
  }

})();
