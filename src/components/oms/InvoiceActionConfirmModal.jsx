import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const actionDetails = {
  Approved: {
    tone: 'approve',
    icon: '✓',
    title: 'Approve Invoice?',
    confirmLabel: 'Yes, Approve Invoice',
    description: (invoice) => `Are you sure you want to approve ${invoice.invoiceNumber} for ${invoice.customer}? The invoice will be released to Production.`,
  },
  ApprovedComplete: {
    tone: 'approve',
    icon: '✓',
    title: 'Approve Completed Payment?',
    confirmLabel: 'Yes, Approve Completed Payment',
    description: (invoice) => `Confirm that ${invoice.invoiceNumber} for ${invoice.customer} has been paid in full? It will be released to Production.`,
  },
  ApprovedPartial: {
    tone: 'partial',
    icon: '◔',
    title: 'Approve Partial Payment?',
    confirmLabel: 'Yes, Approve Partial Payment',
    description: (invoice) => `Approve the part payment received for ${invoice.invoiceNumber} for ${invoice.customer}? It will be released to Production and the outstanding balance will remain on the invoice.`,
  },
  Rejected: {
    tone: 'reject',
    icon: '×',
    title: 'Reject Invoice?',
    confirmLabel: 'Yes, Reject Invoice',
    description: (invoice) => `Are you sure you want to reject ${invoice.invoiceNumber} for ${invoice.customer}? It will be returned to the Store Manager and will not be released to Production.`,
  },
  Flagged: {
    tone: 'flag',
    icon: '⚑',
    title: 'Flag Invoice?',
    confirmLabel: 'Yes, Flag Invoice',
    description: (invoice) => `Are you sure you want to flag ${invoice.invoiceNumber} for ${invoice.customer}? The Store Manager will be asked to provide clarification.`,
  },
  Partial: {
    tone: 'partial',
    icon: '◔',
    title: 'Record Partial Payment?',
    confirmLabel: 'Yes, Record Partial Payment',
    description: (invoice) => `Are you sure you want to confirm a partial payment for ${invoice.invoiceNumber} for ${invoice.customer}? The outstanding balance will remain on the invoice.`,
  },
};

export default function InvoiceActionConfirmModal({ invoice, status, onCancel, onConfirm }) {
  const details = actionDetails[status];
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onCancel();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  if (!invoice || !details || typeof document === 'undefined') return null;

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onConfirm(note.trim());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'That action could not be saved. Please try again.');
      setSubmitting(false);
    }
  };

  return createPortal(<div className="invoice-action-confirm-backdrop" role="presentation" onMouseDown={onCancel}>
    <section
      className={`invoice-action-confirm-modal ${details.tone}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-action-confirm-title"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button className="invoice-action-confirm-close" type="button" onClick={onCancel} aria-label="Close confirmation">×</button>
      <i className="invoice-action-confirm-icon" aria-hidden="true">{details.icon}</i>
      <h3 id="invoice-action-confirm-title">{details.title}</h3>
      <p>{details.description(invoice)}</p>
      <dl>
        <dt>Invoice</dt><dd>{invoice.invoiceNumber}</dd>
        <dt>Customer</dt><dd>{invoice.customer}</dd>
      </dl>
      {status === 'Flagged' ? (
        <label style={{ display: 'grid', gap: 6, textAlign: 'left', marginTop: 12, fontSize: 12, fontWeight: 700, color: '#5a4e42' }}>
          What needs clarification? <span style={{ fontWeight: 400 }}>(optional)</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={2000} placeholder="Tell the Store Manager exactly what Accounts needs checked or explained…" style={{ resize: 'vertical', padding: 10, border: '1px solid #ddd5c8', borderRadius: 8, font: 'inherit' }} />
        </label>
      ) : null}
      {error ? <p style={{ color: '#8a3520', background: '#fff5f0', border: '1px solid #f0c8b8', borderRadius: 8, padding: '8px 10px', marginTop: 10 }}>{error}</p> : null}
      <footer>
        <button type="button" className="invoice-action-cancel" disabled={submitting} onClick={onCancel}>Cancel</button>
        <button type="button" className="invoice-action-submit" disabled={submitting} onClick={submit}>
          {submitting ? (status === 'Flagged' ? 'Flagging…' : 'Saving…') : details.confirmLabel}
        </button>
      </footer>
    </section>
  </div>, document.body);
}
