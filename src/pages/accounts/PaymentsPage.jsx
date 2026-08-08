import { useMemo, useRef, useState } from 'react';
import { Banknote, CheckCircle, Layers, CreditCard, Building2, Search, Download, MoreHorizontal } from 'lucide-react';
import { money } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const demoPayments = [
  ['22 Jul 2026', '10:28 AM', 'INV30659', 'Jimmy Aki', 'Lekki', 25000, 43000, 'Bank Transfer', 'Partial Paid', 'GTBank – 0123045678'],
  ['22 Jul 2026', '09:15 AM', 'INV65761', 'Henry Eyo', 'Lekki', 15000, 15000, 'Bank Transfer', 'Paid', 'GTB – 0234567890'],
  ['21 Jul 2026', '06:30 PM', 'INV74120', 'Olive Lawrence', 'Ikoyi', 0, 82000, 'Card', 'Unpaid', '—'],
  ['21 Jul 2026', '02:10 PM', 'INV35943', 'Bola Adebayo', 'VI', 30000, 64000, 'Cash', 'Partial Paid', '—'],
  ['21 Jul 2026', '02:16 PM', 'INV99320', 'David Martins', 'Ikeja', 103000, 103000, 'Bank Transfer', 'Paid', 'Access – 0987654321'],
  ['20 Jul 2026', '03:45 PM', 'INV55678', 'Aisha Bello', 'Lekki', 18700, 37400, 'Cash', 'Partial Paid', '—'],
  ['20 Jul 2026', '09:00 AM', 'INV44321', 'Tomi Ajayi', 'Ikoyi', 0, 18000, 'Bank Transfer', 'Unpaid', '—'],
  ['19 Jul 2026', '04:20 PM', 'INV22110', 'Kelechi Okafor', 'Lekki', 25000, 25000, 'Cash', 'Paid', '—'],
].map(([date, time, invoiceNumber, customer, store, received, total, method, status, reference]) => ({ date, time, invoiceNumber, customer, store, received, total, method, status, reference }));

const KPI_COUNT = 5;

export default function AccountsPaymentsPage({ sentInvoices = [] }) {
  const generated = sentInvoices.map((invoice) => ({
    date: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '22 Jul 2026',
    time: '10:28 AM', invoiceNumber: invoice.invoiceNumber, customer: invoice.customer, store: invoice.store || 'Lekki',
    received: Number(invoice.paid || (invoice.paymentStatus === 'Fully Paid' ? invoice.total : 0)), total: Number(invoice.total || 0),
    method: invoice.paymentMethod || 'Bank Transfer', status: invoice.paymentStatus === 'Fully Paid' ? 'Paid' : invoice.paymentStatus || 'Unpaid',
    reference: invoice.paymentReference || '—',
  }));
  const payments = generated.length >= 8 ? generated : demoPayments;
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Payments');
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

  const filtered = useMemo(() => payments.filter((payment) => {
    const queryMatch = `${payment.customer} ${payment.invoiceNumber} ${payment.reference}`.toLowerCase().includes(search.toLowerCase());
    const tabMatch = tab === 'All Payments' || (tab === 'Full Payments' && payment.status === 'Paid') || (tab === 'Partial Payments' && payment.status === 'Partial Paid') || (tab === 'Unpaid' && payment.status === 'Unpaid') || ['Today', 'This Week'].includes(tab);
    return queryMatch && tabMatch;
  }), [payments, search, tab]);
  const paid = payments.filter((item) => item.status === 'Paid');
  const partial = payments.filter((item) => item.status === 'Partial Paid');
  const unpaid = payments.filter((item) => item.status === 'Unpaid');
  const cash = payments.filter((item) => item.method === 'Cash');
  const bank = payments.filter((item) => item.method === 'Bank Transfer');
  const received = payments.reduce((sum, item) => sum + item.received, 0);
  const outstanding = payments.reduce((sum, item) => sum + Math.max(0, item.total - item.received), 0);

  const kpis = [
    { icon: <Banknote size={18} />, label: 'Total Received', value: money.format(received), detail: `${payments.length} payments`, tone: 'purple' },
    { icon: <CheckCircle size={18} />, label: 'Fully Paid', value: paid.length, detail: `${payments.length ? Math.round(paid.length / payments.length * 100) : 0}% of total`, tone: 'green' },
    { icon: <Layers size={18} />, label: 'Partial Paid', value: partial.length, detail: money.format(partial.reduce((sum, item) => sum + item.received, 0)), tone: 'orange' },
    { icon: <CreditCard size={18} />, label: 'Outstanding', value: money.format(outstanding), detail: `${unpaid.length} unpaid`, tone: 'red' },
    { icon: <Building2 size={18} />, label: 'Bank Transfers', value: bank.length, detail: money.format(bank.reduce((sum, item) => sum + item.received, 0)), tone: 'blue' },
  ];

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <CreditCard size={22} />
          <div>
            <h2>Payments</h2>
            <p>Track and manage all customer payment records</p>
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-carousel-wrap">
        <section className="payment-kpis" ref={kpiScrollRef} onScroll={handleKpiScroll}>
          {kpis.map(({ icon, label, value, detail, tone }) => (
            <article className={tone} key={label}>
              <i>{icon}</i>
              <span>
                <small>{label}</small>
                <strong>{value}</strong>
              </span>
              <p>{detail}</p>
            </article>
          ))}
        </section>
      </div>

      {/* Main Layout */}
      <div className="os-layout">
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter & Search Bar */}
          <div className="os-card">
            <div className="os-card-body" style={{ gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="os-field" style={{ flex: '1 1 220px', flexDirection: 'row', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff' }}>
                  <Search size={14} style={{ color: '#b0a090', flexShrink: 0 }} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by customer, invoice or reference..."
                    style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1a1611', background: 'transparent', flex: 1 }}
                  />
                </label>
                <select className="os-field" style={{ padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' }}>
                  <option>Payment Method</option>
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Card</option>
                </select>
                <select className="os-field" style={{ padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' }}>
                  <option>Payment Status</option>
                  <option>Paid</option>
                  <option>Partial Paid</option>
                  <option>Unpaid</option>
                </select>
                <select className="os-field" style={{ padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' }}>
                  <option>Store</option>
                  <option>Lekki</option>
                  <option>Ikoyi</option>
                  <option>VI</option>
                  <option>Ikeja</option>
                </select>
              </div>
              {/* Tab Nav */}
              <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  ['All Payments', payments.length],
                  ['Today', 6],
                  ['This Week', 18],
                  ['Full Payments', paid.length],
                  ['Partial Payments', partial.length],
                  ['Unpaid', unpaid.length],
                ].map(([label, count]) => (
                  <button
                    key={label}
                    onClick={() => setTab(label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      borderRadius: 20, border: '1px solid', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      background: tab === label ? '#1a1611' : 'transparent',
                      color: tab === label ? '#fff' : '#5a4e42',
                      borderColor: tab === label ? '#1a1611' : '#ddd5c8',
                    }}
                  >
                    {label}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 18, height: 18, borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: tab === label ? 'rgba(255,255,255,0.2)' : '#f3ede5',
                      color: tab === label ? '#fff' : '#8a7a6a', padding: '0 5px',
                    }}>{count}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Desktop Table */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee5da', background: '#fff', display: 'block' }} className="payments-table-desktop">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Invoice', 'Customer', 'Amount', 'Received', 'Balance', 'Method', 'Status', 'Reference', ''].map((col) => (
                    <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '11px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #eee5da' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px 20px', color: '#8a7a6a', fontSize: 14 }}>
                      <CreditCard size={32} style={{ display: 'block', margin: '0 auto 10px', color: '#ddd5c8' }} />
                      No payments found
                    </td>
                  </tr>
                ) : filtered.slice(0, 8).map((payment) => (
                  <tr key={payment.invoiceNumber} style={{ cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500, color: '#1a1611' }}>{payment.date}</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{payment.time}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ fontFamily: 'monospace', fontSize: 12, color: '#5a4e42' }}>{payment.invoiceNumber}</strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{payment.customer}</div>
                      {['Jimmy Aki', 'Henry Eyo', 'Bola Adebayo'].includes(payment.customer) && (
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: '#c97b08', background: '#fff8ee', padding: '1px 5px', borderRadius: 4, border: '1px solid #f0ddb0' }}>ELITE</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ color: '#1a1611' }}>{money.format(payment.total)}</strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ color: '#2a7d4f' }}>{money.format(payment.received)}</strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ color: payment.total - payment.received > 0 ? '#8a3520' : '#2a7d4f' }}>
                        {money.format(Math.max(0, payment.total - payment.received))}
                      </strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#f3ede5', color: '#5a4e42' }}>
                        {payment.method === 'Cash' ? <Banknote size={12} /> : payment.method === 'Card' ? <CreditCard size={12} /> : <Building2 size={12} />}
                        {payment.method}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <Status>{payment.status}</Status>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, borderBottom: '1px solid #f3ede5', color: '#8a7a6a' }}>{payment.reference}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#8a7a6a' }}>
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3ede5', background: '#faf7f3' }}>
                <span style={{ fontSize: 12, color: '#8a7a6a' }}>Showing {filtered.length ? 1 : 0}–{Math.min(8, filtered.length)} of {payments.length} payments</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['‹', '1', '2', '3', '›'].map((label, i) => (
                    <button key={i} style={{ minWidth: 30, height: 30, border: '1px solid #ddd5c8', borderRadius: 6, background: label === '1' ? '#1a1611' : '#fff', color: label === '1' ? '#fff' : '#5a4e42', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card List */}
          <div className="payments-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
            {filtered.slice(0, 8).map((payment) => (
              <div key={payment.invoiceNumber} className="os-card" style={{ padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3ede5' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1611' }}>{payment.customer}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{payment.invoiceNumber} · {payment.date}</div>
                  </div>
                  <Status>{payment.status}</Status>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #f3ede5' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Received</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2a7d4f', marginTop: 3 }}>{money.format(payment.received)}</div>
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Balance</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: payment.total - payment.received > 0 ? '#8a3520' : '#2a7d4f', marginTop: 3 }}>{money.format(Math.max(0, payment.total - payment.received))}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="os-sidebar">
          {/* Payment Summary */}
          <div className="os-summary-card">
            <header>
              <Banknote size={15} />
              <h3>Payment Summary</h3>
            </header>
            <dl>
              <dt>Paid in Full</dt>
              <dd style={{ color: '#2a7d4f', fontWeight: 700 }}>{paid.length} · {money.format(paid.reduce((sum, item) => sum + item.received, 0))}</dd>
              <dt>Partial Paid</dt>
              <dd style={{ color: '#c97b08', fontWeight: 700 }}>{partial.length} · {money.format(partial.reduce((sum, item) => sum + item.received, 0))}</dd>
              <dt>Unpaid</dt>
              <dd style={{ color: '#8a3520', fontWeight: 700 }}>{unpaid.length} · {money.format(unpaid.reduce((sum, item) => sum + item.total, 0))}</dd>
              <dt>Overdue</dt>
              <dd style={{ color: '#8a3520', fontWeight: 700 }}>2 · ₦94,000</dd>
              <dt>Total Received</dt>
              <dd style={{ color: '#1a1611', fontWeight: 800, fontSize: 14 }}>{money.format(received)}</dd>
            </dl>
          </div>

          {/* Top Payment Methods */}
          <div className="os-card">
            <div className="os-card-head">
              <Building2 size={15} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Payment Methods</strong>
                <p>Breakdown by method</p>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 12 }}>
              {[
                ['Bank Transfer', bank.length, bank.reduce((sum, item) => sum + item.received, 0), 82],
                ['Cash', cash.length, cash.reduce((sum, item) => sum + item.received, 0), 28],
                ['Card', 0, 0, 0],
              ].map(([label, count, amount, barWidth]) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#5a4e42' }}>{label}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: '#8a7a6a' }}>{count} ({payments.length ? Math.round(count / payments.length * 100) : 0}%)</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1611' }}>{money.format(amount)}</div>
                    </div>
                  </div>
                  <div style={{ height: 4, background: '#f3ede5', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: '#c97b08', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="os-card">
            <div className="os-card-head">
              <div>
                <strong>Quick Actions</strong>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 8, padding: '12px' }}>
              {[
                [<Banknote size={14} />, 'Record Manual Payment', 'Add payment not from store'],
                [<Layers size={14} />, 'Match Payment to Invoice', 'Link unallocated payments'],
                [<Building2 size={14} />, 'Generate Payment Report', 'Download payments summary'],
                [<CheckCircle size={14} />, 'Bulk Upload Payments', 'Upload payment records (CSV)'],
              ].map(([icon, title, detail]) => (
                <button key={title} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3ede5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#faf7f3'}
                >
                  <span style={{ color: '#c97b08', flexShrink: 0 }}>{icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1a1611' }}>{title}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#8a7a6a', marginTop: 1 }}>{detail}</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#b0a090' }}>›</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .payments-table-desktop { display: none !important; }
          .payments-mobile-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
