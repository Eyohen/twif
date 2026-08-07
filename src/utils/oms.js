export const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const invoiceSeed = () => `INV${Math.floor(Math.random() * 90000) + 10000}`;
export const invoiceItemSeed = () => `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
export const trackingTokenSeed = () => Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8);
export const toNumber = (value) => Number(value) || 0;

export const dateInputValue = (value, fallback = todayIso()) => {
  if (!value) return fallback;
  return String(value).slice(0, 10);
};

export const customerStatus = (status) => {
  if (status === 'Ready' || status === 'Ready for Collection') return 'Ready for Collection';
  return 'In Progress';
};

export const paymentStatusLabels = {
  unpaid: 'Unpaid',
  partial_paid: 'Partial Paid',
  fully_paid: 'Fully Paid',
};

export const invoiceApprovalStatus = (invoice) => invoice?.accountApprovalStatus || 'Pending Accounts';
export const isInvoiceApproved = (invoice) => invoiceApprovalStatus(invoice) === 'Approved';

// The API only ever labels payment as Unpaid / Partial Paid / Fully Paid, but
// older records were written with looser wording, so both are accepted here.
const UNPAID_LABELS = ['Unpaid', 'Not Paid', 'Awaiting Payment'];
export const isAwaitingPayment = (invoice) => UNPAID_LABELS.includes(invoice?.paymentStatus);
export const isFullyPaid = (invoice) => ['Fully Paid', 'Paid'].includes(invoice?.paymentStatus);
export const isPartiallyPaid = (invoice) => invoice?.paymentStatus === 'Partial Paid';

const PAYMENT_STATUS_KEYS = { 'Fully Paid': 'fully_paid', Paid: 'fully_paid', Unpaid: 'unpaid', 'Not Paid': 'unpaid', 'Awaiting Payment': 'unpaid' };

// Rebuilds the request body the invoice HTML endpoint expects from a row in the
// sent-invoice list, so the document can be re-rendered away from the create screen.
export const invoiceDocumentPayload = (invoice) => ({
  store: invoice.storeKey || String(invoice.store || 'lekki').toLowerCase(),
  invoiceNumber: invoice.invoiceNumber,
  invoiceDate: invoice.invoiceDate || invoice.createdAt,
  dueDate: invoice.dueDate || invoice.deliveryDate || invoice.invoiceDate,
  customer: { name: invoice.customer, phone: invoice.phone || '', email: invoice.email || '' },
  items: invoice.items?.length ? invoice.items : [{ description: invoice.item || 'Custom order', quantity: invoice.pieces || 1, rate: toNumber(invoice.total), amount: toNumber(invoice.total) }],
  subtotal: invoice.subtotal || toNumber(invoice.total),
  eliteDiscountAmount: invoice.eliteDiscountAmount || 0,
  storeCreditApplied: invoice.storeCreditApplied || 0,
  balanceDue: invoice.balanceDue ?? toNumber(invoice.total),
  paymentStatus: invoice.paymentStatusKey || PAYMENT_STATUS_KEYS[invoice.paymentStatus] || 'partial_paid',
  paymentMethod: invoice.paymentMethodKey || String(invoice.paymentMethod || 'transfer').toLowerCase(),
  trackingToken: invoice.trackingToken,
  trackingUrl: invoice.trackingUrl,
  notes: invoice.notes,
});

// Prints the invoice document on its own. Printing the page directly would
// capture the surrounding app chrome — nav, buttons and all — inside the PDF.
export const printInvoiceHtml = (html, invoiceNumber = 'invoice') => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);

  const cleanUp = () => frame.remove();
  frame.onload = () => {
    const view = frame.contentWindow;
    view.document.title = invoiceNumber;
    view.focus();
    view.print();
    // Safari fires no afterprint for iframes, so fall back to a timer.
    view.addEventListener?.('afterprint', cleanUp);
    window.setTimeout(cleanUp, 60000);
  };
  frame.srcdoc = html;
};

export const canShowJobInProduction = (job, invoices) => {
  if (!job.invoiceNumber) return true;
  const invoice = invoices.find((item) => item.invoiceNumber === job.invoiceNumber);
  return isInvoiceApproved(invoice);
};

export const productionJobFromInvoice = (invoice) => {
  if (!invoice?.orderSheet) return null;
  const sheet = invoice.orderSheet;
  const styleImages = Array.isArray(sheet.styleImages) ? sheet.styleImages : [];
  return {
    id: sheet.id || `JOB-${invoice.invoiceNumber}`,
    invoiceNumber: invoice.invoiceNumber,
    trackingToken: sheet.trackingToken || invoice.trackingToken,
    trackingUrl: sheet.trackingUrl || invoice.trackingUrl,
    customer: sheet.customer || invoice.customer || '',
    phone: sheet.phone || '',
    store: sheet.store || invoice.store || 'Lekki',
    item: sheet.item || invoice.item || '',
    // Every garment on the order. Older sheets only carried a single item, so
    // fall back to synthesising a one-entry list from the top-level fields.
    items: Array.isArray(sheet.items) && sheet.items.length ? sheet.items : [{
      item: sheet.item || invoice.item || '',
      pieces: toNumber(sheet.pieces || invoice.pieces) || 1,
      delivery: sheet.delivery || dateInputValue(invoice.deliveryDate),
      fabric: sheet.fabric || '',
      measurements: sheet.measurements || '',
      designNotes: sheet.designNotes || '',
      styleImages: Array.isArray(sheet.styleImages) ? sheet.styleImages : [],
    }],
    pieces: toNumber(sheet.pieces || invoice.pieces) || 1,
    delivery: sheet.delivery || dateInputValue(invoice.deliveryDate),
    amount: toNumber(sheet.amount),
    paid: toNumber(sheet.paid),
    status: sheet.status || 'Order Sheet Confirmed',
    requiresAccountApproval: true,
    payment: sheet.payment || invoice.paymentStatus || 'Fully Paid',
    fabric: sheet.fabric || '',
    fabricId: sheet.fabricId || '',
    tailor: sheet.tailor || 'Unassigned',
    images: toNumber(sheet.images) || styleImages.length,
    styleImages,
    measurements: sheet.measurements || '',
    designNotes: sheet.designNotes || '',
    note: sheet.note || sheet.designNotes || invoice.itemNote || '',
    productionNote: sheet.productionNote || '',
    fabricConfirmed: Boolean(sheet.fabricConfirmed),
    fabricAllocated: Boolean(sheet.fabricAllocated),
    fabricUsage: sheet.fabricUsage || '',
    fabricUnit: sheet.fabricUnit || '',
    assignedAt: sheet.assignedAt || 'Pending assignment',
    updatedAt: sheet.updatedAt,
  };
};

export const mergeJobsByInvoice = (currentJobs, incomingJobs) => {
  const validIncoming = incomingJobs.filter(Boolean);
  if (!validIncoming.length) return currentJobs;
  const incomingInvoiceNumbers = new Set(validIncoming.map((job) => job.invoiceNumber));
  return [...validIncoming, ...currentJobs.filter((job) => !incomingInvoiceNumbers.has(job.invoiceNumber))];
};

export const classNames = (...items) => items.filter(Boolean).join(' ');
