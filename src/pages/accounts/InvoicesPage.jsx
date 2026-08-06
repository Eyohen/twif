import { useMemo, useState } from 'react';
import { money, invoiceApprovalStatus } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import ReviewInvoicePage from './ReviewInvoicePage';

const demoInvoices = [
  ['INV30659', 'Jimmy Aki', 'Lekki', 43000, 'Partial Paid', 'Pending Accounts', 'Today, 10:32 AM', 'Bola'],
  ['INV65761', 'Henry Eyo', 'Lekki', 15000, 'Fully Paid', 'Approved', 'Today, 9:15 AM', 'Bola'],
  ['INV74120', 'Olive Lawrence', 'Ikoyi', 82000, 'Unpaid', 'Awaiting Payment', 'Yesterday, 4:20 PM', 'Grace'],
  ['INV35943', 'Bola Adebayo', 'VI', 64000, 'Partial Paid', 'Flagged', 'Yesterday, 2:10 PM', 'Tunde'],
  ['INV12890', 'Kelechi Okafor', 'Lekki', 25000, 'Unpaid', 'Awaiting Payment', '21 Jul 2026, 6:30 PM', 'Bola'],
  ['INV99320', 'David Martins', 'Ikeja', 103000, 'Fully Paid', 'Approved', '21 Jul 2026, 11:05 AM', 'Grace'],
  ['INV55678', 'Aisha Bello', 'Lekki', 37400, 'Partial Paid', 'Pending Accounts', '20 Jul 2026, 3:45 PM', 'Bola'],
  ['INV44321', 'Tomi Ajayi', 'Ikoyi', 18000, 'Unpaid', 'Awaiting Payment', '20 Jul 2026, 9:00 AM', 'Tunde'],
].map(([invoiceNumber, customer, store, total, paymentStatus, approvalStatus, submitted, createdBy]) => ({
  invoiceNumber, customer, store, total, paymentStatus, accountApprovalStatus: approvalStatus,
  submitted, createdBy, paid: paymentStatus === 'Partial Paid' ? Math.round(total * .58) : paymentStatus === 'Fully Paid' ? total : 0,
}));

export default function AccountsInvoicesPage({ sentInvoices = [], onApproveInvoice }) {
  const invoices = sentInvoices.length >= 5 ? sentInvoices : demoInvoices;
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Invoices');
  const [selected, setSelected] = useState(invoices[0] || null);
  const [reviewInvoice, setReviewInvoice] = useState(null);
  const statusOf = (invoice) => invoiceApprovalStatus(invoice) === 'Pending Accounts' ? 'Awaiting Review' : invoiceApprovalStatus(invoice);
  const filtered = useMemo(() => invoices.filter((invoice) => {
    const status = statusOf(invoice);
    const matchesSearch = `${invoice.invoiceNumber} ${invoice.customer}`.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === 'All Invoices' || status === tab || invoice.paymentStatus === tab;
    return matchesSearch && matchesTab;
  }), [invoices, search, tab]);
  const awaiting = invoices.filter((invoice) => statusOf(invoice) === 'Awaiting Review');
  const approved = invoices.filter((invoice) => statusOf(invoice) === 'Approved');
  const flagged = invoices.filter((invoice) => statusOf(invoice) === 'Flagged');
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total || 0) - Number(invoice.paid || 0)), 0);

  const review = (invoice, status) => {
    onApproveInvoice?.(invoice.invoiceNumber, status);
    setSelected((current) => current?.invoiceNumber === invoice.invoiceNumber ? { ...current, accountApprovalStatus: status } : current);
  };

  if (reviewInvoice) {
    return <ReviewInvoicePage invoice={reviewInvoice} onBack={() => setReviewInvoice(null)} onReview={(invoice, status) => {
      review(invoice, status);
      setReviewInvoice({ ...invoice, accountApprovalStatus: status });
    }} />;
  }

  return <div className={`accounts-invoices-page ${selected ? 'drawer-open' : ''}`}>
    <div className="accounts-invoice-main">
      <header className="accounts-invoice-heading"><div><p>Accounts &nbsp;/&nbsp; <strong>Invoices</strong></p><h2>Invoices</h2><span>Review, approve and manage customer invoices before they enter production.</span></div><label>▣ &nbsp; 22 Jul – 22 Jul 2026 &nbsp;⌄</label></header>
      <section className="accounts-invoice-kpis">{[
        ['▤', 'Awaiting Review', awaiting.length, awaiting.reduce((sum, item) => sum + Number(item.total || 0), 0), 'gold'],
        ['✓', 'Approved Today', approved.length, approved.reduce((sum, item) => sum + Number(item.total || 0), 0), 'green'],
        ['⚑', 'Flagged', flagged.length, flagged.reduce((sum, item) => sum + Number(item.total || 0), 0), 'red'],
        ['▣', 'Total Outstanding', money.format(outstanding), '↑ 18.7% vs last 30 days', 'chart'],
      ].map(([icon, label, value, detail, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong><p>{typeof detail === 'number' ? money.format(detail) : detail} <em>{typeof detail === 'number' ? 'Total Amount' : ''}</em></p></span></article>)}</section>
      <section className="accounts-invoice-register">
        <header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or customer..." /></label><select><option>Payment Status</option></select><select><option>Store</option></select><select><option>▣ &nbsp; All Dates</option></select><select><option>Sort by: Newest</option></select><button>⇩ &nbsp; Export</button></header>
        <nav>{[['All Invoices', invoices.length], ['Awaiting Review', awaiting.length], ['Awaiting Payment', invoices.filter((i) => statusOf(i) === 'Awaiting Payment').length], ['Partial Paid', invoices.filter((i) => i.paymentStatus === 'Partial Paid').length], ['Approved', approved.length], ['Flagged', flagged.length], ['Rejected', invoices.filter((i) => statusOf(i) === 'Rejected').length]].map(([label, count]) => <button className={tab === label ? 'active' : ''} onClick={() => setTab(label)} key={label}>{label}<b>{count}</b></button>)}</nav>
        <div className="accounts-invoice-table"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Store</th><th>Amount</th><th>Payment</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{filtered.slice(0, 8).map((invoice) => {
          const status = statusOf(invoice);
          return <tr className={selected?.invoiceNumber === invoice.invoiceNumber ? 'selected' : ''} key={invoice.invoiceNumber}><td><strong>{invoice.invoiceNumber}</strong></td><td><strong>{invoice.customer}</strong>{['Jimmy Aki', 'Henry Eyo'].includes(invoice.customer) && <small>ELITE</small>}</td><td>{invoice.store || 'Lekki'}</td><td><strong>{money.format(invoice.total)}</strong></td><td><Status>{invoice.paymentStatus}</Status></td><td><Status>{status}</Status></td><td>{invoice.submitted || 'Today'}<small>by {invoice.createdBy || 'Bola'}</small></td><td><button onClick={() => setReviewInvoice(invoice)}>{status === 'Awaiting Review' ? 'Review' : status === 'Flagged' ? 'Resolve' : 'View'}</button><button className="dots" onClick={() => setSelected(invoice)}>⋮</button></td></tr>;
        })}</tbody></table></div>
        <div className="owner-mobile-invoice-list">{filtered.slice(0, 8).map((invoice) => {
          const status = statusOf(invoice);
          return <article key={invoice.invoiceNumber}>
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
              <button type="button" onClick={() => setReviewInvoice(invoice)}>{status === 'Awaiting Review' ? 'Review' : status === 'Flagged' ? 'Resolve' : 'View'} &nbsp;›</button>
            </footer>
          </article>;
        })}{!filtered.length ? <div className="accounts-empty">No invoices match this view.</div> : null}</div>
        <footer><span>Showing {filtered.length ? 1 : 0} to {Math.min(8, filtered.length)} of {invoices.length} invoices</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>6</button><button>›</button></div></footer>
      </section>
    </div>
    {selected && <aside className="accounts-invoice-drawer">
      <button className="drawer-close" onClick={() => setSelected(null)}>×</button>
      <section><header><h3>Invoice {selected.invoiceNumber}</h3><Status>{statusOf(selected)}</Status></header><p>Submitted today, 10:32 AM by {selected.createdBy || 'Bola'}</p><p>Store: {selected.store || 'Lekki'}</p></section>
      <section><h4>Customer</h4><div className="invoice-drawer-customer"><i>♙</i><span><strong>{selected.customer}</strong><small>ELITE Customer</small></span><button>View Profile</button></div></section>
      <section><h4>Invoice Summary</h4><dl><dt>Total Amount</dt><dd>{money.format(selected.total)}</dd><dt>Elite Discount (5%)</dt><dd className="positive">- {money.format(Number(selected.total || 0) * .05)}</dd><dt>Store Credit Used</dt><dd className="positive">- ₦0</dd><dt className="total">Amount Payable</dt><dd className="total">{money.format(Number(selected.total || 0) * .95)}</dd></dl></section>
      <section><header><h4>Payment Status</h4><Status>{selected.paymentStatus}</Status></header><dl><dt>Amount Received</dt><dd>{money.format(selected.paid || 0)}</dd><dt>Balance Outstanding</dt><dd>{money.format(Math.max(0, Number(selected.total || 0) * .95 - Number(selected.paid || 0)))}</dd><dt>Payment Method</dt><dd>Bank Transfer</dd><dt>Reference</dt><dd>GTBank – 0123045678</dd></dl></section>
      <section><h4>Evidence</h4>{selected.paymentEvidence ? <div className="invoice-evidence"><span>✓</span><p>Payment evidence uploaded<small>{selected.paymentEvidence.name}</small></p>{selected.paymentEvidence.dataUrl ? <img src={selected.paymentEvidence.dataUrl} alt="Payment evidence"/> : <i>▧</i>}<a href={selected.paymentEvidence.dataUrl} download={selected.paymentEvidence.name}>⇩</a></div> : <div className="accounts-empty">{selected.paymentStatus === 'Unpaid' ? 'No evidence required for an unpaid invoice.' : 'No payment evidence uploaded.'}</div>}</section>
      <section><h4>Order & Production</h4><dl><dt>Order Sheet</dt><dd>Attached &nbsp;✓</dd><dt>Production Status</dt><dd>Not Released &nbsp;●</dd></dl></section>
      <section className="invoice-drawer-actions"><h4>Actions</h4><div><button onClick={() => review(selected, 'Approved')}>✓<span>Approve</span></button><button onClick={() => review(selected, 'Flagged')}>⚑<span>Flag</span></button><button onClick={() => review(selected, 'Rejected')}>×<span>Reject</span></button></div><button>▢ &nbsp; Message Store Manager</button><button>▤ &nbsp; View Full Invoice</button></section>
    </aside>}
  </div>;
}
