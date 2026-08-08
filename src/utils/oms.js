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

// What the customer is shown on their tracking page. Anything that was not
// Ready used to read as In Progress, so an order sat there claiming to be on a
// tailor's table from the moment the invoice was sent. Work is only in progress
// once a tailor has started it.
export const customerStatus = (status) => {
  if (status === 'Ready' || status === 'Ready for Collection') return 'Ready for Collection';
  if (status === 'In Progress') return 'In Progress';
  return 'Order Received';
};

export const CUSTOMER_TRACKING_STEPS = ['Order Received', 'In Progress', 'Ready for Collection'];

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

// Invoice dates arrive either as a full timestamp or as a plain calendar date.
// Formatting the second kind with a time prints a midnight that nobody entered
// — and, once the timezone is applied, one that reads as 01:00.
export const formatMoment = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dateOnly = typeof value === 'string' && !/\d:\d/.test(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit' }),
  });
};

// Whole days between now and a delivery date. Order lists were labelling rows
// from their position in the table — the fourth row and beyond read "Overdue"
// whatever its date said, and the first three counted down 4, 3, 2 days.
export const daysUntilDue = (value) => {
  if (!value) return null;
  const raw = String(value);
  const due = new Date(raw.length <= 10 ? `${raw.slice(0, 10)}T23:59:59` : raw);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - Date.now()) / 86400000);
};

export const dueDateLabel = (value) => {
  const days = daysUntilDue(value);
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
};

// What the invoice is actually payable at, once its discounts are applied.
export const invoicePayable = (invoice) => Math.max(
  0,
  toNumber(invoice?.total) - toNumber(invoice?.eliteDiscountAmount) - toNumber(invoice?.storeCreditApplied),
);

// An invoice carries a payment status but no figure for what was handed over,
// so a part payment's amount is genuinely unknown — null says so rather than
// letting the screens fill the gap with a number nobody recorded.
export const amountReceived = (invoice) => {
  const recordedAmount = [
    invoice?.paid,
    invoice?.amountPaid,
    invoice?.amountReceived,
    invoice?.paymentAmount,
    invoice?.payload?.paid,
    invoice?.payload?.amountPaid,
    invoice?.payload?.amountReceived,
    invoice?.payload?.paymentAmount,
  ].find((value) => value !== undefined && value !== null && value !== '');
  if (recordedAmount !== undefined) return toNumber(recordedAmount);
  if (isFullyPaid(invoice)) return invoicePayable(invoice);
  if (isAwaitingPayment(invoice)) return 0;
  return null;
};

// Outstanding is only certain when the received amount is; a part-paid invoice
// owes somewhere between everything and nothing.
export const amountOutstanding = (invoice) => {
  const received = amountReceived(invoice);
  return received === null ? null : Math.max(0, invoicePayable(invoice) - received);
};

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

// A tab has to be opened inside the click itself. Opened after an await — once
// the invoice HTML has come back from the server — the browser treats it as an
// unrequested popup and blocks it, so nothing happens at all.
export const openDocumentTab = () => {
  try {
    return window.open('', '_blank');
  } catch {
    return null;
  }
};

// Shows the invoice as a document the reader can then print or save.
//
// This used to go straight to a hidden iframe and call print() on it. On a
// phone that frequently does nothing whatsoever, and because the iframe is
// invisible there is no way to tell a silent failure from a dead button — which
// is how it was reported. Opening the document in a tab always shows something;
// on a desktop the print dialog still follows automatically.
export const presentInvoiceDocument = (html, invoiceNumber = 'invoice', tab = null) => {
  if (tab && !tab.closed) {
    tab.document.open();
    tab.document.write(html);
    tab.document.close();
    try { tab.document.title = invoiceNumber; } catch { /* cross-origin guard */ }

    const isTouch = typeof window !== 'undefined'
      && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
    if (!isTouch) {
      // The document has to have laid out before it can be printed.
      tab.addEventListener?.('load', () => tab.print?.());
      window.setTimeout(() => { try { tab.print?.(); } catch { /* dismissed */ } }, 400);
    }
    return 'tab';
  }

  // Popup blocked: fall back to the hidden frame rather than doing nothing.
  printInvoiceHtml(html, invoiceNumber);
  return 'print';
};

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

export const PERIOD_OPTIONS = [
  ['today', 'Today'],
  ['week', 'This Week'],
  ['month', 'This Month'],
  ['year', 'This Year'],
  ['all', 'All Time'],
];

// Shared by the dashboard's overall filter and by each panel's own selector.
// `getDate` pulls the date off a record, since invoices and production jobs
// carry theirs under different names.
export const filterByPeriod = (records, getDate, period, customFrom, customTo) => {
  if (period === 'all') return records;

  const today = todayIso();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const on = (record) => String(getDate(record) || '').slice(0, 10);

  if (period === 'today') return records.filter((record) => on(record) === today);
  if (period === 'week') return records.filter((record) => getDate(record) && new Date(getDate(record)) >= weekAgo);
  if (period === 'month') return records.filter((record) => on(record) >= monthStart);
  if (period === 'year') return records.filter((record) => on(record) >= yearStart);
  if (period === 'custom' && customFrom) {
    return records.filter((record) => {
      const date = on(record);
      return date >= customFrom && (!customTo || date <= customTo);
    });
  }
  return records;
};

// Buckets a period's records into columns for the dashboard chart, so the bars
// move with the selected range instead of being a fixed decorative shape.
export const periodTrend = (records, period, buckets = 11) => {
  const now = new Date();
  const spanDays = period === 'today' ? 1 : period === 'week' ? 7 : period === 'year' ? 365 : 30;
  const totals = new Array(buckets).fill(0);

  records.forEach((record) => {
    const when = new Date(record.createdAt);
    if (Number.isNaN(when.getTime())) return;
    const daysAgo = (now - when) / 86400000;
    const index = buckets - 1 - Math.floor((daysAgo / spanDays) * buckets);
    if (index >= 0 && index < buckets) totals[index] += toNumber(record.total);
  });

  const peak = Math.max(...totals, 1);
  return totals.map((value) => ({ value, height: Math.max(4, Math.round((value / peak) * 100)) }));
};
