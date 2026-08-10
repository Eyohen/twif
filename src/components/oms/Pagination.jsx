// Three lists carried a paginator drawn from a fixed array — ‹ 1 2 3 › — that
// changed nothing when clicked, while the list itself only ever showed the
// first ten rows. Anything past row ten could not be reached at all.

const pageNumbers = (page, pageCount) => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  // A long list keeps the ends and a window around wherever the reader is,
  // rather than printing every page number across the footer.
  const window = new Set([1, pageCount, page, page - 1, page + 1]);
  const pages = [...window].filter((number) => number >= 1 && number <= pageCount).sort((a, b) => a - b);
  return pages.reduce((out, number, index) => {
    if (index && number - pages[index - 1] > 1) out.push('…');
    out.push(number);
    return out;
  }, []);
};

const buttonStyle = (active, disabled) => ({
  minWidth: 30, padding: '6px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
  fontSize: 13, fontWeight: active ? 700 : 400, fontFamily: 'inherit',
  background: active ? '#1a1611' : '#fff',
  color: active ? '#fff' : disabled ? '#c4bab0' : '#5a4e42',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export default function Pagination({ page, pageSize, total, onPage, noun = 'rows' }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? ((page - 1) * pageSize) + 1 : 0;
  const last = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 13, color: '#8a7a6a' }}>
        Showing {first}–{last} of {total} {noun}
      </span>
      {pageCount > 1 ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" aria-label="Previous page" onClick={() => onPage(page - 1)} disabled={page <= 1} style={buttonStyle(false, page <= 1)}>‹</button>
          {pageNumbers(page, pageCount).map((entry, index) => (entry === '…' ? (
            <span key={`gap-${index}`} style={{ padding: '6px 4px', fontSize: 13, color: '#b0a090' }}>…</span>
          ) : (
            <button
              type="button"
              key={entry}
              onClick={() => onPage(entry)}
              aria-current={entry === page ? 'page' : undefined}
              style={buttonStyle(entry === page, false)}
            >{entry}</button>
          )))}
          <button type="button" aria-label="Next page" onClick={() => onPage(page + 1)} disabled={page >= pageCount} style={buttonStyle(false, page >= pageCount)}>›</button>
        </div>
      ) : null}
    </div>
  );
}
