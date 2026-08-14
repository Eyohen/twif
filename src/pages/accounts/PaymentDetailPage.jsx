import { useState } from 'react';
import { ArrowLeft, Banknote, Building2, CreditCard, Download, FileText, Maximize2, User, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { usePaymentEvidence } from '../../hooks/usePaymentEvidence';
import { money, amountReceived, invoicePayable, invoiceApprovalStatus, formatMoment } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const label = { fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 };
const value = { fontSize: 13, fontWeight: 600, color: '#1a1611' };

// The payments list is one row per invoice, so a row on its own says only how
// much was billed. This page is where the rest of it lives: what the customer
// ordered, which store took the money, and the evidence that it arrived.
export default function PaymentDetailPage({ invoice: initialInvoice, onBack, onRecorded }) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [invoice, setInvoice] = useState(initialInvoice);
  const [draft, setDraft] = useState('');
  const [payMethod, setPayMethod] = useState(initialInvoice.paymentMethod || 'Transfer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const payable = invoicePayable(invoice);
  const received = amountReceived(invoice);

  // Until this existed an invoice carried a status but no figure, so Accounts
  // had nothing to reconcile against and the screens invented one.
  const recordPayment = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await api.patch(`/oms/invoices/${invoice.invoiceNumber}/payment`, {
        amountReceived: Number(draft),
        method: payMethod,
      });
      const updated = response.data?.data?.invoice;
      if (updated) {
        setInvoice(updated);
        onRecorded?.(updated);
      }
      setDraft('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'That payment could not be recorded.');
    } finally {
      setSaving(false);
    }
  };
  const balance = received === null ? null : Math.max(0, payable - received);
  const asMoney = (amount) => (amount === null ? 'Not recorded' : money.format(amount));
  const evidence = invoice.paymentEvidence || null;
  // The image is fetched on opening rather than travelling with every invoice
  // in the list — see usePaymentEvidence.
  const { url: evidenceUrl } = usePaymentEvidence(invoice.invoiceNumber, Boolean(evidence));
  const method = invoice.paymentMethod || '—';
  const MethodIcon = method === 'Cash' ? Banknote : method === 'Card' ? CreditCard : Building2;
  const items = (invoice.items || []).map((line) => ({
    description: line.description || line.name || 'Item',
    quantity: Number(line.quantity || 1),
    amount: Number(line.amount ?? (Number(line.rate || 0) * Number(line.quantity || 1))),
  }));
  const note = invoice.itemNote || (Array.isArray(invoice.notes) ? invoice.notes[0] : invoice.notes) || '';

  return (
    <div className="os-page" style={{ maxWidth: 1100 }}>
      <div className="os-page-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '4px 0', color: '#8a7a6a', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} /> Back to Payments
          </button>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8a7a6a' }}>
            <span>Accounts</span><span>›</span><span>Payments</span><span>›</span>
            <strong style={{ color: '#1a1611' }}>{invoice.invoiceNumber}</strong>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: '#1a1611' }}>
              Payment for {invoice.invoiceNumber}
            </h2>
            <Status>{invoice.paymentStatus}</Status>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#8a7a6a' }}>
            {invoice.customer} · {invoice.store || 'Store'} · {formatMoment(invoice.invoiceDate || invoice.createdAt)}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }} className="payment-detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="os-card">
            <div className="os-card-head">
              <CreditCard size={16} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Payment</strong>
                <p>What the invoice is worth and what has come in</p>
              </div>
            </div>
            <div className="os-card-body">
              <div className="os-grid-2" style={{ gap: 12 }}>
                {[
                  ['Invoice Amount', money.format(payable)],
                  ['Amount Received', asMoney(received)],
                  ['Balance Outstanding', asMoney(balance)],
                  ['Payment Method', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MethodIcon size={13} />{method}</span>],
                  ['Payment Status', <Status>{invoice.paymentStatus}</Status>],
                  ['Accounts Decision', <Status>{invoiceApprovalStatus(invoice)}</Status>],
                ].map(([name, val]) => (
                  <div key={name}>
                    <div style={label}>{name}</div>
                    <div style={value}>{val}</div>
                  </div>
                ))}
              </div>
              {received === null ? (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#7a6030', background: '#fffbf0', border: '1px solid #f0ddb0', borderRadius: 8, padding: '10px 12px' }}>
                  No figure has been recorded for this invoice. Record what the customer paid below,
                  checking it against the evidence.
                </p>
              ) : null}

              {/* Recording a payment sets the status from the amount, so an
                  invoice cannot say part paid while showing nothing received. */}
              <form onSubmit={recordPayment} className="record-payment">
                <div>
                  <label className="os-field">
                    <span>Amount received</span>
                    <input
                      type="number"
                      min="0"
                      max={payable}
                      step="1"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={String(payable)}
                      required
                    />
                  </label>
                  <label className="os-field">
                    <span>Method</span>
                    <select value={payMethod} onChange={(event) => setPayMethod(event.target.value)}>
                      {['Transfer', 'Cash', 'Card', 'Check'].map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                </div>
                <button type="submit" disabled={saving || draft === ''}>
                  <Check size={14} /> {saving ? 'Recording…' : 'Record payment'}
                </button>
                {error ? <p className="record-payment-error">{error}</p> : null}
              </form>

              {invoice.paymentHistory?.length ? (
                <div className="payment-history">
                  <h4>Payments recorded</h4>
                  {invoice.paymentHistory.map((entry, index) => (
                    <div key={`${entry.recordedAt}-${index}`}>
                      <strong>{money.format(Number(entry.amount || 0))}</strong>
                      <span>{entry.method}{entry.note ? ` · ${entry.note}` : ''}</span>
                      <small>{entry.recordedBy} · {formatMoment(entry.recordedAt)}</small>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="os-card">
            <div className="os-card-head">
              <FileText size={16} style={{ color: '#c0a87a' }} />
              <div>
                <strong>What was ordered</strong>
                <p>{items.length ? `${items.length} line${items.length === 1 ? '' : 's'} on this invoice` : 'No lines recorded'}</p>
              </div>
            </div>
            <div className="os-card-body">
              {items.length ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Item', 'Qty', 'Amount'].map((col) => (
                        <th key={col} style={{ textAlign: col === 'Item' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0', borderBottom: '1px solid #f3ede5' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((line, index) => (
                      <tr key={`${line.description}-${index}`}>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f3ede5', color: '#1a1611' }}>{line.description}</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f3ede5', color: '#5a4e42', textAlign: 'right' }}>{line.quantity}</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f3ede5', fontWeight: 600, color: '#1a1611', textAlign: 'right' }}>{money.format(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#8a7a6a' }}>No item lines were saved with this invoice.</p>
              )}

              <div style={{ background: '#faf7f3', borderRadius: 8, padding: '12px 14px' }}>
                {[
                  ['Subtotal', money.format(Number(invoice.subtotal || invoice.total || 0)), false],
                  ...(Number(invoice.eliteDiscountAmount || 0) ? [['Elite Discount', `− ${money.format(Number(invoice.eliteDiscountAmount))}`, true]] : []),
                  ...(Number(invoice.storeCreditApplied || 0) ? [['Store Credit Used', `− ${money.format(Number(invoice.storeCreditApplied))}`, true]] : []),
                ].map(([name, val, isGreen]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee5da', fontSize: 13 }}>
                    <span style={{ color: '#5a4e42' }}>{name}</span>
                    <span style={{ fontWeight: 700, color: isGreen ? '#2a7d4f' : '#1a1611' }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 14 }}>
                  <span style={{ fontWeight: 700, color: '#1a1611' }}>Amount Payable</span>
                  <span style={{ fontWeight: 800, color: '#1a1611', fontSize: 16 }}>{money.format(payable)}</span>
                </div>
              </div>

              {note ? (
                <p style={{ margin: 0, fontSize: 13, color: '#5a4e42', lineHeight: 1.6, background: '#faf7f3', padding: '10px 12px', borderRadius: 8, border: '1px solid #eee5da' }}>
                  {note}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="os-sidebar">
          <div className="os-card">
            <div className="os-card-head">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: evidence ? '#2a7d4f' : '#c07a1e', flexShrink: 0 }} />
              <div>
                <strong>Payment Evidence</strong>
                <p style={{ color: evidence ? '#2a7d4f' : '#c07a1e' }}>{evidence ? 'Uploaded by the Store Manager' : 'Nothing uploaded'}</p>
              </div>
            </div>
            <div className="os-card-body">
              {evidence ? (
                <>
                  <dl className="review-evidence-meta">
                    <div><dt>File</dt><dd>{evidence.name || 'Attachment'}</dd></div>
                    {evidence.uploadedAt ? <div><dt>Uploaded</dt><dd>{formatMoment(evidence.uploadedAt)}</dd></div> : null}
                  </dl>
                  {evidenceUrl ? (
                    <>
                      <button
                        type="button"
                        className="review-evidence-frame"
                        onClick={() => setEvidenceOpen(true)}
                        aria-label="Open payment evidence full size"
                      >
                        <img src={evidenceUrl} alt={`Payment evidence for ${invoice.invoiceNumber}`} />
                        <span className="review-evidence-zoom"><Maximize2 size={13} /></span>
                      </button>
                      <a className="review-evidence-download" href={evidenceUrl} download={evidence.name || `${invoice.invoiceNumber}-payment-evidence`}>
                        <Download size={14} /> Download evidence
                      </a>
                    </>
                  ) : (
                    <p className="review-evidence-empty">The attachment could not be previewed.</p>
                  )}
                </>
              ) : (
                <p className="review-evidence-empty">No proof of payment was attached to this invoice.</p>
              )}
            </div>
          </div>

          <div className="os-summary-card">
            <header>
              <User size={15} />
              <h3>Customer &amp; Invoice</h3>
            </header>
            <dl>
              <dt>Customer</dt><dd>{invoice.customer || '—'}</dd>
              <dt>Phone</dt><dd>{invoice.phone || '—'}</dd>
              <dt>Email</dt><dd>{invoice.email || '—'}</dd>
              <dt>Store</dt><dd>{invoice.store || '—'}</dd>
              <dt>Raised By</dt><dd>{invoice.createdBy || '—'}</dd>
              <dt>Invoice Date</dt><dd>{formatMoment(invoice.invoiceDate || invoice.createdAt)}</dd>
              <dt>Due Date</dt><dd>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</dd>
              <dt>Order Status</dt><dd>{invoice.orderStatus || '—'}</dd>
            </dl>
          </div>
        </aside>
      </div>

      {evidenceOpen && evidenceUrl ? (
        <div
          className="review-evidence-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Payment evidence"
          onClick={() => setEvidenceOpen(false)}
        >
          <button type="button" className="review-evidence-close" onClick={() => setEvidenceOpen(false)} aria-label="Close">×</button>
          <img src={evidenceUrl} alt={`Payment evidence for ${invoice.invoiceNumber}`} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}

      <style>{`
        @media (max-width: 860px) {
          .payment-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
