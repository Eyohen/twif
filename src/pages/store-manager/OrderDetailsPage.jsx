import { useEffect } from 'react';
import { ArrowLeft, Printer, Mail, MoreHorizontal, CheckCircle, Package, CreditCard, Ruler, FileText, Clock, User, AlertCircle } from 'lucide-react';
import { money } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const formatDate = (value, fallback = '22 Jul 2026') => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : fallback;

export default function OrderDetailsPage({ order, onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const job = order.orderSheet || {};
  const status = order.approval === 'Pending Accounts' ? 'Pending Accounts' : job.status === 'Ready' ? 'Ready for Collection' : job.status || order.orderStatus || 'In Production';
  const total = Number(order.total || 0);
  const paid = Number(order.paid || order.amountPaid || 0);
  const balance = Math.max(0, total - paid);
  const custInitials = order.customer?.split(' ').map((part) => part[0]).join('').slice(0, 2);
  const items = [
    ['Navy Senator', 'Top', Math.round(total * 0.337)],
    ['Grey Trousers', 'Bottom', Math.round(total * 0.308)],
    ['White Shirt', 'Top', total - Math.round(total * 0.337) - Math.round(total * 0.308)],
  ];

  return (
    <div className="os-page">
      {/* Page header */}
      <div className="os-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, background: 'none',
              border: '1px solid #ddd5c8', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, color: '#5a4e42', cursor: 'pointer',
            }}
          >
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13,
            fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
          }}>
            <Printer size={13} strokeWidth={1.8} /> Print Invoice
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13,
            fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
          }}>
            <Mail size={13} strokeWidth={1.8} /> Resend Invoice
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13,
            fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
          }}>
            <MoreHorizontal size={13} strokeWidth={1.8} /> More Actions
          </button>
        </div>
      </div>

      {/* Order header card */}
      <div className="os-card">
        <div className="os-card-head">
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: '#1a1611',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>{custInitials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 17, fontFamily: 'var(--font-display)', color: '#1a1611' }}>{order.customer}</strong>
              <Status>{status}</Status>
              <Status>{order.paymentStatus || 'Partial Paid'}</Status>
            </div>
            <div style={{ fontSize: 13, color: '#c97b08', fontWeight: 700, marginTop: 4 }}>
              {order.invoiceNumber}
              <span style={{ color: '#8a7a6a', fontWeight: 400, marginLeft: 12 }}>
                Created {formatDate(order.createdAt)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#5a4e42', marginTop: 2 }}>
              {order.phone || job.phone || '0813 813 7841'}
            </div>
          </div>
        </div>
        {/* Quick facts row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderTop: '1px solid #f3ede5' }}>
          {[
            { label: 'Invoice No.', value: order.invoiceNumber },
            { label: 'Delivery Date', value: formatDate(job.delivery || order.deliveryDate, '26 Jul 2026'), sub: '4 days left', subColor: '#8a3520' },
            { label: 'Production', value: null, status: status },
            { label: 'Payment', value: null, status: order.paymentStatus || 'Partial Paid' },
            { label: 'Invoice Total', value: money.format(total) },
            { label: 'Balance Due', value: money.format(balance), valueColor: balance > 0 ? '#8a3520' : '#2a7d4f' },
          ].map(({ label, value, status: s, sub, subColor, valueColor }, i) => (
            <div key={label} style={{
              padding: '12px 14px', borderRight: i < 5 ? '1px solid #f3ede5' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ marginTop: 5 }}>
                {s ? <Status>{s}</Status> : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: valueColor || '#1a1611' }}>{value}</span>
                )}
              </div>
              {sub && <div style={{ fontSize: 11, color: subColor || '#8a7a6a', fontWeight: 600, marginTop: 3 }}>{sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="os-layout">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Order Info */}
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
                  ['Order Type', 'Stitching'],
                  ['Items', `${order.pieces || job.pieces || 3} pieces`],
                  ['Delivery Type', 'Store Pickup'],
                  ['Delivery Address', order.store || 'Lekki Store'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611', marginTop: 3 }}>{value}</div>
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Special Instructions</div>
                  <div style={{ fontSize: 13, color: '#5a4e42', marginTop: 3, padding: '10px 12px', background: '#faf7f3', borderRadius: 8, border: '1px solid #eee5da' }}>
                    {job.productionNote || 'Prefers slim fit and dark colors.'}
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
                <p>{items.length} items</p>
              </div>
              <button style={{
                marginLeft: 'auto', padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 7,
                fontSize: 12, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer',
              }}>View Items</button>
            </div>
            <div className="os-card-body" style={{ gap: 10 }}>
              {items.map(([name, type, value], index) => (
                <div key={name} style={{
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1611' }}>{name}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>{type} &middot; 1 piece</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1611' }}>{money.format(value)}</div>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
                borderTop: '1px solid #f3ede5', fontWeight: 700,
              }}>
                <span style={{ fontSize: 13, color: '#5a4e42' }}>Total ({items.length} items)</span>
                <span style={{ fontSize: 15, color: '#1a1611' }}>{money.format(total)}</span>
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
                ['Invoice Total', money.format(total), '#1a1611', false],
                ['Amount Paid', money.format(paid), '#2a7d4f', false],
                ['Balance Remaining', money.format(balance), balance > 0 ? '#8a3520' : '#2a7d4f', true],
              ].map(([label, value, color, bold]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 2px', borderBottom: '1px solid #f3ede5',
                }}>
                  <span style={{ fontSize: 13, color: '#5a4e42', fontWeight: bold ? 700 : 400 }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: 13, color: '#1a1611' }}>Payment History</strong>
                  <button style={{ fontSize: 12, color: '#c97b08', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#faf7f3', borderRadius: 9, border: '1px solid #eee5da',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611' }}>Bank Transfer</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>22 Jul 2026 &middot; {order.customer}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#2a7d4f' }}>{money.format(paid)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Notes */}
          <div className="os-card">
            <div className="os-card-head">
              <User size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Customer Notes</strong></div>
              <button style={{
                marginLeft: 'auto', padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 7,
                fontSize: 12, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer',
              }}>Edit</button>
            </div>
            <div className="os-card-body">
              <div style={{ fontSize: 13, color: '#5a4e42', lineHeight: 1.6, padding: '4px 0' }}>
                Prefers slim fit. Likes simple designs.
              </div>
              <div style={{ fontSize: 11, color: '#8a7a6a' }}>Added on 22 Jul 2026 by Bola</div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="os-sidebar">

          {/* Production Progress */}
          <div className="os-card">
            <div className="os-card-head">
              <Package size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Production Progress</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {[
                ['Order Created', 'Invoice sent to Accounts', '22 Jul 2026', '10:15 AM', 'done'],
                ['Accounts Confirmed', 'Payment confirmed', '22 Jul 2026', '11:42 AM', 'done'],
                ['In Production', 'Being worked on', '23 Jul 2026', '09:30 AM', 'current'],
                ['Ready for Collection', 'Awaiting quality check', '', '', 'pending'],
                ['Completed', 'Collected by customer', '', '', 'pending'],
              ].map(([label, note, date, time, state]) => (
                <div key={label} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: state === 'pending' ? '#8a7a6a' : '#1a1611' }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{note}</div>
                    {date && (
                      <div style={{ fontSize: 11, color: '#b0a090', marginTop: 3 }}>{date} &middot; {time}</div>
                    )}
                  </div>
                </div>
              ))}
              <div style={{
                padding: '10px 12px', background: '#fffbf0', border: '1px solid #f0ddb0',
                borderRadius: 8, fontSize: 12, color: '#7a6030', marginTop: 4,
              }}>
                You will be notified when this order is ready for collection.
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="os-card">
            <div className="os-card-head">
              <Clock size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Activity</strong></div>
              <button style={{
                marginLeft: 'auto', padding: '4px 8px', border: '1px solid #ddd5c8', borderRadius: 6,
                fontSize: 11, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer',
              }}>View All</button>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {[
                ['23 Jul 2026, 09:30 AM', 'Bola marked order as In Production', '#f0faf4', '#2a7d4f'],
                ['22 Jul 2026, 11:42 AM', 'Payment confirmed by Accounts', '#fffbf0', '#7a6030'],
                ['22 Jul 2026, 10:15 AM', 'Invoice created by Bola', '#f0f4ff', '#3a5098'],
              ].map(([date, text, bg, color]) => (
                <div key={text} style={{ display: 'flex', gap: 10, paddingBottom: 14 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: color,
                    flexShrink: 0, marginTop: 5,
                  }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{date}</div>
                    <div style={{ fontSize: 13, color: '#1a1611', fontWeight: 500, marginTop: 2 }}>{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Measurements summary */}
          <div className="os-summary-card">
            <header>
              <Ruler size={15} strokeWidth={1.8} />
              <h3>Key Measurements</h3>
            </header>
            <dl>
              {[
                ['Chest', job.chest || '42 in'],
                ['Waist', job.waist || '34 in'],
                ['Hip', job.hip || '41 in'],
                ['Sleeve', job.sleeve || '24 in'],
                ['Trouser', job.trouser || '31 in'],
              ].map(([label, value]) => (
                <>
                  <dt key={`dt-${label}`}>{label}</dt>
                  <dd key={`dd-${label}`}>{value}</dd>
                </>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      {/* Footer actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, flexWrap: 'wrap', gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, background: 'none',
            border: '1px solid #ddd5c8', borderRadius: 8, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, color: '#5a4e42', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} /> Back to Orders
        </button>
        <button className="os-release-btn" style={{ width: 'auto', padding: '10px 22px', fontSize: 14 }}>
          <CheckCircle size={15} strokeWidth={2} />
          Mark as Ready for Collection
        </button>
      </div>
    </div>
  );
}
