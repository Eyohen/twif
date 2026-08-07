import { ArrowLeft, Edit3, Box, Tag, Sliders, TrendingUp, Building2, Phone, Mail, MapPin, Activity, AlignLeft } from 'lucide-react';
import { Status } from '../../components/oms/Common';

export default function ItemDetailsPage({ item, onBack, onEdit, approvalRequest }) {
  const quantity = Number(item.quantity || 0);
  const threshold = Number(item.lowStockThreshold || 5);
  const code = item.code || item.sku || 'FAB-001';
  const status = quantity <= 0 ? 'Out of Stock' : quantity <= threshold ? 'Low Stock' : 'In Stock';
  const movements = [
    ['22 Jul 2026, 09:42 AM', 'Allocation', 'ALLOC-8231', 'Allocated to Production', 'INV30659', 'OUT', '6.0 m', `${quantity.toFixed(1)} m`],
    ['21 Jul 2026, 04:15 PM', 'Adjustment', 'ADJ-00122', 'Stock adjustment', '(Correction)', 'IN', '1.5 m', '24.5 m'],
    ['19 Jul 2026, 10:30 AM', 'Allocation', 'ALLOC-8120', 'Allocated to Production', 'INV29871', 'OUT', '4.0 m', '23.0 m'],
    ['18 Jul 2026, 02:20 PM', 'Receipt', 'RCPT-7741', 'Received from supplier', 'SUP-004', 'IN', '25.0 m', '27.0 m'],
    ['15 Jul 2026, 11:05 AM', 'Adjustment', 'ADJ-00098', 'Damaged fabric removed', '', 'OUT', '2.0 m', '2.0 m'],
  ];

  return (
    <div className="inventory-item-details">
      <header className="item-detail-heading">
        <div>
          <p>
            <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ArrowLeft size={12} />Inventory
            </button>
            {' '}&nbsp;›&nbsp;{' '}Inventory List &nbsp;›&nbsp; <strong>Item Details</strong>
          </p>
          <h2>Item Details</h2>
          <span>View full information, stock levels and movement history for this item.</span>
        </div>
        <button onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Edit3 size={13} />Edit Item
        </button>
      </header>

      {approvalRequest && (
        <div className="pending-edit-banner">
          <Activity size={18} />
          <span>
            <strong>Edit request submitted</strong>
            <small>This item will remain unchanged until the Owner approves request #{String(approvalRequest.id).slice(0, 8)}.</small>
          </span>
          <Status>Pending Owner Approval</Status>
        </div>
      )}

      <section className="item-detail-hero">
        <i className="item-detail-swatch" />
        <div className="item-detail-identity">
          <h2>{item.name}</h2>
          <b>{code}</b>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{item.type || 'Suiting'}</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd>
                <i className="color-dot" style={{ background: item.color?.toLowerCase().replace('navy blue', '#193454') || '#333', display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1px solid #ccc', marginRight: 5, verticalAlign: 'middle' }} />
                {item.color || 'Black'}
              </dd>
            </div>
            <div>
              <dt>Unit</dt>
              <dd>{item.unit || 'm'}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{item.location || 'Main Store'}</dd>
            </div>
            <div>
              <dt>Date Added</dt>
              <dd>10 May 2026</dd>
            </div>
          </dl>
        </div>
        <div className="item-detail-stats">
          <article>
            <i><Box size={20} /></i>
            <span>
              <small>Current Stock</small>
              <strong>{quantity.toFixed(1)} <em>{item.unit || 'm'}</em></strong>
              <b>{status}</b>
            </span>
          </article>
          <article>
            <i><Sliders size={20} /></i>
            <span>
              <small>Low-stock Threshold</small>
              <strong>{threshold.toFixed(1)} <em>{item.unit || 'm'}</em></strong>
            </span>
          </article>
          <article>
            <i><TrendingUp size={20} /></i>
            <span>
              <small>Stock Value</small>
              <strong>&#8358;{(quantity * 10000).toLocaleString()}</strong>
              <p>@ &#8358;10,000 per {item.unit || 'm'}</p>
            </span>
          </article>
        </div>
      </section>

      <section className="item-detail-grid">
        <main>
          <article className="item-detail-card">
            <header>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Activity size={13} />Recent Stock Movements
              </h3>
              <button>View All History &nbsp;›</button>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>In / Out</th>
                  <th>Quantity</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((row) => (
                  <tr key={row[2]}>
                    <td>{row[0]}</td>
                    <td><Status>{row[1]}</Status></td>
                    <td><code style={{ fontSize: 8, color: '#596273' }}>{row[2]}</code></td>
                    <td>
                      {row[3]}
                      {row[4] && <small>{row[4]}</small>}
                    </td>
                    <td className={row[5] === 'IN' ? 'positive' : 'negative'}>{row[5]}</td>
                    <td><strong>{row[6]}</strong></td>
                    <td>{row[7]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="item-detail-card allocation-history">
            <header>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlignLeft size={13} />Allocation History
              </h3>
              <button>View All Allocations &nbsp;›</button>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Requested By</th>
                  <th>Quantity</th>
                  <th>Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['22 Jul 2026', 'INV30659', 'Jimmy Aki', 'Production', '6.0 m', `${quantity.toFixed(1)} m`],
                  ['19 Jul 2026', 'INV29871', 'Henry Eyo', 'Production', '4.0 m', '23.0 m'],
                  ['12 Jul 2026', 'INV27933', 'Olive Lawrence', 'Production', '3.5 m', '27.0 m'],
                ].map((row) => (
                  <tr key={row[1]}>
                    <td>{row[0]}</td>
                    <td><code style={{ fontSize: 8, color: '#596273' }}>{row[1]}</code></td>
                    <td><strong>{row[2]}</strong></td>
                    <td>{row[3]}</td>
                    <td><strong>{row[4]}</strong></td>
                    <td>{row[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <footer>Total Allocated <b>13.5 m</b></footer>
          </article>
        </main>

        <aside>
          <article className="item-detail-card supplier-card">
            <header>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={13} />Supplier Information
              </h3>
              <button>View Supplier &nbsp;›</button>
            </header>
            <section>
              <i><Building2 size={22} /></i>
              <div>
                <h3>
                  {item.supplier || 'Elegant Fabrics Ltd.'}{' '}
                  <Status>Preferred Supplier</Status>
                </h3>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={10} />0802 123 4567
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={10} />info@elegantfabrics.com
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={10} />Lagos, Nigeria
                </p>
              </div>
            </section>
          </article>

          <article className="item-detail-card item-information">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Tag size={13} />Item Information
            </h3>
            <dl>
              <dt>Item Code</dt><dd>{code}</dd>
              <dt>Category</dt><dd>{item.type || 'Suiting'}</dd>
              <dt>Color</dt><dd>{item.color || 'Black'}</dd>
              <dt>Width</dt><dd>1.5 m</dd>
              <dt>Composition</dt><dd>Polyester Blend</dd>
              <dt>Pattern</dt><dd>Jacquard</dd>
              <dt>Notes</dt><dd>Premium quality item for suits and blazers.</dd>
              <dt>Status</dt><dd><Status>Active</Status></dd>
            </dl>
          </article>

          <section className="item-detail-actions">
            <button>
              <Sliders size={16} />
              <span>
                <strong>Adjust Stock</strong>
                <small>Increase or decrease stock</small>
              </span>
            </button>
            <button>
              <Box size={16} />
              <span>
                <strong>Mark as Inactive</strong>
                <small>Hide this item from inventory</small>
              </span>
            </button>
          </section>
        </aside>
      </section>
    </div>
  );
}
