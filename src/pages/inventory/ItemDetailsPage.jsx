import { useEffect, useState } from 'react';
import { ArrowLeft, Edit3, Box, Tag, Sliders, TrendingUp, Building2, Activity, AlignLeft, MapPin } from 'lucide-react';
import { api } from '../../lib/api';
import { money, formatMoment } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import { stockStatus, itemImage, colourSwatch } from './item';

export default function ItemDetailsPage({ itemId, fallbackItem, onBack, onEdit, approvalRequest }) {
  // The list row is shown immediately so the page never opens blank, then the
  // full record and its movements replace it.
  const [item, setItem] = useState(fallbackItem || null);
  const [allocations, setAllocations] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let live = true;
    api.get(`/oms/fabrics/${itemId}`)
      .then((response) => {
        if (!live) return;
        setItem(response.data?.data?.fabric || fallbackItem);
        setAllocations(response.data?.data?.allocations || []);
        setLoadError('');
      })
      .catch(() => { if (live) setLoadError('The latest details for this item could not be loaded.'); });
    return () => { live = false; };
  }, [itemId, fallbackItem]);

  if (!item) return <div className="os-page"><p style={{ color: '#8a7a6a' }}>Loading item…</p></div>;

  const quantity = Number(item.quantity || 0);
  const threshold = Number(item.lowStockThreshold || 0);
  const cost = Number(item.cost || 0);
  const status = stockStatus(item);
  const image = itemImage(item);
  const unit = item.unit || 'units';
  const totalAllocated = allocations.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

  return (
    <div className="inventory-item-details">
      <header className="item-detail-heading">
        <div>
          <p>
            <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ArrowLeft size={12} />Inventory
            </button>
            {' '}&nbsp;›&nbsp;{' '}<strong>{item.name}</strong>
          </p>
          <h2>{item.name}</h2>
          <span>Everything recorded about this item, and where its stock has gone.</span>
        </div>
        <button type="button" onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Edit3 size={13} />Edit Item
        </button>
      </header>

      {loadError && (
        <div className="pending-edit-banner" style={{ background: '#fff5f0', borderColor: '#f0c8b8', color: '#8a3520' }}>
          <Activity size={18} />
          <span><strong>{loadError}</strong><small>What is shown below came from the inventory list.</small></span>
        </div>
      )}

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
        {/* A stock picture of the material stands in until someone photographs
            the item itself, and is labelled so the two are never confused. */}
        <figure className="item-detail-photo-wrap">
          <img className="item-detail-photo" src={image.src} alt={image.isPhoto ? item.name : `${item.type} (stock picture)`} />
          {image.isPhoto ? null : <figcaption>Stock picture · no photo yet</figcaption>}
        </figure>
        <div className="item-detail-identity">
          <h2>{item.name}</h2>
          <b>{item.sku || 'No SKU recorded'}</b>
          <dl>
            <div>
              <dt>Type</dt>
              <dd>{item.type || '—'}</dd>
            </div>
            <div>
              <dt>Colour</dt>
              <dd>
                {item.colour ? (
                  <>
                    <i className="color-dot" style={{ background: colourSwatch(item.colour), display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1px solid #ccc', marginRight: 5, verticalAlign: 'middle' }} />
                    {item.colour}
                  </>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt>Unit</dt>
              <dd>{unit}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{item.location || '—'}</dd>
            </div>
            <div>
              <dt>Added</dt>
              <dd>{formatMoment(item.createdAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="item-detail-stats">
          <article>
            <i><Box size={20} /></i>
            <span>
              <small>Current Stock</small>
              <strong>{quantity.toLocaleString(undefined, { maximumFractionDigits: 1 })} <em>{unit}</em></strong>
              <b>{status}</b>
            </span>
          </article>
          <article>
            <i><Sliders size={20} /></i>
            <span>
              <small>Low-stock Threshold</small>
              <strong>{threshold.toLocaleString(undefined, { maximumFractionDigits: 1 })} <em>{unit}</em></strong>
            </span>
          </article>
          <article>
            <i><TrendingUp size={20} /></i>
            {/* Stock value was a flat ₦10,000 a metre on every item regardless of
                what it cost. With no cost recorded there is no value to show. */}
            <span>
              <small>Stock Value</small>
              <strong>{cost ? money.format(quantity * cost) : '—'}</strong>
              <p>{cost ? `@ ${money.format(cost)} per ${unit === 'yards' ? 'yard' : 'unit'}` : 'No unit cost recorded'}</p>
            </span>
          </article>
        </div>
      </section>

      <section className="item-detail-grid">
        <main>
          <article className="item-detail-card allocation-history">
            <header>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlignLeft size={13} />Stock Movements
              </h3>
              <span style={{ fontSize: 12, color: '#8a7a6a' }}>{allocations.length ? `${allocations.length} recorded` : ''}</span>
            </header>
            {/* This table used to list five invented movements and three invented
                allocations — dates, reference numbers and balances that belonged
                to no item. It now shows what production actually took. */}
            {allocations.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Job</th>
                    <th>Taken By</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((row) => (
                    <tr key={row.id}>
                      <td>{formatMoment(row.createdAt)}</td>
                      <td><code style={{ fontSize: 10, color: '#596273' }}>{row.jobId || row.invoiceNumber || '—'}</code></td>
                      <td>{row.allocatedBy || row.requestedBy || 'Production'}</td>
                      <td><strong>{Number(row.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, padding: '18px 4px', fontSize: 13, color: '#8a7a6a' }}>
                Nothing has been allocated from this item yet. Stock moves out when production takes it against a job.
              </p>
            )}
            {allocations.length ? (
              <footer>Total allocated <b>{totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}</b></footer>
            ) : null}
          </article>
        </main>

        <aside>
          <article className="item-detail-card item-information">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Tag size={13} />Item Information
            </h3>
            {/* Width, composition, pattern and a fixed "Premium quality item for
                suits and blazers" note were printed on every item. Only the
                fields the system actually holds are listed. */}
            <dl>
              <dt>SKU</dt><dd>{item.sku || '—'}</dd>
              <dt>Type</dt><dd>{item.type || '—'}</dd>
              <dt>Colour</dt><dd>{item.colour || '—'}</dd>
              <dt>Unit</dt><dd>{unit}</dd>
              <dt>Unit cost</dt><dd>{cost ? money.format(cost) : '—'}</dd>
              <dt>Location</dt><dd>{item.location || '—'}</dd>
              <dt>Last updated</dt><dd>{formatMoment(item.updatedAt)}</dd>
              <dt>Status</dt><dd><Status>{status}</Status></dd>
            </dl>
          </article>

          <article className="item-detail-card supplier-card">
            <header>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={13} />Supplier
              </h3>
            </header>
            <section>
              <i><Building2 size={22} /></i>
              <div>
                {/* The supplier panel used to invent a company, a phone number
                    and an email for every item. */}
                <h3>{item.supplier || 'No supplier recorded'}</h3>
                {item.location ? (
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={10} />{item.location}
                  </p>
                ) : null}
              </div>
            </section>
          </article>
        </aside>
      </section>
    </div>
  );
}
