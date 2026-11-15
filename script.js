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

  const { gsapSrc, scrollTriggerSrc } = document.currentScript.dataset;

  // ==========================================================================
  // Auto-update Copyright Year
  // ==========================================================================

  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // The Windows 95 views use their own theme and navigation.
  if (document.body.matches('.desktop-mode, .desktop-document')) return;

  // ==========================================================================
  // Theme Toggle
  // ==========================================================================

  const THEME_KEY = 'theme-preference';
  const themeToggle = document.getElementById('theme-toggle');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let themePreference;

  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') themePreference = savedTheme;
  } catch {
    // Storage can be unavailable in some browser sessions.
  }

  /**
   * Apply theme to document
   */
  function setTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      themePreference = theme;
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Keep the choice for this page when it cannot be saved.
      }
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
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Initialize theme on page load
  const initialTheme = themePreference || (systemTheme.matches ? 'dark' : 'light');
  setTheme(initialTheme, false);

  // Add click handler to toggle button
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Listen for system theme changes (when no manual preference is set)
  systemTheme.addEventListener('change', (e) => {
    if (!themePreference) setTheme(e.matches ? 'dark' : 'light', false);
  });

  // ==========================================================================
  // Navigation State & Reading Progress
  // ==========================================================================

  const navLinks = Array.from(document.querySelectorAll('.nav-list a[href^="#"]'));
  const navTargets = navLinks
    .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter(item => item.section);
  const workLink = navLinks.find(link => link.getAttribute('href') === '#work');
  const projectsSection = document.getElementById('projects');

  if (workLink && projectsSection) {
    navTargets.push({ link: workLink, section: projectsSection });
  }

  function setActiveNavigation(activeLink) {
    navLinks.forEach(link => {
      if (activeLink && link === activeLink) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  const initialActiveLink = navLinks.find(link => link.getAttribute('href') === window.location.hash);
  setActiveNavigation(initialActiveLink || null);

  let navigationObserver = null;

  function observeNavigationSections() {
    if (!('IntersectionObserver' in window)) return;

    navigationObserver?.disconnect();

    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
    const visibleNavigationTargets = new Set();

    navigationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibleNavigationTargets.add(entry.target);
        } else {
          visibleNavigationTargets.delete(entry.target);
        }
      });

      const intersecting = Array.from(visibleNavigationTargets)
        .sort((a, b) => Math.abs(a.getBoundingClientRect().top - headerHeight) - Math.abs(b.getBoundingClientRect().top - headerHeight));

      if (intersecting.length === 0) {
        setActiveNavigation(null);
        return;
      }

      const activeTarget = navTargets.find(item => item.section === intersecting[0]);
      setActiveNavigation(activeTarget?.link || null);
    }, {
      rootMargin: `-${headerHeight}px 0px -58% 0px`,
      threshold: [0, 0.2]
    });

    navTargets.forEach(({ section }) => navigationObserver.observe(section));
  }

  observeNavigationSections();

  if ('ResizeObserver' in window) {
    const header = document.querySelector('.site-header');
    if (header) {
      const headerObserver = new ResizeObserver(observeNavigationSections);
      headerObserver.observe(header);
    }
  }

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
  // Intersection Observer - Scroll Reveal
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

    // Related items enter together so each section's hierarchy stays clear.
    const revealGroups = [
      { container: '.impact-grid', items: '.impact-card' },
      { container: '.project-showcase', items: '.project-panel' },
      { container: '.career-ledger', items: '.career-entry' },
      { container: '.capability-ledger dl', items: 'div' }
    ];

    revealGroups.forEach(({ container, items }) => {
      document.querySelectorAll(container).forEach(group => {
        group.querySelectorAll(items).forEach((item, i) => {
          item.style.setProperty('--reveal-delay', `${i * 60}ms`);
          item.classList.add('reveal');
          observer.observe(item);
        });
      });
    });

    document.querySelectorAll('.current-work-story').forEach(story => {
      story.classList.add('reveal');
      observer.observe(story);
    });

    document.querySelectorAll('.contact-directory').forEach(directory => {
      directory.style.setProperty('--reveal-delay', '80ms');
      directory.classList.add('reveal');
      observer.observe(directory);
    });
  }

  // ==========================================================================
  // GSAP Motion Layer
  // ==========================================================================

  function setupMotion() {
    if (!window.gsap || !window.ScrollTrigger) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    const motionMedia = gsap.matchMedia();

    motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
      const progress = document.querySelector('.reading-progress');

      if (progress) {
        gsap.to(progress, {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.2
          }
        });
      }

      gsap.utils.toArray('.project-image-motion').forEach(frame => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: frame.parentElement,
            start: 'top 92%',
            end: 'bottom 8%',
            scrub: 0.7
          }
        });

        timeline
          .fromTo(frame, {
            scale: 0.82,
            autoAlpha: 0.2
          }, {
            scale: 1,
            autoAlpha: 1,
            duration: 0.46,
            ease: 'none'
          })
          .to(frame, {
            scale: 1.04,
            autoAlpha: 0.3,
            duration: 0.54,
            ease: 'none'
          });
      });
    });

    motionMedia.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const cleanups = [];
      const projectsContainer = document.querySelector('.projects-section .container');
      const projectsHeading = document.querySelector('.projects-heading');
      const projectShowcase = document.querySelector('.project-showcase');

      if (projectsContainer && projectsHeading && projectShowcase) {
        const getPinOffset = () => (document.querySelector('.site-header')?.offsetHeight || 0) + 32;
        const pin = ScrollTrigger.create({
          trigger: projectsContainer,
          start: () => `top top+=${getPinOffset()}`,
          endTrigger: projectShowcase,
          end: () => `top top+=${getPinOffset()}`,
          pin: projectsHeading,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        });

        cleanups.push(() => pin.kill());
      }

      const initiativeCards = gsap.utils.toArray('.case-study-initiative');

      initiativeCards.slice(0, -1).forEach((card, index) => {
        const nextCard = initiativeCards[index + 1];
        const tween = gsap.to(card, {
          scale: 0.965,
          ease: 'none',
          scrollTrigger: {
            trigger: nextCard,
            start: 'top bottom-=18%',
            end: () => `top top+=${(document.querySelector('.site-header')?.offsetHeight || 0) + 24}`,
            scrub: 0.5,
            invalidateOnRefresh: true
          }
        });

        cleanups.push(() => tween.kill());
      });

      return () => cleanups.forEach(cleanup => cleanup());
    });

    if (document.readyState === 'complete') ScrollTrigger.refresh();
    else window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  if (!prefersReducedMotion && gsapSrc && scrollTriggerSrc) {
    // Load the plugin after GSAP, and keep the reading view usable if either fails.
    loadScript(gsapSrc)
      .then(() => loadScript(scrollTriggerSrc))
      .then(setupMotion, () => {});
  }

})();
