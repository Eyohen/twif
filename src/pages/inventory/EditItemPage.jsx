import { useState } from 'react';
import { ArrowLeft, CheckCircle, Tag, Sliders, MessageSquare, Users, Bell, List, ImagePlus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { money } from '../../utils/oms';
import { itemPhotoUrl } from './item';

const DETAIL_FIELDS = ['sku', 'name', 'type', 'colour', 'cost', 'location', 'supplier', 'lowStockThreshold'];

export default function EditItemPage({ item, currentRole, types = [], onCancel, onSaved, onSubmitted }) {
  const [form, setForm] = useState({
    sku: item.sku || '',
    name: item.name || '',
    type: item.type || '',
    colour: item.colour || '',
    cost: item.cost ?? '',
    location: item.location || '',
    supplier: item.supplier || '',
    lowStockThreshold: item.lowStockThreshold ?? '',
  });
  const [image, setImage] = useState({ dataUrl: '', removed: false });
  const [quantity, setQuantity] = useState(String(item.quantity ?? 0));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const quantityChanged = String(quantity) !== String(item.quantity ?? 0);
  const detailsChanged = DETAIL_FIELDS.some((field) => String(form[field] ?? '') !== String(item[field] ?? ''))
    || Boolean(image.dataUrl) || image.removed;

  const currentImage = image.removed ? '' : (image.dataUrl || itemPhotoUrl(item));

  const readImage = (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError('That photo is larger than 4MB. Please choose a smaller one.'); return; }
    const reader = new FileReader();
    reader.onload = () => setImage({ dataUrl: String(reader.result), removed: false });
    reader.readAsDataURL(file);
  };

  // Everything except quantity describes the item rather than the stock, so it
  // saves straight away. Quantity is what the Owner has to sign off.
  const saveDetails = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const payload = { ...form, cost: form.cost === '' ? null : Number(form.cost), lowStockThreshold: Number(form.lowStockThreshold || 0) };
      if (image.dataUrl) payload.image = image.dataUrl;
      if (image.removed) payload.image = '';
      const response = await api.patch(`/oms/fabrics/${item.id}`, payload);
      const updated = response.data?.data?.fabric;
      if (updated) onSaved?.(updated);
      else setMessage('Saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save these changes.');
    } finally {
      setSaving(false);
    }
  };

  const submitQuantity = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post(`/oms/fabrics/${item.id}/edit-requests`, {
        proposedChanges: { quantity: Number(quantity) },
        reason,
        requestedBy: currentRole?.name?.split(' (')[0] || 'Inventory Manager',
        requestedByRole: 'inventory_manager',
      });
      onSubmitted?.(response.data?.data?.request);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit this stock change.');
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions = [...new Set([...types, item.type].filter(Boolean))];

  return (
    <div className="edit-inventory-item-page">
      <header>
        <div>
          <p>
            <button type="button" onClick={onCancel} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ArrowLeft size={11} />Inventory
            </button>
            {' '}&nbsp;›&nbsp;{' '}{item.name} &nbsp;›&nbsp; <strong>Edit Item</strong>
          </p>
          <h2>Edit Item</h2>
          <span>Item details save immediately. A change to the stock count goes to the Owner for approval.</span>
        </div>
        <div>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={saveDetails} disabled={saving || !detailsChanged}>
            <CheckCircle size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {saving ? 'Saving…' : 'Save Details'}
          </button>
        </div>
      </header>

      {error && <div className="invoice-message">{error}</div>}
      {message && <div className="invoice-message">{message}</div>}

      <section className="edit-item-layout">
        <main>
          <article>
            <h3><Tag size={14} />Item Details</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <label style={{ width: 76, height: 76, borderRadius: 10, border: '1px dashed #ddd5c8', background: '#faf7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {currentImage
                  ? <img src={currentImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <ImagePlus size={20} style={{ color: '#b0a090' }} />}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => readImage(event.target.files?.[0])} style={{ display: 'none' }} />
              </label>
              <div style={{ fontSize: 12, color: '#8a7a6a', lineHeight: 1.5 }}>
                <strong style={{ display: 'block', color: '#5a4e42', fontSize: 13 }}>Item photo</strong>
                PNG, JPEG, WebP or GIF, up to 4MB.
                {currentImage ? (
                  <button type="button" onClick={() => setImage({ dataUrl: '', removed: true })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, border: '1px solid #ddd5c8', background: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 11.5, color: '#8a3520', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <X size={11} /> Remove photo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="edit-item-grid">
              <label>
                SKU
                <input value={form.sku} onChange={(event) => update('sku', event.target.value)} placeholder="e.g. FAB-014" />
                <small>The code on the shelf label.</small>
              </label>
              <label>
                Item Name *
                <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
              </label>
              <label>
                Type *
                <select value={form.type} onChange={(event) => update('type', event.target.value)}>
                  {typeOptions.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>
                Colour
                <input value={form.colour} onChange={(event) => update('colour', event.target.value)} placeholder="e.g. Navy" />
              </label>
              <label>
                Cost per {item.unit === 'yards' ? 'yard' : 'unit'}
                <input type="number" min="0" step="1" value={form.cost} onChange={(event) => update('cost', event.target.value)} placeholder="₦" />
              </label>
              <label>
                Location
                <input value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="e.g. Ikeja store, rack 2" />
              </label>
              <label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sliders size={11} />Low-stock Threshold
                </span>
                <input type="number" min="0" step="0.1" value={form.lowStockThreshold} onChange={(event) => update('lowStockThreshold', event.target.value)} />
                <small>An alert is raised when quantity reaches or falls below this value.</small>
              </label>
              <label>
                Supplier
                <input value={form.supplier} onChange={(event) => update('supplier', event.target.value)} />
              </label>
            </div>
          </article>

          <form onSubmit={submitQuantity}>
            <article>
              <h3><MessageSquare size={14} />Stock Count</h3>
              <div className="edit-item-grid">
                <label>
                  Quantity in stock
                  <input type="number" min="0" step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                  <small>Currently {Number(item.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}. Stock normally moves through production allocation.</small>
                </label>
              </div>
              <label style={{ display: 'block', marginTop: 12 }}>
                Reason for the change *
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Give the Owner enough context to review this request..."
                  required={quantityChanged}
                  disabled={!quantityChanged}
                />
              </label>
              <button
                type="submit"
                disabled={!quantityChanged || submitting}
                style={{ marginTop: 12, padding: '10px 16px', border: 'none', borderRadius: 8, background: quantityChanged ? '#1a1611' : '#ddd5c8', color: '#fff', fontSize: 13, fontWeight: 700, cursor: quantityChanged ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </article>
          </form>
        </main>

        <aside>
          <article className="edit-approval-flow">
            <h3><CheckCircle size={14} />Approval Workflow</h3>
            <section className="active">
              <i>1</i>
              <span>
                <strong>Inventory Manager</strong>
                <small>Submits a stock count change</small>
              </span>
            </section>
            <section>
              <i>2</i>
              <span>
                <strong>Owner Review</strong>
                <small>Only the Owner can approve or reject</small>
              </span>
            </section>
            <section>
              <i>3</i>
              <span>
                <strong>Changes Applied</strong>
                <small>Stock updates after approval</small>
              </span>
            </section>
          </article>

          <article className="edit-notification-note">
            <h3><Bell size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Who will be notified?</h3>
            <p><Users size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />Owner</p>
            <p><Users size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />Administrator</p>
            <p><Users size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />Accounts Officer</p>
            <small>The stock count stays as it is while approval is pending.</small>
          </article>

          <article className="current-item-values">
            <h3><List size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Current Values</h3>
            <dl>
              <dt>SKU</dt><dd>{item.sku || '—'}</dd>
              <dt>Name</dt><dd>{item.name}</dd>
              <dt>Type</dt><dd>{item.type}</dd>
              <dt>Colour</dt><dd>{item.colour || '—'}</dd>
              <dt>Quantity</dt><dd>{Number(item.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}</dd>
              <dt>Unit cost</dt><dd>{item.cost ? money.format(Number(item.cost)) : '—'}</dd>
              <dt>Location</dt><dd>{item.location || '—'}</dd>
              <dt>Low-stock Threshold</dt><dd>{Number(item.lowStockThreshold || 0)} {item.unit}</dd>
            </dl>
          </article>
        </aside>
      </section>
    </div>
  );
}
