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
