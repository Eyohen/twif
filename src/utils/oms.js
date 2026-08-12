export const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export const todayIso = () => new Date().toISOString().slice(0, 10);

// An invoice stands for 48 hours, so its due date is derived from the day it
// was raised rather than typed in.
export const addDaysIso = (iso, days) => {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

// Whether a customer is on the elite tier. The tier is set on the customer's
// profile by an Owner or Admin, and the discount follows from it — it is not
// something a store manager applies by hand on the invoice.
export const isEliteCustomer = (customer) => /elite/i.test(String(customer?.category || ''));
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

// The share of an invoice that has been paid, measured against what is payable
// rather than against the headline total.
export const DEFAULT_RELEASE_PERCENT = 70;

export const paidPercent = (invoice) => {
  const payable = invoicePayable(invoice);
  if (payable <= 0) return 100;
  return (toNumber(invoice?.paid) / payable) * 100;
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

// "Download PDF" opened a print dialog, which is not downloading. The invoice
// document is laid out off-screen at its own width, photographed, and written
// into a PDF the browser then saves — so the button produces a file.
//
// The libraries are pulled in only when the button is used: together they are
// about a megabyte, and most sessions never download an invoice.
export const downloadInvoicePdf = async (html, invoiceNumber = 'invoice') => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // Rendered in a real frame rather than a detached node: the invoice template
  // is a full document with its own <head>, and its layout depends on that.
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;';
  document.body.appendChild(frame);

  try {
    await new Promise((resolve) => {
      frame.onload = resolve;
      frame.srcdoc = html;
    });

    const view = frame.contentWindow;
    const body = view.document.body;
    // Give webfonts and images a moment, or they photograph as blank boxes.
    await view.document.fonts?.ready?.catch(() => {});
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    const canvas = await html2canvas(body, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      windowWidth: 820,
      height: body.scrollHeight,
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    const image = canvas.toDataURL('image/jpeg', 0.92);

    // A long invoice runs onto further pages rather than being squashed onto one.
    let remaining = imageHeight;
    let offset = 0;
    while (remaining > 0) {
      pdf.addImage(image, 'JPEG', 0, -offset, pageWidth, imageHeight);
      remaining -= pageHeight;
      offset += pageHeight;
      if (remaining > 0) pdf.addPage();
    }

    pdf.save(`${invoiceNumber}.pdf`);
    return 'downloaded';
  } finally {
    frame.remove();
  }
};

// Measurements can arrive as a written note or as named figures; either counts.
export const hasMeasurements = (job) => {
  if (job?.measurementDetails && typeof job.measurementDetails === 'object') {
    if (Object.values(job.measurementDetails).some((value) => String(value ?? '').trim())) return true;
  }
  return Boolean(String(job?.measurements ?? '').trim());
};

// What is keeping a job out of production, or null when nothing is.
//
// The rules, in the order they are checked:
//   1. Accounts have to have approved the invoice.
//   2. Enough of the invoice has to have been paid — the threshold is set in
//      Settings and defaults to 70%.
//   3. The garment has to have measurements, since a tailor cannot cut without.
//
// A reason rather than a boolean, so the board can say why a job is held
// instead of quietly leaving it out.
export const productionBlockReason = (job, invoices, releasePercent = DEFAULT_RELEASE_PERCENT) => {
  if (!job?.invoiceNumber) return null;
  const invoice = invoices.find((item) => item.invoiceNumber === job.invoiceNumber);

  if (!isInvoiceApproved(invoice)) return 'Awaiting Accounts approval';
  // An Owner or Admin has already sent this one through knowing it was held.
  if (job.productionOverride) return hasMeasurements(job) ? null : 'Measurements missing';

  if (!isFullyPaid(invoice)) {
    const percent = paidPercent(invoice);
    if (percent < releasePercent) {
      return percent > 0
        ? `Only ${Math.floor(percent)}% paid — ${releasePercent}% needed`
        : `Invoice unpaid — ${releasePercent}% needed`;
    }
  }
  if (!hasMeasurements(job)) return 'Measurements missing';
  return null;
};

// An order item can be shared between several tailors, so "is this mine?" is a
// question about the item list as well as the single name the board carries.
export const jobTailors = (job) => {
  const fromItems = (job?.items || []).flatMap((item) => item.tailors || []);
  const named = job?.tailor && job.tailor !== 'Unassigned' ? [job.tailor] : [];
  return [...new Set([...fromItems, ...named])];
};

export const worksOnJob = (job, tailorName) => (
  Boolean(tailorName) && jobTailors(job).includes(tailorName)
);

// Every score this tailor was given on this order, out of ten.
export const scoresForTailor = (job, tailorName) => (job?.items || [])
  .map((item) => item.scores?.[tailorName]?.score)
  .filter((score) => Number.isFinite(Number(score)))
  .map(Number);

// A tailor's average across a set of jobs, or null when nothing has been
// scored — an unscored tailor is not a tailor who scored zero.
export const averageScore = (jobs, tailorName) => {
  const scores = jobs.flatMap((job) => scoresForTailor(job, tailorName));
  if (!scores.length) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

export const canShowJobInProduction = (job, invoices, releasePercent) => (
  productionBlockReason(job, invoices, releasePercent) === null
);

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
  ['quarter', 'This Quarter'],
  ['year', 'This Year'],
  ['all', 'All Time'],
];

// The periods a tailor's log and the performance screens are read over.
export const LOG_PERIODS = [
  ['week', 'Week'],
  ['month', 'Month'],
  ['quarter', 'Quarter'],
  ['year', 'Year'],
  ['custom', 'Custom'],
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
  if (period === 'quarter') {
    const quarterStart = new Date();
    quarterStart.setMonth(Math.floor(quarterStart.getMonth() / 3) * 3, 1);
    const from = quarterStart.toISOString().slice(0, 10);
    return records.filter((record) => on(record) >= from);
  }
  if (period === 'year') return records.filter((record) => on(record) >= yearStart);
  if (period === 'custom' && customFrom) {
    return records.filter((record) => {
      const date = on(record);
      return date >= customFrom && (!customTo || date <= customTo);
    });
  }
  return records;
};

// Every KPI on the owner's dashboard carried a change figure — "↑ 18.7% vs last
// 30 days" — that was written into the source and never moved. To compare a
// period against the one before it, both windows have to be known.
export const periodWindow = (period, customFrom, customTo) => {
  if (period === 'all') return null;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === 'today') return { start, end };
  if (period === 'week') { start.setDate(start.getDate() - 6); return { start, end }; }
  if (period === 'month') { start.setDate(1); return { start, end }; }
  if (period === 'quarter') { start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1); return { start, end }; }
  if (period === 'year') { start.setMonth(0, 1); return { start, end }; }
  if (period === 'custom' && customFrom) {
    return {
      start: new Date(`${customFrom}T00:00:00`),
      end: new Date(`${customTo || todayIso()}T23:59:59`),
    };
  }
  return null;
};

// The window of the same length immediately before the one on screen.
export const previousWindow = (window) => {
  if (!window) return null;
  const span = window.end - window.start;
  const end = new Date(window.start.getTime() - 1);
  return { start: new Date(end.getTime() - span), end };
};

export const withinWindow = (records, getDate, window) => {
  if (!window) return [];
  return records.filter((record) => {
    const value = getDate(record);
    if (!value) return false;
    const at = new Date(value);
    return !Number.isNaN(at.valueOf()) && at >= window.start && at <= window.end;
  });
};

// "↑ 18.7%" against nothing at all is worse than saying there is nothing to
// compare with, so a period with no history returns null rather than a number.
export const changeAgainst = (now, before) => {
  if (before === 0) return now === 0 ? null : null;
  const percent = ((now - before) / Math.abs(before)) * 100;
  return { percent, up: percent >= 0 };
};

export const changeLabel = (change, unit = 'the period before') => {
  if (!change) return null;
  const arrow = change.up ? '↑' : '↓';
  return `${arrow} ${Math.abs(change.percent).toFixed(1)}% vs ${unit}`;
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
