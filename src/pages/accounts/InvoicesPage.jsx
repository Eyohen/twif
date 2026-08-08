import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, CheckCircle, Flag, DollarSign } from 'lucide-react';
import { money, invoiceApprovalStatus } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import InvoiceActionConfirmModal from '../../components/oms/InvoiceActionConfirmModal';
import ReviewInvoicePage from './ReviewInvoicePage';

const KPI_COUNT = 4;
const PAGE_SIZE = 8;

export default function AccountsInvoicesPage({ sentInvoices = [], onApproveInvoice }) {
  const invoices = sentInvoices;
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Invoices');
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(invoices[0] || null);
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
  const filtered = useMemo(() => invoices.filter((invoice) => {
    const status = statusOf(invoice);
    const matchesSearch = `${invoice.invoiceNumber} ${invoice.customer}`.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === 'All Invoices' || status === tab || invoice.paymentStatus === tab;
    return matchesSearch && matchesTab;
  }), [invoices, search, tab]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const awaiting = invoices.filter((invoice) => statusOf(invoice) === 'Awaiting Review');
  const approved = invoices.filter((invoice) => statusOf(invoice) === 'Approved');
  const flagged = invoices.filter((invoice) => statusOf(invoice) === 'Flagged');
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total || 0) - Number(invoice.paid || 0)), 0);

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

  const review = (invoice, status) => {
    onApproveInvoice?.(invoice.invoiceNumber, status);
    setSelected((current) => current?.invoiceNumber === invoice.invoiceNumber ? { ...current, accountApprovalStatus: status } : current);
  };

  if (reviewInvoice) {
    return <ReviewInvoicePage invoice={reviewInvoice} onBack={closeReview} onReview={(invoice, status) => {
      review(invoice, status);
      setReviewInvoice({ ...invoice, accountApprovalStatus: status });
    }} />;
  }

  return <div className={`accounts-invoices-page ${selected ? 'drawer-open' : ''}`}>
    <div className="accounts-invoice-main">
      <header className="accounts-invoice-heading">
        <div>
          <p>Accounts &nbsp;/&nbsp; <strong>Invoices</strong></p>
          <h2>Invoices</h2>
          <span>Review, approve and manage customer invoices before they enter production.</span>
        </div>
        <label>▣ &nbsp; 22 Jul – 22 Jul 2026 &nbsp;⌄</label>
      </header>

      <div className="kpi-carousel-wrap">
        <section className="accounts-invoice-kpis" ref={kpiScrollRef} onScroll={handleKpiScroll}>
          {[
            [<Clock size={18} />, 'Awaiting Review', awaiting.length, awaiting.reduce((sum, item) => sum + Number(item.total || 0), 0), 'gold'],
            [<CheckCircle size={18} />, 'Approved Today', approved.length, approved.reduce((sum, item) => sum + Number(item.total || 0), 0), 'green'],
            [<Flag size={18} />, 'Flagged', flagged.length, flagged.reduce((sum, item) => sum + Number(item.total || 0), 0), 'red'],
            [<DollarSign size={18} />, 'Total Outstanding', money.format(outstanding), '↑ 18.7% vs last 30 days', 'chart'],
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
          <select><option>Payment Status</option></select>
          <select><option>Store</option></select>
          <select><option>▣ &nbsp; All Dates</option></select>
          <select><option>Sort by: Newest</option></select>
          <button>⇩ &nbsp; Export</button>
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
                    className={selected?.invoiceNumber === invoice.invoiceNumber ? 'selected' : ''}
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
                      {invoice.submitted || 'Today'}
                      <small>by {invoice.createdBy || 'Bola'}</small>
                    </td>
                    <td>
                      <button onClick={() => setReviewInvoice(invoice)}>
                        {status === 'Awaiting Review' ? 'Review' : status === 'Flagged' ? 'Resolve' : 'View'}
                      </button>
                      <button className="dots" onClick={() => setSelected(invoice)}>⋮</button>
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
                  <div><small>Submitted</small><span>{invoice.submitted || 'Today'}</span></div>
                  <div><small>By</small><span>{invoice.createdBy || 'Bola'}</span></div>
                </section>
                <footer>
                  <span>{invoice.submitted || 'Today'}</span>
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

    {selected && (
      <aside className="accounts-invoice-drawer">
        <button className="drawer-close" onClick={() => setSelected(null)}>×</button>
        <section>
          <header>
            <h3>Invoice {selected.invoiceNumber}</h3>
            <Status>{statusOf(selected)}</Status>
          </header>
          <p>Submitted today, 10:32 AM by {selected.createdBy || 'Bola'}</p>
          <p>Store: {selected.store || 'Lekki'}</p>
        </section>
        <section>
          <h4>Customer</h4>
          <div className="invoice-drawer-customer">
            <i>♙</i>
            <span><strong>{selected.customer}</strong><small>ELITE Customer</small></span>
            <button>View Profile</button>
          </div>
        </section>
        <section>
          <h4>Invoice Summary</h4>
          <dl>
            <dt>Total Amount</dt><dd>{money.format(selected.total)}</dd>
            <dt>Elite Discount (5%)</dt><dd className="positive">- {money.format(Number(selected.total || 0) * .05)}</dd>
            <dt>Store Credit Used</dt><dd className="positive">- ₦0</dd>
            <dt className="total">Amount Payable</dt><dd className="total">{money.format(Number(selected.total || 0) * .95)}</dd>
          </dl>
        </section>
        <section>
          <header>
            <h4>Payment Status</h4>
            <Status>{selected.paymentStatus}</Status>
          </header>
          <dl>
            <dt>Amount Received</dt><dd>{money.format(selected.paid || 0)}</dd>
            <dt>Balance Outstanding</dt><dd>{money.format(Math.max(0, Number(selected.total || 0) * .95 - Number(selected.paid || 0)))}</dd>
            <dt>Payment Method</dt><dd>Bank Transfer</dd>
            <dt>Reference</dt><dd>GTBank – 0123045678</dd>
          </dl>
        </section>
        <section>
          <h4>Evidence</h4>
          {selected.paymentEvidence
            ? <div className="invoice-evidence">
                <span>✓</span>
                <p>Payment evidence uploaded<small>{selected.paymentEvidence.name}</small></p>
                {selected.paymentEvidence.dataUrl ? <img src={selected.paymentEvidence.dataUrl} alt="Payment evidence" /> : <i>▧</i>}
                <a href={selected.paymentEvidence.dataUrl} download={selected.paymentEvidence.name}>⇩</a>
              </div>
            : <div className="accounts-empty">
                {selected.paymentStatus === 'Unpaid' ? 'No evidence required for an unpaid invoice.' : 'No payment evidence uploaded.'}
              </div>}
        </section>
        <section>
          <h4>Order &amp; Production</h4>
          <dl>
            <dt>Order Sheet</dt><dd>Attached &nbsp;✓</dd>
            <dt>Production Status</dt><dd>Not Released &nbsp;●</dd>
          </dl>
        </section>
        <section className="invoice-drawer-actions">
          <h4>Actions</h4>
          <div>
            <button onClick={() => setPendingAction({ invoice: selected, status: 'Approved' })}>
              <CheckCircle size={15} /><span>Approve</span>
            </button>
            <button onClick={() => setPendingAction({ invoice: selected, status: 'Flagged' })}>
              <Flag size={15} /><span>Flag</span>
            </button>
            <button onClick={() => setPendingAction({ invoice: selected, status: 'Rejected' })}>
              ×<span>Reject</span>
            </button>
          </div>
          <button>▢ &nbsp; Message Store Manager</button>
          <button>▤ &nbsp; View Full Invoice</button>
        </section>
      </aside>
    )}

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
