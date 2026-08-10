import { useMemo, useRef, useState } from 'react';
import { Banknote, CheckCircle, Layers, CreditCard, Building2, Search, Download, Eye } from 'lucide-react';
import { money, amountReceived, invoicePayable } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import PaymentDetailPage from './PaymentDetailPage';

const KPI_COUNT = 5;
const PAGE_SIZE = 8;
const METHODS = ['Bank Transfer', 'Cash', 'Card', 'Check'];

// An invoice with no figure recorded counts as nothing received rather than as
// a guess — the row itself says "not recorded".
const totalReceived = (rows) => rows.reduce((sum, row) => sum + (row.received || 0), 0);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export default function AccountsPaymentsPage({ sentInvoices = [], onInvoiceUpdated }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Payments');
  const [methodFilter, setMethodFilter] = useState('Payment Method');
  const [statusFilter, setStatusFilter] = useState('Payment Status');
  const [storeFilter, setStoreFilter] = useState('Store');
  const [currentPage, setCurrentPage] = useState(1);
  const [openPayment, setOpenPayment] = useState(null);
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);

  const payments = useMemo(() => sentInvoices.map((invoice) => {
    const when = invoice.invoiceDate || invoice.createdAt;
    const at = when ? new Date(when) : null;
    return {
      invoice,
      at: at && !Number.isNaN(at.getTime()) ? at : null,
      date: at && !Number.isNaN(at.getTime()) ? at.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      store: invoice.store || '—',
      // null means the system holds no figure for this invoice; it is shown as
      // "Not recorded" instead of being counted as money in the bank.
      received: amountReceived(invoice),
      total: invoicePayable(invoice),
      method: invoice.paymentMethod || '—',
      status: invoice.paymentStatus === 'Fully Paid' ? 'Paid' : invoice.paymentStatus || 'Unpaid',
      elite: Number(invoice.eliteDiscountAmount || 0) > 0,
    };
  }), [sentInvoices]);

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

  const stores = useMemo(() => [...new Set(payments.map((payment) => payment.store).filter((store) => store !== '—'))], [payments]);

  const today = startOfDay(new Date());
  const weekStart = today - 6 * 86400000;
  const inTab = (payment) => {
    if (tab === 'All Payments') return true;
    if (tab === 'Today') return payment.at ? startOfDay(payment.at) === today : false;
    if (tab === 'This Week') return payment.at ? startOfDay(payment.at) >= weekStart : false;
    if (tab === 'Full Payments') return payment.status === 'Paid';
    if (tab === 'Partial Payments') return payment.status === 'Partial Paid';
    if (tab === 'Unpaid') return payment.status === 'Unpaid';
    return true;
  };

  const filtered = useMemo(() => payments.filter((payment) => {
    const queryMatch = `${payment.customer} ${payment.invoiceNumber}`.toLowerCase().includes(search.toLowerCase());
    const methodMatch = methodFilter === 'Payment Method' || payment.method === methodFilter;
    const statusMatch = statusFilter === 'Payment Status' || payment.status === statusFilter;
    const storeMatch = storeFilter === 'Store' || payment.store === storeFilter;
    return queryMatch && methodMatch && statusMatch && storeMatch && inTab(payment);
  }), [payments, search, tab, methodFilter, statusFilter, storeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const paid = payments.filter((item) => item.status === 'Paid');
  const partial = payments.filter((item) => item.status === 'Partial Paid');
  const unpaid = payments.filter((item) => item.status === 'Unpaid');
  const todayCount = payments.filter((payment) => payment.at && startOfDay(payment.at) === today).length;
  const weekCount = payments.filter((payment) => payment.at && startOfDay(payment.at) >= weekStart).length;
  const byMethod = METHODS.map((name) => payments.filter((item) => item.method === name));
  const bank = byMethod[0];
  const received = totalReceived(payments);
  const outstanding = payments.reduce((sum, item) => sum + Math.max(0, item.total - (item.received || 0)), 0);

  const exportCsv = () => {
    const header = ['Date', 'Invoice', 'Customer', 'Store', 'Amount', 'Received', 'Balance', 'Method', 'Status'];
    const rows = filtered.map((payment) => [
      payment.date, payment.invoiceNumber, payment.customer, payment.store, payment.total,
      payment.received === null ? 'Not recorded' : payment.received,
      payment.received === null ? 'Not recorded' : Math.max(0, payment.total - payment.received),
      payment.method, payment.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `twif-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { icon: <Banknote size={18} />, label: 'Total Received', value: money.format(received), detail: `${payments.length} invoice${payments.length === 1 ? '' : 's'}`, tone: 'purple' },
    { icon: <CheckCircle size={18} />, label: 'Fully Paid', value: paid.length, detail: `${payments.length ? Math.round(paid.length / payments.length * 100) : 0}% of total`, tone: 'green' },
    { icon: <Layers size={18} />, label: 'Partial Paid', value: partial.length, detail: money.format(totalReceived(partial)), tone: 'orange' },
    { icon: <CreditCard size={18} />, label: 'Outstanding', value: money.format(outstanding), detail: `${unpaid.length} unpaid`, tone: 'red' },
    { icon: <Building2 size={18} />, label: 'Bank Transfers', value: bank.length, detail: money.format(totalReceived(bank)), tone: 'blue' },
  ];

  const selectProps = {
    className: 'os-field',
    style: { padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' },
  };

  if (openPayment) {
    return (
      <PaymentDetailPage
        invoice={openPayment}
        onBack={() => setOpenPayment(null)}
        onRecorded={(invoice) => {
          onInvoiceUpdated?.(invoice);
          setOpenPayment(invoice);
        }}
      />
    );
  }

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
        <button
          type="button"
          onClick={exportCsv}
          disabled={!filtered.length}
          title={filtered.length ? 'Download these payments as a CSV' : 'Nothing to export'}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: filtered.length ? '#1a1611' : '#ddd5c8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: filtered.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
        >
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
                    onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                    placeholder="Search by customer, invoice or reference..."
                    style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1a1611', background: 'transparent', flex: 1 }}
                  />
                </label>
                <select {...selectProps} value={methodFilter} onChange={(event) => { setMethodFilter(event.target.value); setCurrentPage(1); }}>
                  <option>Payment Method</option>
                  {METHODS.map((name) => <option key={name}>{name}</option>)}
                </select>
                <select {...selectProps} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }}>
                  <option>Payment Status</option>
                  <option>Paid</option>
                  <option>Partial Paid</option>
                  <option>Unpaid</option>
                </select>
                {/* Stores come from the invoices on hand, so the list can never
                    offer a store that has no payments behind it. */}
                <select {...selectProps} value={storeFilter} onChange={(event) => { setStoreFilter(event.target.value); setCurrentPage(1); }}>
                  <option>Store</option>
                  {stores.map((name) => <option key={name}>{name}</option>)}
                </select>
              </div>
              {/* Tab Nav */}
              <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  ['All Payments', payments.length],
                  ['Today', todayCount],
                  ['This Week', weekCount],
                  ['Full Payments', paid.length],
                  ['Partial Payments', partial.length],
                  ['Unpaid', unpaid.length],
                ].map(([label, count]) => (
                  <button
                    key={label}
                    onClick={() => { setTab(label); setCurrentPage(1); }}
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
                  {['Date', 'Invoice', 'Customer', 'Amount', 'Received', 'Balance', 'Method', 'Status', 'Store', ''].map((col) => (
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
                ) : visible.map((payment) => (
                  <tr key={payment.invoiceNumber} style={{ cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500, color: '#1a1611' }}>{payment.date}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ fontFamily: 'monospace', fontSize: 12, color: '#5a4e42' }}>{payment.invoiceNumber}</strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{payment.customer}</div>
                      {payment.elite && (
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: '#c97b08', background: '#fff8ee', padding: '1px 5px', borderRadius: 4, border: '1px solid #f0ddb0' }}>ELITE</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ color: '#1a1611' }}>{money.format(payment.total)}</strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ color: payment.received === null ? '#8a7a6a' : '#2a7d4f', fontWeight: payment.received === null ? 500 : 700, fontSize: payment.received === null ? 12 : 13 }}>
                        {payment.received === null ? 'Not recorded' : money.format(payment.received)}
                      </strong>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <strong style={{ color: payment.received === null ? '#8a7a6a' : payment.total - payment.received > 0 ? '#8a3520' : '#2a7d4f', fontWeight: payment.received === null ? 500 : 700, fontSize: payment.received === null ? 12 : 13 }}>
                        {payment.received === null ? 'Not recorded' : money.format(Math.max(0, payment.total - payment.received))}
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
                    <td style={{ padding: '12px 14px', fontSize: 12, borderBottom: '1px solid #f3ede5', color: '#8a7a6a' }}>{payment.store}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <button
                        type="button"
                        onClick={() => setOpenPayment(payment.invoice)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#5a4e42', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3ede5', background: '#faf7f3' }}>
                <span style={{ fontSize: 12, color: '#8a7a6a' }}>
                  Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} payments
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['‹', ...Array.from({ length: pageCount }, (_, index) => String(index + 1)), '›'].map((label) => {
                    const isArrow = label === '‹' || label === '›';
                    const target = label === '‹' ? page - 1 : label === '›' ? page + 1 : Number(label);
                    const disabled = target < 1 || target > pageCount;
                    const active = !isArrow && target === page;
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={disabled}
                        onClick={() => setCurrentPage(target)}
                        style={{ minWidth: 30, height: 30, border: '1px solid #ddd5c8', borderRadius: 6, background: active ? '#1a1611' : '#fff', color: active ? '#fff' : disabled ? '#c7bcae' : '#5a4e42', fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                      >{label}</button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card List */}
          <div className="payments-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
            {visible.map((payment) => (
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
                    <div style={{ fontSize: payment.received === null ? 12 : 14, fontWeight: 700, color: payment.received === null ? '#8a7a6a' : '#2a7d4f', marginTop: 3 }}>
                      {payment.received === null ? 'Not recorded' : money.format(payment.received)}
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Balance</div>
                    <div style={{ fontSize: payment.received === null ? 12 : 14, fontWeight: 700, color: payment.received === null ? '#8a7a6a' : payment.total - payment.received > 0 ? '#8a3520' : '#2a7d4f', marginTop: 3 }}>
                      {payment.received === null ? 'Not recorded' : money.format(Math.max(0, payment.total - payment.received))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenPayment(payment.invoice)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '10px 16px', borderTop: '1px solid #f3ede5', border: 'none', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#f3ede5', background: '#faf7f3', color: '#5a4e42', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', borderRadius: '0 0 12px 12px' }}
                >
                  <Eye size={14} /> View payment
                </button>
              </div>
            ))}
            {!filtered.length ? (
              <div className="os-card" style={{ padding: '28px 16px', textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>
                No payments found
              </div>
            ) : null}
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
              <dd style={{ color: '#2a7d4f', fontWeight: 700 }}>{paid.length} · {money.format(totalReceived(paid))}</dd>
              <dt>Partial Paid</dt>
              <dd style={{ color: '#c97b08', fontWeight: 700 }}>{partial.length} · amounts not recorded</dd>
              <dt>Unpaid</dt>
              <dd style={{ color: '#8a3520', fontWeight: 700 }}>{unpaid.length} · {money.format(unpaid.reduce((sum, item) => sum + item.total, 0))}</dd>
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
              {/* The bars used to be fixed widths that had nothing to do with
                  the payments below them. */}
              {METHODS.map((name, index) => [
                name,
                byMethod[index].length,
                totalReceived(byMethod[index]),
                payments.length ? Math.round((byMethod[index].length / payments.length) * 100) : 0,
              ]).map(([label, count, amount, barWidth]) => (
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
