import { useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { usePaymentEvidence } from '../../hooks/usePaymentEvidence';
import { formatMoment } from '../../utils/oms';

// A payment can now carry more than one proof image (a bank alert and a
// counter receipt, or one photo per instalment), so this renders a small
// thumbnail grid with a lightbox instead of the single frame it used to be —
// shared between the Payments detail screen and the Accounts review screen
// rather than kept twice.
export default function PaymentEvidenceGallery({ invoiceNumber, evidence, emptyMessage }) {
  const [openIndex, setOpenIndex] = useState(null);
  const list = Array.isArray(evidence) ? evidence : [];
  const { urls, failed } = usePaymentEvidence(invoiceNumber, list.length);

  if (!list.length) {
    return <p className="review-evidence-empty">{emptyMessage}</p>;
  }

  return (
    <>
      <dl className="review-evidence-meta">
        <div><dt>{list.length === 1 ? 'File' : 'Files'}</dt><dd>{list.length}</dd></div>
        {list[list.length - 1]?.uploadedAt ? (
          <div><dt>Last uploaded</dt><dd>{formatMoment(list[list.length - 1].uploadedAt)}</dd></div>
        ) : null}
      </dl>

      {urls.length ? (
        <div className="review-evidence-grid">
          {urls.map((url, index) => (
            <button
              type="button"
              key={url}
              className="review-evidence-frame"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open payment evidence ${index + 1} full size`}
            >
              <img src={url} alt={`Payment evidence ${index + 1} for ${invoiceNumber}`} />
              <span className="review-evidence-zoom"><Maximize2 size={13} /></span>
            </button>
          ))}
        </div>
      ) : (
        <p className="review-evidence-empty">{failed ? 'The attachment could not be previewed.' : 'Loading evidence…'}</p>
      )}

      {openIndex !== null && urls[openIndex] ? (
        <div
          className="review-evidence-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Payment evidence"
          onClick={() => setOpenIndex(null)}
        >
          <button type="button" className="review-evidence-close" onClick={() => setOpenIndex(null)} aria-label="Close">×</button>
          <div className="review-evidence-lightbox-body" onClick={(event) => event.stopPropagation()}>
            <img src={urls[openIndex]} alt={`Payment evidence ${openIndex + 1} for ${invoiceNumber}`} />
            <a
              className="review-evidence-download"
              href={urls[openIndex]}
              download={list[openIndex]?.name || `${invoiceNumber}-payment-evidence-${openIndex}`}
            >
              <Download size={14} /> Download
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
