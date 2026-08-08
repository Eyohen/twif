import { useEffect, useState } from 'react';
import { Star, Plus, Edit2, Trash2, Users, Percent, X, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { money } from '../../utils/oms';

const BLANK = {
  name: '',
  discountPercent: 0,
  description: '',
  colour: '#c97b08',
  minSpend: 0,
  minOrders: 0,
  minMonths: 0,
};

export default function MembershipsPage() {
  const [tiers, setTiers] = useState([]);
  const [unassigned, setUnassigned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/oms/membership-tiers')
    .then((response) => {
      setTiers(response.data?.data?.tiers || []);
      setUnassigned(response.data?.data?.unassignedCount || 0);
    })
    .catch(() => setNotice({ tone: 'error', text: 'Memberships could not be loaded.' }))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    const isNew = !editing.id;
    try {
      if (isNew) await api.post('/oms/membership-tiers', editing);
      else await api.patch(`/oms/membership-tiers/${editing.id}`, editing);
      await load();
      setEditing(null);
      setNotice({ tone: 'success', text: isNew ? `${editing.name} was created.` : `${editing.name} was updated.` });
    } catch (error) {
      setNotice({ tone: 'error', text: error.response?.data?.message || 'That membership could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tier) => {
    setNotice(null);
    try {
      await api.delete(`/oms/membership-tiers/${tier.id}`);
      await load();
      setNotice({ tone: 'success', text: `${tier.name} was deleted.` });
    } catch (error) {
      setNotice({ tone: 'error', text: error.response?.data?.message || 'That membership could not be deleted.' });
    } finally {
      setConfirmDelete(null);
    }
  };

  const totalMembers = tiers.reduce((sum, tier) => sum + tier.memberCount, 0);
  const discounted = tiers.filter((tier) => tier.discountPercent > 0);

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Star size={22} strokeWidth={1.8} />
          <div>
            <h2>Memberships</h2>
            <p>Membership types, the discount each carries, and who is on them</p>
          </div>
        </div>
        <button type="button" className="os-release-btn" style={{ width: 'auto', padding: '10px 18px', fontSize: 13 }} onClick={() => setEditing({ ...BLANK })}>
          <Plus size={15} strokeWidth={2} />
          New Membership
        </button>
      </div>

      {notice ? (
        <div className={`os-row-notice${notice.tone === 'error' ? ' is-error' : ''}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      ) : null}

      <div className="os-kpi-row">
        {[
          { label: 'Membership Types', value: tiers.length, Icon: Star },
          { label: 'Customers Assigned', value: totalMembers, Icon: Users },
          { label: 'Types With A Discount', value: discounted.length, Icon: Percent },
          { label: 'On An Unknown Type', value: unassigned, Icon: AlertCircle },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="os-card">
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="membership-kpi-icon"><Icon size={17} strokeWidth={1.8} /></span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f0b06', lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 11.5, color: '#8a7a6a' }}>{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="os-card" style={{ padding: 40, textAlign: 'center', color: '#8a7a6a' }}>Loading memberships…</div>
      ) : (
        <div className="membership-grid">
          {tiers.map((tier) => (
            <article className="os-card membership-card" key={tier.id}>
              <header style={{ borderTopColor: tier.colour }}>
                <div>
                  <strong>{tier.name}</strong>
                  {tier.isDefault ? <span className="membership-builtin">Built in</span> : null}
                  <p>{tier.description || 'No description.'}</p>
                </div>
                <span className="membership-discount" style={{ color: tier.discountPercent ? '#c97b08' : '#8a7a6a' }}>
                  {tier.discountPercent}%
                  <small>discount</small>
                </span>
              </header>

              <dl className="membership-criteria">
                <div><dt>Spend from</dt><dd>{tier.minSpend ? money.format(tier.minSpend) : '—'}</dd></div>
                <div><dt>Orders from</dt><dd>{tier.minOrders || '—'}</dd></div>
                <div><dt>Months a customer</dt><dd>{tier.minMonths || '—'}</dd></div>
              </dl>

              <button type="button" className="membership-members" onClick={() => setExpanded(expanded === tier.id ? null : tier.id)}>
                <Users size={13} strokeWidth={1.8} />
                {tier.memberCount} {tier.memberCount === 1 ? 'customer' : 'customers'}
                <span>{expanded === tier.id ? 'Hide' : 'View'}</span>
              </button>

              {expanded === tier.id ? (
                <ul className="membership-member-list">
                  {tier.members.length ? tier.members.map((member) => (
                    <li key={member.id}>
                      <strong>{member.fullName}</strong>
                      <small>{member.phone || member.email || 'No contact details'}</small>
                    </li>
                  )) : <li className="is-empty">No customers on this membership yet.</li>}
                </ul>
              ) : null}

              <footer>
                <button type="button" onClick={() => setEditing({ ...tier })}>
                  <Edit2 size={12} strokeWidth={1.8} /> Edit
                </button>
                <button
                  type="button"
                  className="membership-delete"
                  disabled={tier.isDefault}
                  title={tier.isDefault ? 'Built-in memberships cannot be deleted' : undefined}
                  onClick={() => setConfirmDelete(tier)}
                >
                  <Trash2 size={12} strokeWidth={1.8} /> Delete
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="membership-form-title">
          <form className="membership-form" onSubmit={save}>
            <header>
              <h2 id="membership-form-title">{editing.id ? `Edit ${editing.name}` : 'New membership'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close"><X size={16} /></button>
            </header>

            <label className="os-field">
              <span>Name</span>
              <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required placeholder="e.g. Elite Member" />
            </label>

            <div className="os-grid-2">
              <label className="os-field">
                <span>Discount %</span>
                <input type="number" min="0" max="100" step="0.5" value={editing.discountPercent} onChange={(event) => setEditing({ ...editing, discountPercent: event.target.value })} />
              </label>
              <label className="os-field">
                <span>Colour</span>
                <input type="color" value={editing.colour || '#c97b08'} onChange={(event) => setEditing({ ...editing, colour: event.target.value })} />
              </label>
            </div>

            <label className="os-field">
              <span>Description</span>
              <textarea rows={2} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="What this membership means" />
            </label>

            <p className="membership-form-hint">
              Qualifying criteria are shown to staff and on the customer portal tracker. Upgrades stay a
              manual decision — the system never moves a customer between memberships on its own.
            </p>

            <div className="os-grid-3">
              <label className="os-field">
                <span>Spend from (₦)</span>
                <input type="number" min="0" value={editing.minSpend} onChange={(event) => setEditing({ ...editing, minSpend: event.target.value })} />
              </label>
              <label className="os-field">
                <span>Orders from</span>
                <input type="number" min="0" value={editing.minOrders} onChange={(event) => setEditing({ ...editing, minOrders: event.target.value })} />
              </label>
              <label className="os-field">
                <span>Months a customer</span>
                <input type="number" min="0" value={editing.minMonths} onChange={(event) => setEditing({ ...editing, minMonths: event.target.value })} />
              </label>
            </div>

            <footer>
              <button type="button" className="confirm-cancel" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="confirm-submit" disabled={saving}>{saving ? 'Saving…' : 'Save membership'}</button>
            </footer>
          </form>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="membership-delete-title">
          <div className="confirm-sheet">
            <i className="confirm-sheet-icon" style={{ background: '#fff1f1', color: '#c82020' }}><Trash2 size={20} strokeWidth={1.8} /></i>
            <h2 id="membership-delete-title">Delete {confirmDelete.name}?</h2>
            <p>
              {confirmDelete.memberCount
                ? `${confirmDelete.memberCount} customer${confirmDelete.memberCount === 1 ? ' is' : 's are'} on this membership and will need moving first.`
                : 'This membership is not in use, so nothing else changes.'}
            </p>
            <footer>
              <button type="button" className="confirm-cancel" onClick={() => setConfirmDelete(null)}>Keep it</button>
              <button type="button" className="confirm-submit" style={{ background: '#c82020' }} onClick={() => remove(confirmDelete)}>Delete</button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
