import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, CheckCircle, Package, CreditCard, Ruler, FileText, Clock, User, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { money, formatMoment, amountReceived, invoicePayable, invoiceDocumentPayload, downloadInvoicePdf, daysUntilDue, dueDateLabel } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const label = { fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' };
const outlineButton = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13,
  fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer', fontFamily: 'inherit',
};

export default function OrderDetailsPage({ order, onBack }) {
  const [notice, setNotice] = useState('');
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const job = order.orderSheet || order.job || {};
  const status = order.approval === 'Pending Accounts'
    ? 'Pending Accounts'
    : job.status === 'Ready' ? 'Ready for Collection' : job.status || order.orderStatus || 'Awaiting Production';

  const payable = invoicePayable(order);
  // A part payment's amount is not recorded anywhere in the system.
  const paid = amountReceived(order);
  const balance = paid === null ? null : Math.max(0, payable - paid);
  const asMoney = (value) => (value === null ? 'Not recorded' : money.format(value));

  const custInitials = (order.customer || '')
    .split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  // The invoice's own lines. This panel used to list a Navy Senator, Grey
  // Trousers and a White Shirt on every order, priced at fixed percentages of
  // the total.
  const items = (order.items || []).map((line) => ({
    description: line.description || line.name || 'Item',
    quantity: Number(line.quantity || 1),
    amount: Number(line.amount ?? (Number(line.rate || 0) * Number(line.quantity || 1))),
    note: line.note || '',
  }));

  const deliveryDate = job.delivery || order.deliveryDate || order.dueDate;
  const days = daysUntilDue(deliveryDate);
  const orderNote = job.productionNote || order.itemNote
    || (Array.isArray(order.notes) ? order.notes[0] : order.notes) || '';

  // Measurements as figures, taken from the order sheet. A fixed 42in chest and
  // 34in waist used to be printed on every order, which is a set of numbers a
  // tailor could cut against.
  const measurements = job.measurementDetails && typeof job.measurementDetails === 'object'
    ? Object.entries(job.measurementDetails).filter(([, value]) => String(value ?? '').trim())
    : [];
  const measurementNote = !measurements.length && job.measurements ? String(job.measurements) : '';

  // Only steps the record can actually attest to.
  const approved = order.approval === 'Approved';
  const inProduction = ['Assigned', 'In Progress'].includes(job.status);
  const ready = ['Ready', 'Ready for Collection', 'Completed'].includes(job.status);
  const steps = [
    ['Invoice Sent', order.createdBy ? `Raised by ${order.createdBy}` : `${order.store || 'Store'} store`, formatMoment(order.createdAt), 'done'],
    ['Accounts Review', approved ? 'Approved by Accounts' : 'Waiting for Accounts', approved ? '—' : '', approved ? 'done' : 'current'],
    ['In Production', inProduction ? `With ${job.tailor || 'a tailor'}` : 'Not started', '', inProduction ? 'current' : ready ? 'done' : 'pending'],
    ['Ready for Collection', ready ? 'Ready for the customer' : 'Awaiting production', '', ready ? 'done' : 'pending'],
  ];

  const printInvoice = async () => {
    setNotice('');
    try {
      const response = await api.post('/oms/invoices/html-preview', invoiceDocumentPayload(order), { responseType: 'text' });
      await downloadInvoicePdf(response.data, order.invoiceNumber);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to produce this invoice right now.');
    }
  };

  const facts = [
    { key: 'Invoice No.', value: order.invoiceNumber },
    { key: 'Delivery Date', value: deliveryDate ? formatMoment(deliveryDate) : 'Not set', sub: dueDateLabel(deliveryDate), subColor: days !== null && days < 0 ? '#8a3520' : '#8a7a6a' },
    { key: 'Production', status },
    { key: 'Payment', status: order.paymentStatus || 'Unpaid' },
    { key: 'Invoice Total', value: money.format(payable) },
    // Neutral when there is no figure: green would read as nothing owing.
    { key: 'Balance Due', value: asMoney(balance), valueColor: balance === null ? '#8a7a6a' : balance > 0 ? '#8a3520' : '#2a7d4f' },
  ];

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={onBack} style={outlineButton}>
            <ArrowLeft size={14} strokeWidth={2} />
            Back to Orders
          </button>
          <div className="os-page-title">
            <Package size={22} strokeWidth={1.8} />
            <div>
              <h2>Order Details</h2>
              <p>View full details and track the progress of this order</p>
            </div>
          </div>
        </div>
        {/* Resend Invoice and More Actions did nothing at all; printing is real. */}
        <button type="button" onClick={printInvoice} style={outlineButton}>
          <Printer size={13} strokeWidth={1.8} /> Print Invoice
        </button>
      </div>

      {notice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: '#fff5f0', border: '1px solid #f0c8b8', borderRadius: 8, color: '#8a3520', fontSize: 13 }}>
          <AlertCircle size={15} /> {notice}
        </div>
      )}

      {/* Order header card */}
      <div className="os-card">
        <div className="os-card-head">
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: '#1a1611',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>{custInitials || '—'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 17, fontFamily: 'var(--font-display)', color: '#1a1611' }}>{order.customer}</strong>
              <Status>{status}</Status>
              <Status>{order.paymentStatus || 'Unpaid'}</Status>
            </div>
            <div style={{ fontSize: 13, color: '#c97b08', fontWeight: 700, marginTop: 4 }}>
              {order.invoiceNumber}
              {/* This read "Created Invalid Date": createdAt arrives already
                  formatted, and was being sliced and re-parsed as an ISO date. */}
              <span style={{ color: '#8a7a6a', fontWeight: 400, marginLeft: 12 }}>
                Created {formatMoment(order.createdAt)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#5a4e42', marginTop: 2 }}>
              {order.phone || job.phone || 'No phone recorded'}
            </div>
          </div>
        </div>

        {/* Six columns crushed into a phone, overlapping their own headings and
            status pills. They wrap now, and read left-aligned when stacked. */}
        <div className="order-facts-row">
          {facts.map(({ key, value, status: pill, sub, subColor, valueColor }) => (
            <div className="order-fact" key={key}>
              <div style={label}>{key}</div>
              <div style={{ marginTop: 5 }}>
                {pill ? <Status>{pill}</Status> : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: valueColor || '#1a1611' }}>{value}</span>
                )}
              </div>
              {sub && <div style={{ fontSize: 11, color: subColor, fontWeight: 600, marginTop: 3 }}>{sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="os-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Order Summary */}
          <div className="os-card">
            <div className="os-card-head">
              <FileText size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Order Summary</strong>
                <p>Delivery and special instructions</p>
              </div>
            </div>
            <div className="os-card-body">
              <div className="os-grid-2">
                {[
                  ['Pieces', order.pieces || job.pieces || items.reduce((sum, line) => sum + line.quantity, 0) || 1],
                  ['Store', order.store ? `${order.store} Store` : '—'],
                  ['Fabric', job.fabric || 'Not allocated'],
                  ['Tailor', job.tailor && job.tailor !== 'Unassigned' ? job.tailor : 'Unassigned'],
                ].map(([name, value]) => (
                  <div key={name}>
                    <div style={label}>{name}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611', marginTop: 3 }}>{value}</div>
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={label}>Special Instructions</div>
                  {/* "Prefers slim fit and dark colors" was printed on every order. */}
                  <div style={{ fontSize: 13, color: orderNote ? '#5a4e42' : '#8a7a6a', marginTop: 3, padding: '10px 12px', background: '#faf7f3', borderRadius: 8, border: '1px solid #eee5da' }}>
                    {orderNote || 'None left with this order.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items in this order */}
          <div className="os-card">
            <div className="os-card-head">
              <Package size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Items in this Order</strong>
                <p>{items.length ? `${items.length} line${items.length === 1 ? '' : 's'} on the invoice` : 'No lines recorded'}</p>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 10 }}>
              {items.length ? items.map((line, index) => (
                <div key={`${line.description}-${index}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', border: '1px solid #f3ede5', borderRadius: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: ['#f0faf4', '#fffbf0', '#f0f4ff'][index % 3],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Package size={15} strokeWidth={1.8} style={{ color: ['#2a7d4f', '#7a6030', '#3a5098'][index % 3] }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1611' }}>{line.description}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>
                      {line.quantity} piece{line.quantity === 1 ? '' : 's'}{line.note ? ` · ${line.note}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{money.format(line.amount)}</div>
                </div>
              )) : (
                <p style={{ margin: 0, fontSize: 13, color: '#8a7a6a' }}>No item lines were saved with this invoice.</p>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
                borderTop: '1px solid #f3ede5', fontWeight: 700,
              }}>
                <span style={{ fontSize: 13, color: '#5a4e42' }}>Total</span>
                <span style={{ fontSize: 15, color: '#1a1611' }}>{money.format(payable)}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="os-card">
            <div className="os-card-head">
              <CreditCard size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Payment Summary</strong>
                <p>Breakdown of invoice and payments received</p>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {[
                ['Invoice Total', money.format(payable), '#1a1611', false],
                ['Amount Paid', asMoney(paid), paid === null ? '#8a7a6a' : '#2a7d4f', false],
                ['Balance Remaining', asMoney(balance), balance === null ? '#8a7a6a' : balance > 0 ? '#8a3520' : '#2a7d4f', true],
                ['Payment Method', order.paymentMethod || '—', '#1a1611', false],
              ].map(([name, value, color, bold]) => (
                <div key={name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  padding: '11px 2px', borderBottom: '1px solid #f3ede5',
                }}>
                  <span style={{ fontSize: 13, color: '#5a4e42', fontWeight: bold ? 700 : 400 }}>{name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
              {/* A Bank Transfer for half the invoice, dated 22 Jul 2026, used to
                  be listed here as payment history on every order. */}
              {paid === null ? (
                <p style={{ margin: '14px 0 0', fontSize: 12, lineHeight: 1.5, color: '#7a6030', background: '#fffbf0', border: '1px solid #f0ddb0', borderRadius: 8, padding: '10px 12px' }}>
                  This order is marked part paid, but no figure was recorded for how much the
                  customer paid.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="os-sidebar">
          {/* Production Progress */}
          <div className="os-card">
            <div className="os-card-head">
              <Package size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Production Progress</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {/* Five steps with fixed dates and times used to claim payment had
                  been confirmed and work was underway on every order. */}
              {steps.map(([name, note, when, state]) => (
                <div key={name} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: state === 'done' ? '#f0faf4' : state === 'current' ? '#fffbf0' : '#f5f0e8',
                    border: `2px solid ${state === 'done' ? '#2a7d4f' : state === 'current' ? '#c97b08' : '#ddd5c8'}`,
                  }}>
                    {state === 'done' ? <CheckCircle size={13} strokeWidth={2} style={{ color: '#2a7d4f' }} />
                      : state === 'current' ? <Package size={13} strokeWidth={2} style={{ color: '#c97b08' }} />
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ddd5c8' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: state === 'pending' ? '#8a7a6a' : '#1a1611' }}>{name}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{note}</div>
                    {when && when !== '—' ? <div style={{ fontSize: 11, color: '#b0a090', marginTop: 3 }}>{when}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="os-card">
            <div className="os-card-head">
              <Clock size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Activity</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {/* Three events attributed to a named member of staff, with times,
                  used to appear on every order whether they happened or not. */}
              {[
                [formatMoment(order.createdAt), order.createdBy ? `Invoice raised by ${order.createdBy}` : 'Invoice raised', '#3a5098'],
                ...(approved ? [['—', 'Approved by Accounts', '#2a7d4f']] : []),
                ...(job.tailor && job.tailor !== 'Unassigned' ? [['—', `Assigned to ${job.tailor}`, '#7a6030']] : []),
                ...(ready ? [['—', 'Marked ready for collection', '#2a7d4f']] : []),
              ].map(([when, text, color]) => (
                <div key={text} style={{ display: 'flex', gap: 10, paddingBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{when}</div>
                    <div style={{ fontSize: 13, color: '#1a1611', fontWeight: 500, marginTop: 2 }}>{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Measurements */}
          <div className="os-summary-card">
            <header>
              <Ruler size={15} strokeWidth={1.8} />
              <h3>Measurements</h3>
            </header>
            {measurements.length ? (
              <dl>
                {measurements.map(([name, value]) => (
                  <div key={name} style={{ display: 'contents' }}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : measurementNote ? (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#5a4e42', lineHeight: 1.6 }}>{measurementNote}</p>
            ) : (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#8a7a6a' }}>
                No measurements are attached to this order.
              </p>
            )}
          </div>

          {/* Customer */}
          <div className="os-card">
            <div className="os-card-head">
              <User size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Customer</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 8 }}>
              {[
                ['Name', order.customer || '—'],
                ['Phone', order.phone || job.phone || '—'],
                ['Email', order.email || '—'],
              ].map(([name, value]) => (
                <div key={name}>
                  <div style={label}>{name}</div>
                  <div style={{ fontSize: 13, color: '#1a1611', marginTop: 2, overflowWrap: 'anywhere' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div style={{ paddingTop: 8 }}>
        {/* "Mark as Ready for Collection" sat here with nothing behind it — that
            decision belongs to the production board, where it is confirmed. */}
        <button type="button" onClick={onBack} style={{ ...outlineButton, padding: '10px 18px' }}>
          <ArrowLeft size={14} strokeWidth={2} /> Back to Orders
        </button>
      </div>
    </div>
  );
}
