import { money, invoiceApprovalStatus } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

export default function ReviewInvoicePage({ invoice, onBack, onReview }) {
  const total = Number(invoice.total || 0);
  const discount = total * .05;
  const payable = total - discount;
  const paid = Number(invoice.paid || (invoice.paymentStatus === 'Partial Paid' ? 25000 : invoice.paymentStatus === 'Fully Paid' ? payable : 0));
  const balance = Math.max(0, payable - paid);
  const status = invoiceApprovalStatus(invoice) === 'Pending Accounts' ? 'Awaiting Review' : invoiceApprovalStatus(invoice);
  const items = [
    ['Green Senator (Kaftan)', 1, 23000],
    ['Trouser (Green)', 1, 12000],
    ['Embroidery (Gold)', 1, Math.max(0, total - 35000)],
  ];

  return <div className="accounts-review-page">
    <header className="accounts-review-heading"><div><p>Accounts &nbsp;›&nbsp; Invoices &nbsp;›&nbsp; <strong>Review Invoice</strong></p><h2>Review Invoice {invoice.invoiceNumber} <Status>{status}</Status></h2><span>Review payment evidence and invoice details before approving.</span></div><div><button onClick={onBack}>‹ &nbsp; Back to Invoices</button><button>⋮</button></div></header>
    <section className="accounts-review-grid">
      <div className="accounts-review-left">
        <article className="review-card invoice-order-summary"><h3>Invoice &amp; Order Summary</h3><section className="review-invoice-facts"><i>▤</i><dl><dt>Invoice Number</dt><dd>{invoice.invoiceNumber}</dd></dl><dl><dt>Invoice Date</dt><dd>22 Jul 2026</dd></dl><dl><dt>Store</dt><dd>{invoice.store || 'Lekki'}</dd></dl></section><section className="review-customer-facts"><i>♙</i><dl><dt>Customer</dt><dd>{invoice.customer}</dd><small>ELITE CUSTOMER</small></dl><dl><dt>Phone</dt><dd>{invoice.phone || '0803 123 4567'}</dd></dl><dl><dt>Email</dt><dd>{invoice.customerEmail || 'jimmy.aki@gmail.com'}</dd></dl></section><h4>Order Summary</h4><table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>{items.map(([name, quantity, price]) => <tr key={name}><td>{name}</td><td>{quantity}</td><td>{money.format(price)}</td><td>{money.format(price * quantity)}</td></tr>)}</tbody></table><dl className="review-totals"><dt>Subtotal</dt><dd>{money.format(total)}</dd><dt>Elite Discount (5%)</dt><dd className="positive">- {money.format(discount)}</dd><dt>Store Credit Used</dt><dd className="positive">- ₦0</dd><dt>Total Amount</dt><dd>{money.format(payable)}</dd><dt>Amount Payable</dt><dd>{money.format(payable)}</dd></dl></article>
        <article className="review-card payment-history-card"><h3>Payment &amp; History</h3><div><dl><dt>Payment Status</dt><dd><Status>{invoice.paymentStatus}</Status></dd><dt>Amount Received</dt><dd>{money.format(paid)}</dd><dt>Balance Outstanding</dt><dd>{money.format(balance)}</dd><dt>Payment Method</dt><dd>Bank Transfer</dd><dt>Reference</dt><dd>GTBank – 0123045678</dd><dt>Submitted By</dt><dd>{invoice.createdBy || 'Bola'} (Store Manager)</dd><dt>Submitted On</dt><dd>22 Jul 2026, 10:32 AM</dd></dl><section><h4>Payment History</h4><div><i/><span><small>22 Jul 2026, 10:32 AM</small><p>Payment evidence submitted<br/>by Bola (Store Manager)</p></span><b>{money.format(paid)}</b></div><div><i/><span><small>—</small><p>Pending<br/>Balance outstanding</p></span><b>{money.format(balance)}</b></div></section></div></article>
      </div>
      <div className="accounts-review-middle">
        <article className="review-card payment-evidence-card"><header><h3>Payment Evidence</h3><span>✓ Evidence Uploaded</span></header><h4>Uploaded Receipt</h4><section className="receipt-preview"><header><strong>▰ &nbsp; GTBank</strong><b>Successful</b></header><h3>Transfer Receipt</h3><dl><dt>Reference Number</dt><dd>0123045678</dd><dt>Transaction Date</dt><dd>22 Jul 2026, 10:28 AM</dd><dt>Payer Name</dt><dd>{invoice.customer}</dd><dt>Payer Account</dt><dd>0123456789</dd><dt>Beneficiary</dt><dd>TWIF Collections</dd><dt>Beneficiary Account</dt><dd>GTB 0234567890</dd><dt>Amount</dt><dd>{money.format(paid)}</dd><dt>Narration</dt><dd>Payment for {invoice.invoiceNumber}</dd></dl><footer>Thank you for banking with us</footer><button>⛶</button></section><button className="download-receipt">⇩ &nbsp; Download Receipt</button></article>
        <article className="review-card review-notes"><h3>Additional Notes (from Store Manager)</h3><p>Customer paid part amount. Balance will be settled before production.</p></article>
      </div>
      <aside className="accounts-review-right">
        <article className="review-card review-actions-card"><h3>Review Actions</h3><button className="approve" onClick={() => onReview(invoice, 'Approved')}>✓<span><strong>Approve Invoice</strong><small>Mark as paid and release to production</small></span></button><button className="partial">⚑<span><strong>Partial Payment</strong><small>Record partial payment</small></span></button><button className="reject" onClick={() => onReview(invoice, 'Rejected')}>×<span><strong>Reject Invoice</strong><small>Reject and send back to store</small></span></button><button onClick={() => onReview(invoice, 'Flagged')}>⌕<span><strong>Flag for Clarification</strong><small>Request more info from store</small></span></button></article>
        <article className="review-card review-information"><h3>Review Information</h3><dl><dt>Submitted By</dt><dd>{invoice.createdBy || 'Bola'} (Store Manager)</dd><dt>Submitted On</dt><dd>22 Jul 2026, 10:32 AM</dd><dt>Store</dt><dd>{invoice.store || 'Lekki'}</dd><dt>Order Sheet</dt><dd className="positive">✓ Attached</dd><dt>Production Status</dt><dd>● Not Released</dd><dt>Days Since Submission</dt><dd>0 day</dd></dl></article>
        <article className="review-card review-activity"><h3>Activity Log</h3>{[['22 Jul 2026, 10:32 AM', 'Invoice submitted', `by ${invoice.createdBy || 'Bola'} (Store Manager)`], ['—', 'Under review', 'Pending action'], ['—', 'Awaiting approval', 'Will be sent to production']].map(([date, title, note], index) => <section key={title}><i className={`dot-${index}`}/><span><small>{date}</small><strong>{title}</strong><p>{note}</p></span></section>)}</article>
      </aside>
    </section>
    <footer className="review-waiting-note">ⓘ &nbsp; This invoice is currently awaiting your review. Once approved, it will be automatically sent to Production.</footer>
  </div>;
}
