import { useState } from 'react';
import { ArrowLeft, CheckCircle, Flag, XCircle, HelpCircle, Download, Maximize2, User, FileText, CreditCard, Clock, AlertCircle } from 'lucide-react';
import { money, invoiceApprovalStatus, amountReceived, invoicePayable, isFullyPaid, isAwaitingPayment, formatMoment } from '../../utils/oms';
import { usePaymentEvidence } from '../../hooks/usePaymentEvidence';
import { Status } from '../../components/oms/Common';
import InvoiceActionConfirmModal from '../../components/oms/InvoiceActionConfirmModal';

export default function ReviewInvoicePage({ invoice, onBack, onReview }) {
  const [pendingAction, setPendingAction] = useState(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  // Everything below reads from the invoice. It previously applied a flat 5%
  // discount to every invoice, invented a ₦25,000 part-payment, and listed
  // three fixed garments — so Accounts were reviewing figures that had no
  // relationship to the invoice in front of them.
  const total = Number(invoice.total || 0);
  const discount = Number(invoice.eliteDiscountAmount || 0);
  const credit = Number(invoice.storeCreditApplied || 0);
  const payable = invoicePayable(invoice);
  // A part payment's amount is never recorded anywhere, so it is shown as
  // unrecorded rather than guessed at.
  const paid = amountReceived(invoice);
  const balance = paid === null ? null : Math.max(0, payable - paid);
  const asMoney = (value) => (value === null ? 'Not recorded' : money.format(value));
  const submittedOn = formatMoment(invoice.createdAt);
  const daysSince = invoice.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(invoice.createdAt).getTime()) / 86400000))
    : null;
  const status = invoiceApprovalStatus(invoice) === 'Pending Accounts' ? 'Awaiting Review' : invoiceApprovalStatus(invoice);
  // Once an invoice is both Approved and fully paid, the decision is final —
  // re-flagging or rejecting a settled invoice after the fact isn't a real
  // workflow, it was just an oversight that every action button stayed live.
  const locked = status === 'Approved' && isFullyPaid(invoice);
  // An unpaid invoice hasn't been settled, so there is nothing here for
  // Accounts to approve, reject, or flag yet — it exists only as a record
  // until a payment comes in.
  const unpaidRecordOnly = !locked && isAwaitingPayment(invoice);
  const evidence = invoice.paymentEvidence || null;
  // The image is fetched on opening rather than travelling with every invoice
  // in the list — see usePaymentEvidence.
  const { url: evidenceUrl } = usePaymentEvidence(invoice.invoiceNumber, Boolean(evidence));
  const storeNote = invoice.itemNote || (Array.isArray(invoice.notes) ? invoice.notes[0] : invoice.notes) || '';
  const items = (invoice.items?.length ? invoice.items : []).map((line) => ([
    line.description || line.name || 'Item',
    Number(line.quantity || 1),
    Number(line.amount ?? (Number(line.rate || 0) * Number(line.quantity || 1))),
  ]));

  return (
    <div className="os-page" style={{ maxWidth: 1200 }}>
      {/* Page Header */}
      <div className="os-page-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={onBack}
            type="button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '4px 0', color: '#8a7a6a', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} />
            Back to Invoices
          </button>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8a7a6a' }}>
            <span>Accounts</span>
            <span>›</span>
            <span>Invoices</span>
            <span>›</span>
            <strong style={{ color: '#1a1611' }}>Review Invoice</strong>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: '#1a1611' }}>
              Review Invoice {invoice.invoiceNumber}
            </h2>
            <Status>{status}</Status>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#8a7a6a' }}>Review payment evidence and invoice details before approving.</p>
        </div>
      </div>

      {/* Action Bar */}
      {locked ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0faf4', border: '1px solid #b8e4cb', borderRadius: 8, color: '#2a7d4f', fontSize: 13, fontWeight: 700 }}>
          <CheckCircle size={15} /> Approved &amp; fully paid — this decision is final
        </div>
      ) : unpaidRecordOnly ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f5f0e8', border: '1px solid #ddd5c8', borderRadius: 8, color: '#5a4e42', fontSize: 13, fontWeight: 700 }}>
          <AlertCircle size={15} /> Unpaid — this invoice is a record only, no action is available until payment is received
        </div>
      ) : (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setPendingAction('Approved')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#f0faf4', border: '1px solid #b8e4cb', borderRadius: 8, color: '#2a7d4f', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <CheckCircle size={15} /> Approve
        </button>
        <button
          type="button"
          onClick={() => setPendingAction('Flagged')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#fffbf0', border: '1px solid #f0ddb0', borderRadius: 8, color: '#7a6030', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Flag size={15} /> Flag
        </button>
        <button
          type="button"
          onClick={() => setPendingAction('Rejected')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#fff5f0', border: '1px solid #f0c8b8', borderRadius: 8, color: '#8a3520', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <XCircle size={15} /> Reject
        </button>
        <button
          type="button"
          onClick={() => setPendingAction('Partial')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#f5f0e8', border: '1px solid #ddd5c8', borderRadius: 8, color: '#5a4e42', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <HelpCircle size={15} /> Request Clarification
        </button>
      </div>
      )}

      {/* A `1fr` column will not shrink below its own content, so the order
          summary table pushed the first column to 818px, squeezed the evidence
          column to 135px — a strip of one-letter-per-line text — and pushed the
          actions off the right edge. minmax(0, 1fr) lets them share the room. */}
      <div className="review-invoice-grid">

        {/* Column 1: Invoice & Order Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="os-card">
            <div className="os-card-head">
              <FileText size={16} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Invoice &amp; Order Summary</strong>
                <p>Invoice details and customer info</p>
              </div>
            </div>
            <div className="os-card-body">
              {/* Invoice facts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Invoice Number', invoice.invoiceNumber],
                  ['Invoice Date', formatMoment(invoice.invoiceDate || invoice.createdAt)],
                  ['Store', invoice.store || 'Lekki'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611' }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Divider */}
              <div style={{ borderTop: '1px solid #f3ede5' }} />
              {/* Customer facts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3ede5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={18} style={{ color: '#8a7a6a' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1a1611', fontSize: 14 }}>{invoice.customer}</div>
                  {discount ? <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: '#c97b08', background: '#fff8ee', padding: '1px 5px', borderRadius: 4, border: '1px solid #f0ddb0' }}>ELITE CUSTOMER</span> : null}
                </div>
              </div>
              <div className="os-grid-2" style={{ gap: 10 }}>
                {[
                  ['Phone', invoice.phone || '—'],
                  ['Email', invoice.email || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#1a1611' }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Divider */}
              <div style={{ borderTop: '1px solid #f3ede5' }} />
              {/* Order summary table */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e42', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Order Summary</div>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 320 }}>
                  <thead>
                    <tr>
                      {['Item', 'Qty', 'Unit Price', 'Total'].map((col) => (
                        <th key={col} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0', borderBottom: '1px solid #f3ede5' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(([name, quantity, price]) => (
                      <tr key={name}>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f3ede5', color: '#1a1611' }}>{name}</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{quantity}</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{money.format(price)}</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f3ede5', fontWeight: 600, color: '#1a1611' }}>{money.format(price * quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              {/* Totals */}
              <div style={{ background: '#faf7f3', borderRadius: 8, padding: '12px 14px' }}>
                {[
                  ['Subtotal', money.format(Number(invoice.subtotal || total)), false],
                  // Discount and credit lines only appear when they apply.
                  ...(discount ? [['Elite Discount', `− ${money.format(discount)}`, true]] : []),
                  ...(credit ? [['Store Credit Used', `− ${money.format(credit)}`, true]] : []),
                  ['Total Amount', money.format(payable), false],
                ].map(([label, val, isGreen]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #eee5da', fontSize: 13 }}>
                    <span style={{ color: '#5a4e42' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: isGreen ? '#2a7d4f' : '#1a1611' }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', fontSize: 14 }}>
                  <span style={{ fontWeight: 700, color: '#1a1611' }}>Amount Payable</span>
                  <span style={{ fontWeight: 800, color: '#1a1611', fontSize: 16 }}>{money.format(payable)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="os-card">
            <div className="os-card-head">
              <CreditCard size={16} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Payment &amp; History</strong>
                <p>Payment status and timeline</p>
              </div>
            </div>
            <div className="os-card-body">
              <div className="os-grid-2" style={{ gap: 10 }}>
                {[
                  ['Payment Status', <Status>{invoice.paymentStatus}</Status>],
                  ['Amount Received', <span style={{ fontWeight: 700, color: paid === null ? '#8a7a6a' : '#2a7d4f' }}>{asMoney(paid)}</span>],
                  ['Balance Outstanding', <span style={{ fontWeight: 700, color: balance === null ? '#8a7a6a' : '#8a3520' }}>{asMoney(balance)}</span>],
                  ['Payment Method', invoice.paymentMethod || '—'],
                  ['Submitted By', invoice.createdBy ? `${invoice.createdBy} (Store Manager)` : '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#1a1611' }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #f3ede5' }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e42', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Payment History</div>
              {[
                [submittedOn, evidence ? 'Payment evidence submitted' : 'Invoice submitted', invoice.createdBy ? `by ${invoice.createdBy} (Store Manager)` : 'Store', asMoney(paid), '#2a7d4f'],
                ['—', 'Pending', 'Balance outstanding', asMoney(balance), '#8a3520'],
              ].map(([date, title, note, amount, color]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3ede5' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{date}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611', marginTop: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#5a4e42' }}>{note}</div>
                  </div>
                  <div style={{ fontWeight: 700, color, fontSize: 13 }}>{amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Payment Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* This panel used to render an invented GTBank transfer receipt —
              fixed reference number, account numbers and a "Successful" badge —
              regardless of what the Store Manager had actually attached, or
              whether they had attached anything at all. Accounts would have
              been confirming payments against a picture of nothing. */}
          <div className="os-card">
            <div className="os-card-head">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: evidence ? '#2a7d4f' : '#c07a1e', flexShrink: 0 }} />
              <div>
                <strong>Payment Evidence</strong>
                <p style={{ color: evidence ? '#2a7d4f' : '#c07a1e' }}>
                  {evidence ? 'Uploaded by the Store Manager' : 'Nothing uploaded'}
                </p>
              </div>
            </div>
            <div className="os-card-body">
              {evidence ? (
                <>
                  <dl className="review-evidence-meta">
                    <div><dt>File</dt><dd>{evidence.name || 'Attachment'}</dd></div>
                    {evidence.uploadedAt ? (
                      <div><dt>Uploaded</dt><dd>{formatMoment(evidence.uploadedAt)}</dd></div>
                    ) : null}
                    <div><dt>Amount recorded</dt><dd>{asMoney(paid)}</dd></div>
                  </dl>

                  {evidenceUrl ? (
                    <button
                      type="button"
                      className="review-evidence-frame"
                      onClick={() => setEvidenceOpen(true)}
                      aria-label="Open payment evidence full size"
                    >
                      <img src={evidenceUrl} alt={`Payment evidence for ${invoice.invoiceNumber}`} />
                      <span className="review-evidence-zoom"><Maximize2 size={13} /></span>
                    </button>
                  ) : (
                    <p className="review-evidence-empty">The attachment could not be previewed.</p>
                  )}

                  {evidenceUrl ? (
                    <a
                      className="review-evidence-download"
                      href={evidenceUrl}
                      download={evidence.name || `${invoice.invoiceNumber}-payment-evidence`}
                    >
                      <Download size={14} /> Download evidence
                    </a>
                  ) : null}
                </>
              ) : (
                <p className="review-evidence-empty">
                  No proof of payment was attached to this invoice. Flag it back to the Store Manager
                  if evidence is required before you confirm.
                </p>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="os-card">
            <div className="os-card-head">
              <FileText size={15} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Additional Notes</strong>
                <p>From Store Manager</p>
              </div>
            </div>
            <div className="os-card-body">
              <p style={{ margin: 0, fontSize: 13, color: storeNote ? '#5a4e42' : '#8a7a6a', lineHeight: 1.6, background: '#faf7f3', padding: '10px 12px', borderRadius: 8, border: '1px solid #eee5da' }}>
                {storeNote || 'No note was left with this invoice.'}
              </p>
            </div>
          </div>
        </div>

        {/* Column 3: Sidebar */}
        <aside className="os-sidebar">
          {/* Review Actions */}
          <div className="os-card">
            <div className="os-card-head">
              <div>
                <strong>Review Actions</strong>
                <p>{locked ? 'This decision is final' : unpaidRecordOnly ? 'No action available' : 'Choose a decision below'}</p>
              </div>
            </div>
            {locked ? (
              <div className="os-card-body" style={{ padding: '12px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#8a7a6a', lineHeight: 1.5 }}>
                  Approved and fully paid invoices can no longer be flagged, rejected, or re-approved from here.
                </p>
              </div>
            ) : unpaidRecordOnly ? (
              <div className="os-card-body" style={{ padding: '12px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#8a7a6a', lineHeight: 1.5 }}>
                  This invoice is Unpaid, so there is nothing to approve, reject, or flag yet. It sits here as a
                  record until a payment is recorded against it.
                </p>
              </div>
            ) : (
            <div className="os-card-body" style={{ gap: 8, padding: '12px' }}>
              {[
                [<CheckCircle size={15} />, 'Approve Invoice', 'Mark as paid and release to production', 'Approved', '#2a7d4f', '#f0faf4', '#b8e4cb'],
                [<Flag size={15} />, 'Partial Payment', 'Record partial payment', 'Partial', '#7a6030', '#fffbf0', '#f0ddb0'],
                [<XCircle size={15} />, 'Reject Invoice', 'Reject and send back to store', 'Rejected', '#8a3520', '#fff5f0', '#f0c8b8'],
                [<HelpCircle size={15} />, 'Flag for Clarification', 'Request more info from store', 'Flagged', '#5a4e42', '#f5f0e8', '#ddd5c8'],
              ].map(([icon, title, detail, action, color, bg, border]) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setPendingAction(action)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit', transition: 'opacity 0.15s', color }}
                >
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  <span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{title}</span>
                    <span style={{ display: 'block', fontSize: 11, marginTop: 2, opacity: 0.8 }}>{detail}</span>
                  </span>
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Review Information */}
          <div className="os-summary-card">
            <header>
              <AlertCircle size={15} />
              <h3>Review Information</h3>
            </header>
            <dl>
              <dt>Submitted By</dt>
              <dd>{invoice.createdBy ? `${invoice.createdBy} (Store Mgr)` : '—'}</dd>
              <dt>Submitted On</dt>
              <dd>{submittedOn}</dd>
              <dt>Store</dt>
              <dd>{invoice.store || '—'}</dd>
              <dt>Order Sheet</dt>
              <dd style={{ color: invoice.orderSheet ? '#2a7d4f' : '#8a7a6a' }}>{invoice.orderSheet ? 'Attached' : 'Not attached'}</dd>
              <dt>Production Status</dt>
              <dd style={{ color: invoice.orderStatus === 'Approved' ? '#2a7d4f' : '#8a3520' }}>{invoice.orderStatus || 'Not released'}</dd>
              <dt>Days Since Submitted</dt>
              <dd>{daysSince === null ? '—' : `${daysSince} day${daysSince === 1 ? '' : 's'}`}</dd>
            </dl>
          </div>

          {/* Activity Log */}
          <div className="os-card">
            <div className="os-card-head">
              <Clock size={15} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Activity Log</strong>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 0, padding: '14px' }}>
              {[
                [submittedOn, 'Invoice submitted', invoice.createdBy ? `by ${invoice.createdBy} (Store Manager)` : `${invoice.store || 'Store'} store`, '#2a7d4f'],
                // The last two steps describe where the invoice actually stands
                // rather than always reading as though nobody had looked at it.
                ['—', status === 'Awaiting Review' ? 'Under review' : `Marked ${status}`, status === 'Awaiting Review' ? 'Pending your action' : 'Decision recorded', status === 'Awaiting Review' ? '#c97b08' : '#2a7d4f'],
                ['—', status === 'Approved' ? 'Released to production' : 'Awaiting approval', status === 'Approved' ? 'Order sheet can be raised' : 'Will be sent to production', '#8a7a6a'],
              ].map(([date, title, note, color], index) => (
                <div key={title} style={{ display: 'flex', gap: 10, paddingBottom: index < 2 ? 14 : 0, position: 'relative' }}>
                  {index < 2 && (
                    <div style={{ position: 'absolute', left: 5, top: 16, width: 1, height: 'calc(100% - 8px)', background: '#f3ede5' }} />
                  )}
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, marginTop: 3, flexShrink: 0, position: 'relative', zIndex: 1 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{date}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611', marginTop: 2 }}>{title}</div>
                    <div style={{ fontSize: 11, color: '#5a4e42', marginTop: 1 }}>{note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Note */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: '#fffbf0', border: '1px solid #f0ddb0', borderRadius: 10, color: '#7a6030' }}>
        <AlertCircle size={14} style={{ color: '#c97b08', flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
          {locked
            ? 'This invoice is Approved and fully paid. That decision is final and can no longer be changed from here.'
            : unpaidRecordOnly
            ? 'This invoice is Unpaid and kept here for records only. It has no review decision to make until a payment comes in.'
            : status === 'Awaiting Review'
            ? 'This invoice is currently awaiting your review. Once approved, it will be automatically sent to Production.'
            : `This invoice has been marked ${status}. Choosing another action below will replace that decision.`}
        </p>
      </div>

      {pendingAction && (
        <InvoiceActionConfirmModal
          invoice={invoice}
          status={pendingAction}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            if (pendingAction !== 'Partial') onReview(invoice, pendingAction);
            setPendingAction(null);
          }}
        />
      )}

      {/* Proof of payment at full size — a thumbnail is not enough to check a
          teller slip against an amount. */}
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


    </div>
  );
}
