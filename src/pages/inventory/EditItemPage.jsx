import { useState } from 'react';
import { ArrowLeft, CheckCircle, Tag, Sliders, MessageSquare, Users, Bell, List } from 'lucide-react';
import { api } from '../../lib/api';

export default function EditItemPage({ item, currentRole, onCancel, onSubmitted }) {
  const [form, setForm] = useState({
    name: item.name || '',
    type: item.type || '',
    unit: item.unit || 'm',
    supplier: item.supplier || '',
    quantity: item.quantity || 0,
    lowStockThreshold: item.lowStockThreshold || 5,
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const proposedChanges = Object.fromEntries(
      ['name', 'type', 'unit', 'supplier', 'quantity', 'lowStockThreshold']
        .filter((key) => String(form[key]) !== String(item[key] ?? (key === 'lowStockThreshold' ? 5 : key === 'quantity' ? 0 : '')))
        .map((key) => [key, ['quantity', 'lowStockThreshold'].includes(key) ? Number(form[key]) : form[key]])
    );
    try {
      const response = await api.post(`/oms/fabrics/${item.id}/edit-requests`, {
        proposedChanges,
        reason: form.reason,
        requestedBy: currentRole?.name?.split(' (')[0] || 'Inventory Manager',
        requestedByRole: 'inventory_manager',
      });
      onSubmitted(response.data?.data?.request);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to submit this edit request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="edit-inventory-item-page" onSubmit={submit}>
      <header>
        <div>
          <p>
            <button type="button" onClick={onCancel} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ArrowLeft size={11} />Inventory List
            </button>
            {' '}&nbsp;›&nbsp;{' '}{item.name} &nbsp;›&nbsp; <strong>Edit Item</strong>
          </p>
          <h2>Edit Item</h2>
          <span>Propose changes for Owner review and approval.</span>
        </div>
        <div>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button disabled={saving}>
            <CheckCircle size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {saving ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </header>

      {message && <div className="invoice-message">{message}</div>}

      <section className="edit-item-layout">
        <main>
          <article>
            <h3><Tag size={14} />Item Information</h3>
            <div className="edit-item-grid">
              <label>
                Item Name *
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Black Jacquard"
                  required
                />
              </label>
              <label>
                Category *
                <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                  {['Suiting', 'Shirting', 'Dress', 'Native', 'Lining', 'Accessories', 'Cloth'].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Current Quantity *
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => update('quantity', e.target.value)}
                  required
                />
                <small>The item&apos;s actual quantity currently in stock.</small>
              </label>
              <label>
                Unit *
                <select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                  <option>m</option>
                  <option>yds</option>
                  <option>pcs</option>
                  <option>rolls</option>
                </select>
              </label>
              <label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sliders size={11} />Low-stock Threshold *
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.lowStockThreshold}
                  onChange={(e) => update('lowStockThreshold', e.target.value)}
                />
                <small>An alert is raised when quantity reaches or falls below this value.</small>
              </label>
              <label>
                Supplier
                <input
                  value={form.supplier}
                  onChange={(e) => update('supplier', e.target.value)}
                  placeholder="e.g. Elegant Fabrics Ltd."
                />
              </label>
            </div>
          </article>

          <article>
            <h3><MessageSquare size={14} />Reason for Change</h3>
            <label>
              Explain why this item needs to be edited *
              <textarea
                value={form.reason}
                onChange={(e) => update('reason', e.target.value)}
                placeholder="Give the Owner enough context to review this request..."
                required
              />
            </label>
          </article>
        </main>

        <aside>
          <article className="edit-approval-flow">
            <h3><CheckCircle size={14} />Approval Workflow</h3>
            <section className="active">
              <i>1</i>
              <span>
                <strong>Inventory Manager</strong>
                <small>Submits requested changes</small>
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
                <small>Inventory updates after approval</small>
              </span>
            </section>
          </article>

          <article className="edit-notification-note">
            <h3><Bell size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Who will be notified?</h3>
            <p><Users size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />Owner</p>
            <p><Users size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />Administrator</p>
            <p><Users size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />Accounts Officer</p>
            <small>The item remains unchanged while approval is pending.</small>
          </article>

          <article className="current-item-values">
            <h3><List size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Current Values</h3>
            <dl>
              <dt>Name</dt><dd>{item.name}</dd>
              <dt>Category</dt><dd>{item.type}</dd>
              <dt>Quantity</dt><dd>{Number(item.quantity || 0).toFixed(1)} {item.unit}</dd>
              <dt>Unit</dt><dd>{item.unit}</dd>
              <dt>Low-stock Threshold</dt><dd>{item.lowStockThreshold || 5} {item.unit}</dd>
            </dl>
          </article>
        </aside>
      </section>
    </form>
  );
}
