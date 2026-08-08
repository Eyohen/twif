import { useEffect } from 'react';

// Below 900px the stylesheet stacks table rows into cards and prints each
// cell's `data-label` above its value. Most tables in the app never set that
// attribute, so on a phone they collapsed into a column of anonymous
// right-aligned values — a date with no idea what it was the date of.
//
// Rather than hand-annotate every table, the label is copied from the column
// header the cell actually sits under. That keeps the two in step and covers
// tables added later without anyone having to remember.
const MOBILE_QUERY = '(max-width: 900px)';

const labelTable = (table) => {
  const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
  if (!headers.some(Boolean)) return;

  table.querySelectorAll('tbody tr').forEach((row) => {
    [...row.children].forEach((cell, index) => {
      if (cell.tagName !== 'TD') return;
      // An author-supplied label always wins.
      if (cell.dataset.label !== undefined) return;
      const header = headers[index];
      if (header) cell.dataset.label = header;
    });
  });
};

export default function useLabelledTables(dependency) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(MOBILE_QUERY);

    const run = () => {
      if (!media.matches) return;
      document.querySelectorAll('.workspace table').forEach(labelTable);
    };

    // Rows arrive asynchronously, so re-run as the workspace changes. The
    // observer is disconnected around our own writes; setting data-label
    // mutates attributes and would otherwise retrigger it.
    let frame = 0;
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        observer.disconnect();
        run();
        const workspace = document.querySelector('.workspace');
        if (workspace) observer.observe(workspace, { childList: true, subtree: true });
      });
    });

    run();
    const workspace = document.querySelector('.workspace');
    if (workspace) observer.observe(workspace, { childList: true, subtree: true });
    media.addEventListener?.('change', run);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener?.('change', run);
    };
  }, [dependency]);
}
