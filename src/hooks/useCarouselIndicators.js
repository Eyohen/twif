import { useEffect } from 'react';

// Several dashboards turn their KPI rows into horizontal carousels on a phone,
// but most gave no sign that anything sat off the right edge — the row simply
// looked cropped. Rather than add dots to each component by hand, any row that
// actually overflows gets an indicator attached here, which also covers rows
// added later.
// Carousels are found by behaviour rather than by class name. Listing classes
// meant every new KPI row had to be remembered, and several were not — so some
// scrolled with an indicator and some without.
const isCardCarousel = (el) => {
  if (el.scrollWidth <= el.clientWidth + 8) return false;

  const overflowX = getComputedStyle(el).overflowX;
  if (overflowX !== 'auto' && overflowX !== 'scroll') return false;

  // A row of filter pills or a scrolling table is not a card carousel; dots
  // would describe neither of them usefully.
  if (el.tagName === 'NAV' || el.closest('nav')) return false;
  if (el.querySelector('table') || el.tagName === 'TABLE') return false;
  if (el.classList.contains('os-filter-pills')) return false;
  if (el.children.length < 2) return false;

  // Cards sit side by side; a single long line of text is not a carousel.
  return [...el.children].every((child) => child.getBoundingClientRect().width > 80);
};

const findCarousels = () => [...document.querySelectorAll('.workspace *')].filter(isCardCarousel);

const DOTS_CLASS = 'os-carousel-dots';
const MOBILE_QUERY = '(max-width: 900px)';

const syncDots = (row) => {
  let dots = row.nextElementSibling;
  const isOurs = dots && dots.classList?.contains(DOTS_CLASS);

  if (!isCardCarousel(row)) {
    if (isOurs) dots.remove();
    row.classList.remove('os-carousel-scrollable');
    return;
  }

  row.classList.add('os-carousel-scrollable');

  const count = Math.max(2, Math.min(row.children.length, 8));
  if (!isOurs) {
    dots = document.createElement('div');
    dots.className = DOTS_CLASS;
    dots.setAttribute('aria-hidden', 'true');
    row.after(dots);
  }
  if (dots.children.length !== count) {
    dots.textContent = '';
    for (let i = 0; i < count; i += 1) dots.appendChild(document.createElement('span'));
  }

  const cardWidth = row.scrollWidth / row.children.length;
  const active = Math.min(count - 1, Math.round(row.scrollLeft / Math.max(cardWidth, 1)));
  [...dots.children].forEach((dot, index) => dot.classList.toggle('is-active', index === active));
};

export default function useCarouselIndicators(dependency) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(MOBILE_QUERY);
    const listeners = new Map();

    const teardown = () => {
      listeners.forEach((handler, row) => row.removeEventListener('scroll', handler));
      listeners.clear();
      document.querySelectorAll(`.${DOTS_CLASS}`).forEach((el) => el.remove());
      document.querySelectorAll('.os-carousel-scrollable').forEach((el) => el.classList.remove('os-carousel-scrollable'));
    };

    const run = () => {
      if (!media.matches) { teardown(); return; }
      // Rows that no longer scroll drop their indicator on the next pass.
      listeners.forEach((handler, row) => {
        if (!document.contains(row)) {
          row.removeEventListener('scroll', handler);
          listeners.delete(row);
        }
      });

      findCarousels().forEach((row) => {
        syncDots(row);
        if (listeners.has(row)) return;
        const handler = () => syncDots(row);
        row.addEventListener('scroll', handler, { passive: true });
        listeners.set(row, handler);
      });
    };

    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(run);
    };

    // Cards arrive with data, so re-measure as the workspace changes. The
    // observer is paused around our own DOM writes.
    const observer = new MutationObserver(() => {
      observer.disconnect();
      schedule();
      window.setTimeout(() => {
        const workspace = document.querySelector('.workspace');
        if (workspace) observer.observe(workspace, { childList: true, subtree: true });
      }, 0);
    });

    schedule();
    const workspace = document.querySelector('.workspace');
    if (workspace) observer.observe(workspace, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    media.addEventListener?.('change', schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      media.removeEventListener?.('change', schedule);
      teardown();
    };
  }, [dependency]);
}
