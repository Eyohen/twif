import { useEffect, useState } from 'react';
import { ArrowLeft, Download, CheckCircle, Package, CreditCard, Ruler, Clock, User, AlertCircle, Scissors, Layers, Image as ImageIcon, ClipboardList } from 'lucide-react';
import { api } from '../../lib/api';
import { money, formatMoment, amountReceived, invoicePayable, invoiceApprovalStatus, invoiceDocumentPayload, downloadInvoicePdf, daysUntilDue, dueDateLabel, toNumber } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import { DEPARTMENT_FIELDS } from '../../config/departmentFields';

const label = { fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' };
const outlineButton = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13,
  fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer', fontFamily: 'inherit',
};

// The invoice-focused Order Details page shows what was billed. This shows
// what was actually written down for Production to cut and sew from — every
// garment's own fabric, construction choices and style references, not just
// its name and a price.
export default function OrderSheetDetailsPage({ order, onBack, onEdit, backLabel = 'Back to Order Sheets' }) {
  const [notice, setNotice] = useState('');
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const sheet = order.orderSheet || order.job || {};
  // Computed here rather than trusted from the caller — a raw invoice off
  // `sentInvoices` carries `accountApprovalStatus`, not a ready-made
  // `approval` field, so relying on the caller to have derived one already
  // left this reading undefined and stuck on "Awaiting Production".
  const approval = order.approval || invoiceApprovalStatus(order);
  const status = approval === 'Pending Accounts'
    ? 'Pending Accounts'
    : sheet.status === 'Ready' ? 'Ready for Collection' : sheet.status || order.orderStatus || 'Awaiting Production';

  const payable = invoicePayable(order);
  const paid = amountReceived(order);
  const balance = paid === null ? null : Math.max(0, payable - paid);
  const asMoney = (value) => (value === null ? 'Not recorded' : money.format(value));

  const custInitials = (order.customer || '')
    .split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  // Every garment on the sheet, each with its own fabric, department and
  // style choices — the content an order sheet exists to carry. Older sheets
  // only ever saved one garment at the top level, so that is the fallback.
  const garments = Array.isArray(sheet.items) && sheet.items.length ? sheet.items : [{
    item: sheet.item, pieces: sheet.pieces, delivery: sheet.delivery,
    fabric: sheet.fabric, fabrics: sheet.fabrics, designNotes: sheet.designNotes,
    styleImages: sheet.styleImages, departments: [], departmentFields: {},
  }];

  const deliveryDate = sheet.delivery || order.deliveryDate || order.dueDate;
  const days = daysUntilDue(deliveryDate);
  const invoiceNotes = Array.isArray(order.notes) ? order.notes.filter(Boolean) : (order.notes ? [order.notes] : []);
  const orderNote = sheet.productionNote || invoiceNotes.join(' · ');

  const measurements = sheet.measurementDetails && typeof sheet.measurementDetails === 'object'
    ? Object.entries(sheet.measurementDetails).filter(([, value]) => String(value ?? '').trim())
    : [];
  const measurementNote = !measurements.length && sheet.measurements ? String(sheet.measurements) : '';

  const approved = approval === 'Approved';
  const inProduction = ['Assigned', 'In Progress'].includes(sheet.status);
  const ready = ['Ready', 'Ready for Collection', 'Completed'].includes(sheet.status);
  const steps = [
    ['Order Sheet Raised', order.createdBy ? `Raised by ${order.createdBy}` : `${order.store || 'Store'} store`, formatMoment(sheet.createdAt || order.createdAt), 'done'],
    ['Accounts Review', approved ? 'Approved by Accounts' : 'Waiting for Accounts', approved ? '—' : '', approved ? 'done' : 'current'],
    ['Assigned to Production', inProduction || ready ? `With ${sheet.tailor || 'a tailor'}` : 'Not assigned yet', '', inProduction || ready ? 'done' : approved ? 'current' : 'pending'],
    ['Ready for Collection', ready ? 'Ready for the customer' : 'Awaiting production', '', ready ? 'done' : 'pending'],
  ];

  const mayEdit = sheet.status === 'Order Sheet Confirmed';

  const saveInvoicePdf = async () => {
    setNotice('');
    try {
      const response = await api.post('/oms/invoices/html-preview', invoiceDocumentPayload(order), { responseType: 'text' });
      await downloadInvoicePdf(response.data, order.invoiceNumber);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to produce this invoice right now.');
    }
  };

  const facts = [
    { key: 'Invoice No.', value: order.invoiceNumber },
    { key: 'Delivery Date', value: deliveryDate ? formatMoment(deliveryDate) : 'Not set', sub: dueDateLabel(deliveryDate), subColor: days !== null && days < 0 ? '#8a3520' : '#8a7a6a' },
    { key: 'Production', status },
    { key: 'Tailor', value: sheet.tailor && sheet.tailor !== 'Unassigned' ? sheet.tailor : 'Unassigned' },
    { key: 'Garments', value: garments.length },
    { key: 'Total Pieces', value: garments.reduce((sum, item) => sum + (toNumber(item.pieces) || 1), 0) },
  ];

  const fabricLine = (fabric) => (fabric.clientSupplied
    ? `${fabric.name || 'Customer supplied'} — customer's own`
    : `${fabric.name || 'Fabric'}${fabric.quantity ? ` · ${fabric.quantity} ${fabric.unit || ''}`.trim() : ''}`);

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={onBack} style={outlineButton}>
            <ArrowLeft size={14} strokeWidth={2} />
            {backLabel}
          </button>
          <div className="os-page-title">
            <ClipboardList size={22} strokeWidth={1.8} />
            <div>
              <h2>Order Sheet Details</h2>
              <p>Every garment, fabric and construction detail raised for this order</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {mayEdit ? (
            <button type="button" onClick={() => onEdit?.(order.invoiceNumber)} style={{ ...outlineButton, background: '#1a1611', color: '#fff', borderColor: '#1a1611' }}>
              Edit Order Sheet
            </button>
          ) : null}
          <button type="button" onClick={saveInvoicePdf} style={outlineButton}>
            <Download size={13} strokeWidth={1.8} /> Download Invoice
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: '#fff5f0', border: '1px solid #f0c8b8', borderRadius: 8, color: '#8a3520', fontSize: 13 }}>
          <AlertCircle size={15} /> {notice}
        </div>
      )}

      {/* Header card */}
      <div className="os-card">
        <div className="os-card-head">
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: '#1a1611',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>{custInitials || '—'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 17, fontFamily: 'var(--font-display)', color: '#1a1611' }}>{order.customer}</strong>
              <Status>{status}</Status>
            </div>
            <div style={{ fontSize: 13, color: '#c97b08', fontWeight: 700, marginTop: 4 }}>
              {order.invoiceNumber}
              <span style={{ color: '#8a7a6a', fontWeight: 400, marginLeft: 12 }}>
                Raised {formatMoment(sheet.createdAt || order.createdAt)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#5a4e42', marginTop: 2 }}>
              {order.phone || sheet.phone || 'No phone recorded'} · {sheet.store || order.store || 'Store not set'}
            </div>
          </div>
        </div>

        <div className="order-facts-row">
          {facts.map(({ key, value, status: pill, sub, subColor }) => (
            <div className="order-fact" key={key}>
              <div style={label}>{key}</div>
              <div style={{ marginTop: 5 }}>
                {pill ? <Status>{pill}</Status> : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1611' }}>{value}</span>
                )}
              </div>
              {sub && <div style={{ fontSize: 11, color: subColor, fontWeight: 600, marginTop: 3 }}>{sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="os-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Special instructions */}
          <div className="os-card">
            <div className="os-card-head">
              <Package size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Special Instructions</strong>
                <p>Notes for Production, and the invoice&apos;s own notes</p>
              </div>
            </div>
            <div className="os-card-body">
              <div style={{ fontSize: 13, color: orderNote ? '#5a4e42' : '#8a7a6a', padding: '10px 12px', background: '#faf7f3', borderRadius: 8, border: '1px solid #eee5da' }}>
                {orderNote || 'None left with this order.'}
              </div>
            </div>
          </div>

          {/* Garments — the substance of an order sheet. */}
          {garments.map((garment, index) => {
            const fabrics = Array.isArray(garment.fabrics) && garment.fabrics.length
              ? garment.fabrics
              : (garment.fabric ? [{ name: garment.fabric, unit: garment.fabricUnit, quantity: garment.fabricUsage }] : []);
            const departments = garment.departments || [];
            const images = (garment.styleImages || []).filter(Boolean);
            return (
              <div className="os-card" key={`${garment.item}-${index}`}>
                <div className="os-card-head">
                  <span className="os-step-num">{index + 1}</span>
                  <div>
                    <strong>{garment.item || `Garment ${index + 1}`}</strong>
                    <p>{toNumber(garment.pieces) || 1} piece{(toNumber(garment.pieces) || 1) === 1 ? '' : 's'}{garment.delivery ? ` · Delivery ${formatMoment(garment.delivery)}` : ''}</p>
                  </div>
                  <Scissors size={16} strokeWidth={1.5} style={{ color: '#c0a87a', marginLeft: 'auto' }} />
                </div>
                <div className="os-card-body" style={{ gap: 16 }}>
                  {/* Fabric */}
                  <div>
                    <div style={label}>Fabric</div>
                    {fabrics.length ? (
                      <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                        {fabrics.map((fabric, fabricIndex) => (
                          <li key={fabricIndex} style={{ fontSize: 13, color: '#1a1611', padding: '7px 10px', background: '#faf7f3', borderRadius: 6, border: '1px solid #eee5da' }}>
                            {fabricLine(fabric)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8a7a6a' }}>Not allocated yet — Production or Inventory will choose.</p>
                    )}
                  </div>

                  {/* Departments and their construction/style fields */}
                  {departments.length ? departments.map((departmentKey) => {
                    const config = DEPARTMENT_FIELDS[departmentKey];
                    const values = garment.departmentFields?.[departmentKey] || {};
                    return (
                      <div key={departmentKey}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Layers size={13} strokeWidth={1.8} style={{ color: '#c97b08' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#c97b08', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {config?.label || departmentKey}
                          </span>
                        </div>
                        {config?.fields?.length ? (
                          <div className="os-grid-3">
                            {config.fields.map((field) => (
                              <div key={field.key}>
                                <div style={label}>{field.label}</div>
                                <div style={{ fontSize: 13, color: values[field.key] ? '#1a1611' : '#b0a090', fontWeight: 600, marginTop: 3 }}>
                                  {values[field.key] || 'Not filled in'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13, color: '#8a7a6a' }}>No fields configured for this department.</p>
                        )}
                      </div>
                    );
                  }) : (
                    <div>
                      <div style={label}>Department</div>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8a7a6a' }}>No department assigned to this garment yet.</p>
                    </div>
                  )}

                  {/* Design notes */}
                  {garment.designNotes ? (
                    <div>
                      <div style={label}>Design Notes</div>
                      <div style={{ fontSize: 13, color: '#5a4e42', marginTop: 4, padding: '9px 11px', background: '#faf7f3', borderRadius: 8, border: '1px solid #eee5da' }}>
                        {garment.designNotes}
                      </div>
                    </div>
                  ) : null}

                  {/* Style reference images */}
                  {images.length ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <ImageIcon size={13} strokeWidth={1.8} style={{ color: '#8a7a6a' }} />
                        <span style={label}>Style References</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {images.map((image, imageIndex) => (
                          <a key={imageIndex} href={image.dataUrl} target="_blank" rel="noreferrer" title={image.label || image.name}>
                            <img
                              src={image.dataUrl}
                              alt={image.label || `Style reference ${imageIndex + 1}`}
                              style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee5da' }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Payment Summary */}
          <div className="os-card">
            <div className="os-card-head">
              <CreditCard size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Payment Summary</strong>
                <p>Breakdown of invoice and payments received</p>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {[
                ['Invoice Total', money.format(payable), '#1a1611', false],
                ['Amount Paid', asMoney(paid), paid === null ? '#8a7a6a' : '#2a7d4f', false],
                ['Balance Remaining', asMoney(balance), balance === null ? '#8a7a6a' : balance > 0 ? '#8a3520' : '#2a7d4f', true],
                ['Payment Method', order.paymentMethod || '—', '#1a1611', false],
              ].map(([name, value, color, bold]) => (
                <div key={name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  padding: '11px 2px', borderBottom: '1px solid #f3ede5',
                }}>
                  <span style={{ fontSize: 13, color: '#5a4e42', fontWeight: bold ? 700 : 400 }}>{name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="os-sidebar">
          {/* Production Progress */}
          <div className="os-card">
            <div className="os-card-head">
              <Package size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Production Progress</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {steps.map(([name, note, when, state]) => (
                <div key={name} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: state === 'done' ? '#f0faf4' : state === 'current' ? '#fffbf0' : '#f5f0e8',
                    border: `2px solid ${state === 'done' ? '#2a7d4f' : state === 'current' ? '#c97b08' : '#ddd5c8'}`,
                  }}>
                    {state === 'done' ? <CheckCircle size={13} strokeWidth={2} style={{ color: '#2a7d4f' }} />
                      : state === 'current' ? <Package size={13} strokeWidth={2} style={{ color: '#c97b08' }} />
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ddd5c8' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: state === 'pending' ? '#8a7a6a' : '#1a1611' }}>{name}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{note}</div>
                    {when && when !== '—' ? <div style={{ fontSize: 11, color: '#b0a090', marginTop: 3 }}>{when}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="os-card">
            <div className="os-card-head">
              <Clock size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Activity</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {[
                [formatMoment(sheet.createdAt || order.createdAt), order.createdBy ? `Order sheet raised by ${order.createdBy}` : 'Order sheet raised', '#3a5098'],
                ...(approved ? [['—', 'Approved by Accounts', '#2a7d4f']] : []),
                ...(sheet.tailor && sheet.tailor !== 'Unassigned' ? [['—', `Assigned to ${sheet.tailor}`, '#7a6030']] : []),
                ...(ready ? [['—', 'Marked ready for collection', '#2a7d4f']] : []),
              ].map(([when, text, color]) => (
                <div key={text} style={{ display: 'flex', gap: 10, paddingBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>{when}</div>
                    <div style={{ fontSize: 13, color: '#1a1611', fontWeight: 500, marginTop: 2 }}>{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Measurements */}
          <div className="os-summary-card">
            <header>
              <Ruler size={15} strokeWidth={1.8} />
              <h3>Measurements</h3>
            </header>
            {measurements.length ? (
              <dl>
                {measurements.map(([name, value]) => (
                  <div key={name} style={{ display: 'contents' }}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : measurementNote ? (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#5a4e42', lineHeight: 1.6 }}>{measurementNote}</p>
            ) : (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#8a7a6a' }}>
                No measurements are attached to this order.
              </p>
            )}
          </div>

          {/* Customer */}
          <div className="os-card">
            <div className="os-card-head">
              <User size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Customer</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 8 }}>
              {[
                ['Name', order.customer || '—'],
                ['Phone', order.phone || sheet.phone || '—'],
                ['Email', order.email || '—'],
              ].map(([name, value]) => (
                <div key={name}>
                  <div style={label}>{name}</div>
                  <div style={{ fontSize: 13, color: '#1a1611', marginTop: 2, overflowWrap: 'anywhere' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div style={{ paddingTop: 8 }}>
        <button type="button" onClick={onBack} style={{ ...outlineButton, padding: '10px 18px' }}>
          <ArrowLeft size={14} strokeWidth={2} /> {backLabel}
        </button>
      </div>
    </div>
  );
}
