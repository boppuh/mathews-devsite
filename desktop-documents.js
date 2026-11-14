(function () {
  'use strict';

  const desktopView = new URLSearchParams(location.search).get('view') === 'desktop';
  document.body.classList.toggle('desktop-document', desktopView);

  document.addEventListener('DOMContentLoaded', () => {
    const link = document.querySelector(`[data-document-view="${desktopView ? 'reading' : 'desktop'}"]`);

    function updateViewLink() {
      const url = new URL(location.href);
      if (desktopView) {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', 'desktop');
      }
      link.href = url.href;
    }

    updateViewLink();
    link.hidden = false;
    window.addEventListener('hashchange', updateViewLink);

    if (desktopView) {
      document.querySelectorAll('.desktop-document-header, .desktop-document-contents, .case-study-desktop-return')
        .forEach(element => { element.hidden = false; });
      // The desktop technology list fits on the page and does not need a scroll stop.
      document.querySelector('.case-study-marquee').removeAttribute('tabindex');
    }
  }, { once: true });
})();
