import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, CheckCircle, Flag, DollarSign } from 'lucide-react';
import { money, invoiceApprovalStatus, amountReceived, amountOutstanding, formatMoment } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import InvoiceActionConfirmModal from '../../components/oms/InvoiceActionConfirmModal';
import ReviewInvoicePage from './ReviewInvoicePage';

const KPI_COUNT = 4;
const PAGE_SIZE = 8;

export default function AccountsInvoicesPage({ sentInvoices = [], onApproveInvoice, onInvoiceUpdated }) {
  const invoices = sentInvoices;
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Invoices');
  const [storeFilter, setStoreFilter] = useState('All Stores');
  const [sortOrder, setSortOrder] = useState('Newest first');
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewInvoice, setReviewInvoice] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

  const statusOf = (invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts' ? 'Awaiting Review' : invoiceApprovalStatus(invoice);

  // Offered from the invoices on hand, so the list can never name a store with
  // nothing behind it.
  const stores = useMemo(() => [...new Set(invoices.map((invoice) => invoice.store).filter(Boolean))], [invoices]);

  const filtered = useMemo(() => {
    const byDate = (invoice) => new Date(invoice.invoiceDate || invoice.createdAt || 0).getTime();
    const comparators = {
      'Newest first': (a, b) => byDate(b) - byDate(a),
      'Oldest first': (a, b) => byDate(a) - byDate(b),
      'Highest amount': (a, b) => Number(b.total || 0) - Number(a.total || 0),
      'Lowest amount': (a, b) => Number(a.total || 0) - Number(b.total || 0),
    };
    return invoices.filter((invoice) => {
      const status = statusOf(invoice);
      const matchesSearch = `${invoice.invoiceNumber} ${invoice.customer}`.toLowerCase().includes(search.toLowerCase());
      const matchesTab = tab === 'All Invoices' || status === tab || invoice.paymentStatus === tab;
      const matchesStore = storeFilter === 'All Stores' || invoice.store === storeFilter;
      return matchesSearch && matchesTab && matchesStore;
    }).sort(comparators[sortOrder] || comparators['Newest first']);
  }, [invoices, search, tab, storeFilter, sortOrder]);

  const exportCsv = () => {
    const header = ['Invoice', 'Customer', 'Store', 'Amount', 'Received', 'Payment', 'Status', 'Submitted', 'By'];
    const rows = filtered.map((invoice) => [
      invoice.invoiceNumber, invoice.customer, invoice.store || '', Number(invoice.total || 0),
      amountReceived(invoice) === null ? 'Not recorded' : amountReceived(invoice),
      invoice.paymentStatus, statusOf(invoice), invoice.submitted || formatMoment(invoice.createdAt), invoice.createdBy || '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `twif-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const awaiting = invoices.filter((invoice) => statusOf(invoice) === 'Awaiting Review');
  const approved = invoices.filter((invoice) => statusOf(invoice) === 'Approved');
  const flagged = invoices.filter((invoice) => statusOf(invoice) === 'Flagged');
  // An invoice whose received amount was never recorded cannot be counted as
  // fully outstanding, so it is counted apart from the figure.
  const outstanding = invoices.reduce((sum, invoice) => sum + (amountOutstanding(invoice) ?? 0), 0);
  const unrecorded = invoices.filter((invoice) => amountReceived(invoice) === null).length;

  // The overview queue links straight to one invoice's review page, so the
  // invoice number arrives as `?review=`. Invoices load after the first render,
  // so this waits for the list rather than reading it once.
  const requestedReview = searchParams.get('review');
  useEffect(() => {
    if (!requestedReview) return;
    const match = invoices.find((invoice) => invoice.invoiceNumber === requestedReview);
    if (match) setReviewInvoice(match);
  }, [invoices, requestedReview]);

  const closeReview = () => {
    setReviewInvoice(null);
    if (!requestedReview) return;
    // Left in place, the parameter would reopen the page the moment it closed.
    const next = new URLSearchParams(searchParams);
    next.delete('review');
    setSearchParams(next, { replace: true });
  };

  const review = (invoice, status) => onApproveInvoice?.(invoice.invoiceNumber, status);

  if (reviewInvoice) {
    return <ReviewInvoicePage
      invoice={reviewInvoice}
      onBack={closeReview}
      onReview={async (invoice, status) => {
        // Only reflected locally once the server has actually accepted the
        // decision — an Approve rejected for being under the payment
        // threshold must not still read as Approved on this screen.
        await review(invoice, status);
        setReviewInvoice((current) => (current ? { ...current, accountApprovalStatus: status } : current));
      }}
      onPaymentRecorded={(updated) => {
        setReviewInvoice(updated);
        onInvoiceUpdated?.(updated);
      }}
    />;
  }

  return <div className="accounts-invoices-page">
    <div className="accounts-invoice-main">
      <header className="accounts-invoice-heading">
        <div>
          <p>Accounts &nbsp;/&nbsp; <strong>Invoices</strong></p>
          <h2>Invoices</h2>
          <span>Review, approve and manage customer invoices before they enter production.</span>
        </div>
      </header>

      <div className="kpi-carousel-wrap">
        <section className="accounts-invoice-kpis" ref={kpiScrollRef} onScroll={handleKpiScroll}>
          {[
            [<Clock size={18} />, 'Awaiting Review', awaiting.length, awaiting.reduce((sum, item) => sum + Number(item.total || 0), 0), 'gold'],
            [<CheckCircle size={18} />, 'Approved Today', approved.length, approved.reduce((sum, item) => sum + Number(item.total || 0), 0), 'green'],
            [<Flag size={18} />, 'Flagged', flagged.length, flagged.reduce((sum, item) => sum + Number(item.total || 0), 0), 'red'],
            [<DollarSign size={18} />, 'Total Outstanding', money.format(outstanding), unrecorded ? `${unrecorded} with no amount recorded` : 'Across all invoices', 'chart'],
          ].map(([icon, label, value, detail, tone]) => (
            <article className={tone} key={label}>
              <i>{icon}</i>
              <span>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{typeof detail === 'number' ? money.format(detail) : detail} <em>{typeof detail === 'number' ? 'Total Amount' : ''}</em></p>
              </span>
            </article>
          ))}
        </section>
      </div>

      <section className="accounts-invoice-register">
        <header>
          <label>⌕<input value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search invoice or customer..." /></label>
          <select value={storeFilter} onChange={(event) => { setStoreFilter(event.target.value); setCurrentPage(1); }}>
            <option>All Stores</option>
            {stores.map((store) => <option key={store}>{store}</option>)}
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option>Newest first</option>
            <option>Oldest first</option>
            <option>Highest amount</option>
            <option>Lowest amount</option>
          </select>
          <button type="button" onClick={exportCsv} disabled={!filtered.length}>⇩ &nbsp; Export</button>
        </header>
        <nav>
          {[
            ['All Invoices', invoices.length],
            ['Awaiting Review', awaiting.length],
            ['Awaiting Payment', invoices.filter((i) => statusOf(i) === 'Awaiting Payment').length],
            ['Partial Paid', invoices.filter((i) => i.paymentStatus === 'Partial Paid').length],
            ['Approved', approved.length],
            ['Flagged', flagged.length],
            ['Rejected', invoices.filter((i) => statusOf(i) === 'Rejected').length],
          ].map(([label, count]) => (
            <button className={tab === label ? 'active' : ''} onClick={() => { setTab(label); setCurrentPage(1); }} key={label}>
              {label}<b>{count}</b>
            </button>
          ))}
        </nav>
        <div className="accounts-invoice-table">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Store</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((invoice) => {
                const status = statusOf(invoice);
                return (
                  <tr
                    key={invoice.invoiceNumber}
                  >
                    <td><strong>{invoice.invoiceNumber}</strong></td>
                    <td>
                      <strong>{invoice.customer}</strong>
                      {Number(invoice.eliteDiscountAmount || 0) > 0 && <small>ELITE</small>}
                    </td>
                    <td>{invoice.store || 'Lekki'}</td>
                    <td><strong>{money.format(invoice.total)}</strong></td>
                    <td><Status>{invoice.paymentStatus}</Status></td>
                    <td><Status>{status}</Status></td>
                    <td>
                      {invoice.submitted || formatMoment(invoice.createdAt)}
                      <small>{invoice.createdBy ? `by ${invoice.createdBy}` : ''}</small>
                    </td>
                    <td>
                      <button onClick={() => setReviewInvoice(invoice)}>
                        {status === 'Awaiting Review' ? 'Review' : status === 'Flagged' ? 'Resolve' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="owner-mobile-invoice-list">
          {visible.map((invoice) => {
            const status = statusOf(invoice);
            return (
              <article key={invoice.invoiceNumber}>
                <header>
                  <div>
                    <small>{invoice.invoiceNumber}</small>
                    <strong>{invoice.customer}</strong>
                    <span>{invoice.store || 'Lekki'}</span>
                  </div>
                  <Status>{status}</Status>
                </header>
                <section>
                  <div><small>Amount</small><strong>{money.format(invoice.total)}</strong></div>
                  <div><small>Payment</small><Status>{invoice.paymentStatus}</Status></div>
                  <div><small>Submitted</small><span>{invoice.submitted || formatMoment(invoice.createdAt)}</span></div>
                  <div><small>By</small><span>{invoice.createdBy || '—'}</span></div>
                </section>
                <footer>
                  <span>{invoice.submitted || formatMoment(invoice.createdAt)}</span>
                  <button type="button" onClick={() => setReviewInvoice(invoice)}>
                    {status === 'Awaiting Review' ? 'Review' : status === 'Flagged' ? 'Resolve' : 'View'} &nbsp;›
                  </button>
                </footer>
              </article>
            );
          })}
          {!filtered.length ? <div className="accounts-empty">No invoices match this view.</div> : null}
        </div>

        <footer>
          <span>
            Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} invoices
          </span>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <button type="button" key={number} className={number === page ? 'active' : ''} onClick={() => setCurrentPage(number)}>{number}</button>
            ))}
            <button type="button" disabled={page >= pageCount} onClick={() => setCurrentPage(page + 1)}>›</button>
          </div>
        </footer>
      </section>
    </div>

    {pendingAction && (
      <InvoiceActionConfirmModal
        invoice={pendingAction.invoice}
        status={pendingAction.status}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          review(pendingAction.invoice, pendingAction.status);
          setPendingAction(null);
        }}
      />
    )}
  </div>;
}
