import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

// The pictures a Store Manager attached to a clarification, shown to Accounts.
// Fetched when the invoice is opened (they never travel with the list) and
// opened full size in place.
export default function ClarificationImages({ invoiceNumber, count = 0, paymentId, label = 'Attached images' }) {
  const [urls, setUrls] = useState([]);
  const [failed, setFailed] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    if (!invoiceNumber || !count) { setUrls([]); return undefined; }
    let cancelled = false;
    let created = [];
    setFailed(false);
    const base = `/oms/invoices/${encodeURIComponent(invoiceNumber)}${paymentId ? `/payments/${encodeURIComponent(paymentId)}` : ''}/clarification-images`;
    Promise.all(Array.from({ length: count }, (_, index) => (
      api.get(`${base}/${index}`, { responseType: 'blob' }).then((response) => URL.createObjectURL(response.data)).catch(() => null)
    ))).then((results) => {
      if (cancelled) { results.filter(Boolean).forEach((url) => URL.revokeObjectURL(url)); return; }
      created = results.filter(Boolean);
      setUrls(created);
      if (!created.length) setFailed(true);
    });
    return () => { cancelled = true; created.forEach((url) => URL.revokeObjectURL(url)); };
  }, [invoiceNumber, count, paymentId]);

  if (!count) return null;
  return (
    <div className="clarification-images-view" style={{ marginTop: 8 }}>
      <small style={{ display: 'block', color: '#568069', marginBottom: 4 }}>{label} ({count})</small>
      {urls.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {urls.map((url, index) => (
            <button key={url} type="button" onClick={() => setOpenIndex(index)} aria-label={`Open clarification image ${index + 1} full size`}
              style={{ padding: 0, border: '1px solid #b8e4cb', borderRadius: 6, background: '#fff', cursor: 'pointer', overflow: 'hidden' }}>
              <img src={url} alt={`Clarification image ${index + 1} for ${invoiceNumber}`} style={{ width: 72, height: 72, objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      ) : (
        <small style={{ color: '#8a7a6a' }}>{failed ? 'The images could not be loaded.' : 'Loading images…'}</small>
      )}
      {openIndex !== null && urls[openIndex] ? (
        <div role="dialog" aria-modal="true" aria-label="Clarification image" onClick={() => setOpenIndex(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,17,0.75)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
            <img src={urls[openIndex]} alt={`Clarification image ${openIndex + 1}`} style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8 }} />
            <button type="button" onClick={() => setOpenIndex(null)} style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
