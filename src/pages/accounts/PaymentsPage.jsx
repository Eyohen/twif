import { useMemo, useState } from 'react';
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
  const filtered = useMemo(() => payments.filter((payment) => {
    const queryMatch = `${payment.customer} ${payment.invoiceNumber} ${payment.reference}`.toLowerCase().includes(search.toLowerCase());
    const tabMatch = tab === 'All Payments' || (tab === 'Full Payments' && payment.status === 'Paid') || (tab === 'Partial Payments' && payment.status === 'Partial Paid') || (tab === 'Unpaid' && payment.status === 'Unpaid') || ['Today', 'This Week'].includes(tab);
    return queryMatch && tabMatch;
  }), [payments, search, tab]);
  const paid = payments.filter((item) => item.status === 'Paid');
  const partial = payments.filter((item) => item.status === 'Partial Paid');
  const cash = payments.filter((item) => item.method === 'Cash');
  const bank = payments.filter((item) => item.method === 'Bank Transfer');
  const received = payments.reduce((sum, item) => sum + item.received, 0);

  return <div className="accounts-payments-page">
    <header className="accounts-payments-toolbar"><label>▣ &nbsp; 22 Jul – 22 Jul 2026 &nbsp;⌄</label><button>⇩ &nbsp; Export</button></header>
    <section className="accounts-payments-layout">
      <main>
        <section className="payment-kpis">{[
          ['▣', 'Total Payments', payments.length, received, 'purple', 'Across all methods'],
          ['✓', 'Paid in Full', paid.length, paid.reduce((sum, item) => sum + item.received, 0), 'green', `${payments.length ? Math.round(paid.length / payments.length * 100) : 0}% of total`],
          ['◔', 'Partial Payments', partial.length, partial.reduce((sum, item) => sum + item.received, 0), 'orange', `${payments.length ? Math.round(partial.length / payments.length * 100) : 0}% of total`],
          ['▤', 'Cash Payments', cash.length, cash.reduce((sum, item) => sum + item.received, 0), 'green', `${payments.length ? Math.round(cash.length / payments.length * 100) : 0}% of total`],
          ['▥', 'Bank Transfers', bank.length, bank.reduce((sum, item) => sum + item.received, 0), 'blue', `${payments.length ? Math.round(bank.length / payments.length * 100) : 0}% of total`],
        ].map(([icon, label, count, amount, tone, detail]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{count}</strong></span><b>{money.format(amount)}</b><p>{detail}</p></article>)}</section>
        <section className="payments-register">
          <header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by customer, invoice or reference..." /></label><select><option>Payment Method</option></select><select><option>Payment Status</option></select><select><option>Store</option></select><button>⌁ &nbsp; More Filters &nbsp;▽</button></header>
          <nav>{[['All Payments', payments.length], ['Today', 6], ['This Week', 18], ['Full Payments', paid.length], ['Partial Payments', partial.length], ['Unpaid', payments.filter((item) => item.status === 'Unpaid').length]].map(([label, count]) => <button className={tab === label ? 'active' : ''} onClick={() => setTab(label)} key={label}>{label}<b>{count}</b></button>)}</nav>
          <div className="payments-table"><table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Store</th><th>Amount Received</th><th>Method</th><th>Status</th><th>Reference</th><th>Actions</th></tr></thead><tbody>{filtered.slice(0, 8).map((payment) => <tr key={payment.invoiceNumber}><td>{payment.date}<small>{payment.time}</small></td><td><strong>{payment.invoiceNumber}</strong></td><td>{payment.customer}{['Jimmy Aki', 'Henry Eyo', 'Bola Adebayo'].includes(payment.customer) && <small className="elite">ELITE</small>}</td><td>{payment.store}</td><td><strong>{money.format(payment.received)}</strong><small>of {money.format(payment.total)}</small></td><td><span className={`payment-method ${payment.method === 'Cash' ? 'cash' : ''}`}>{payment.method === 'Cash' ? '▤' : payment.method === 'Card' ? '▣' : '▥'}</span>{payment.method}</td><td><Status>{payment.status}</Status></td><td>{payment.reference}</td><td><button>⋮</button></td></tr>)}</tbody></table></div>
          <footer><span>Showing {filtered.length ? 1 : 0} to {Math.min(8, filtered.length)} of {payments.length} payments</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>4</button><button>›</button></div></footer>
        </section>
      </main>
      <aside className="payments-summary-side">
        <article><h3>Payment Summary</h3><div className="payment-summary-donut"><i/><ul><li><em className="paid"/>Paid in Full <span>{paid.length}</span><b>{money.format(paid.reduce((sum, item) => sum + item.received, 0))}</b></li><li><em className="partial"/>Partial Paid <span>{partial.length}</span><b>{money.format(partial.reduce((sum, item) => sum + item.received, 0))}</b></li><li><em/>Unpaid <span>{payments.filter((item) => item.status === 'Unpaid').length}</span><b>{money.format(payments.filter((item) => item.status === 'Unpaid').reduce((sum, item) => sum + item.total, 0))}</b></li><li><em className="overdue"/>Overdue <span>2</span><b>₦94,000</b></li></ul></div><footer>Total Received <b>{money.format(received)}</b></footer></article>
        <article className="top-methods"><h3>Top Payment Methods</h3>{[['Bank Transfer', bank.length, bank.reduce((sum, item) => sum + item.received, 0)], ['Cash', cash.length, cash.reduce((sum, item) => sum + item.received, 0)], ['Card', 0, 0]].map(([label, count, amount], index) => <section key={label}><span>{label}<b>{count} ({payments.length ? Math.round(count / payments.length * 100) : 0}%)</b><strong>{money.format(amount)}</strong></span><i style={{ '--bar-width': `${index === 0 ? 82 : index === 1 ? 28 : 0}%` }}/></section>)}</article>
        <article className="payment-quick-actions"><h3>Quick Actions</h3>{[['▤', 'Record Manual Payment', 'Add payment not from store'], ['▤', 'Match Payment to Invoice', 'Link unallocated payments'], ['▣', 'Generate Payment Report', 'Download payments summary'], ['⇩', 'Bulk Upload Payments', 'Upload payment records (CSV)']].map(([icon, title, detail]) => <button key={title}><i>{icon}</i><span><strong>{title}</strong><small>{detail}</small></span><b>›</b></button>)}</article>
      </aside>
    </section>
  </div>;
}
