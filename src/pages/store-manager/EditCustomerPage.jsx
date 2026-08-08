import { useRef, useState } from 'react';
import { ArrowLeft, Save, X, User, Settings, Star, Ruler, StickyNote, Edit2, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { money } from '../../utils/oms';
import { api } from '../../lib/api';

export default function EditCustomerPage({ customer, onCancel, onSave, onViewMeasurements }) {
  const notesFieldRef = useRef(null);
  const [form, setForm] = useState({
    fullName: customer.fullName || '',
    phone: customer.phone || '',
    email: customer.email || '',
    customerType: Number(customer.totalOrders) > 1 ? 'Returning' : 'New',
    registrationDate: customer.createdAt ? String(customer.createdAt).slice(0, 10) : '',
    referredBy: customer.referredBy || 'Walk-in',
    dateOfBirth: customer.dateOfBirth ? String(customer.dateOfBirth).slice(0, 10) : '',
    preferredStore: customer.stores?.[0] || 'Lekki',
    gender: customer.gender || '',
    communicationPreference: customer.communicationPreference || 'WhatsApp',
    occupation: customer.occupation || '',
    preferredContactTime: customer.preferredContactTime || 'Anytime',
    address: customer.address || '',
    notes: customer.notes || '',
    preferredContactMethod: customer.preferredContactMethod || 'WhatsApp',
    preferredFit: customer.preferredFit || 'Regular Fit',
    preferredStyle: customer.preferredStyle || 'Classic',
    status: customer.status || 'Active',
    elite: Boolean(customer.eliteMember),
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Customers that only exist as a name on an invoice have no profile row yet,
  // so the first save has to create one before the details can be stored.
  const isInvoiceOnly = String(customer.id || '').startsWith('sent-');

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setMessage('');
    try {
      let customerId = customer.id;

      if (isInvoiceOnly) {
        const created = await api.post('/oms/customers', {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          category: form.customerType,
        });
        customerId = created.data?.data?.customer?.id;
        if (!customerId) throw new Error('Customer profile could not be created.');
      }

      const response = await api.patch(`/oms/customers/${customerId}`, form);
      const saved = response.data?.data?.customer;
      onSave({ ...customer, ...form, ...(saved || {}), id: customerId, stores: [form.preferredStore] });
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to save customer changes.');
    } finally { setSaving(false); }
  };

  const infoFields = [
    ['Full Name *', 'fullName', 'input'], ['Customer Type', 'customerType', 'select', ['Returning', 'New']],
    ['Phone Number *', 'phone', 'input'], ['Registration Date', 'registrationDate', 'date'],
    ['Email Address', 'email', 'email'], ['Referred By', 'referredBy', 'select', ['Walk-in', 'Referral', 'Social Media']],
    ['Date of Birth', 'dateOfBirth', 'date'], ['Preferred Store', 'preferredStore', 'select', ['Lekki', 'Ikeja', 'Surulere']],
    ['Gender', 'gender', 'select', ['Male', 'Female', 'Other']], ['Communication Preference', 'communicationPreference', 'select', ['WhatsApp', 'Phone', 'Email']],
    ['Occupation', 'occupation', 'input'], ['Preferred Contact Time', 'preferredContactTime', 'select', ['Anytime', 'Morning', 'Afternoon', 'Evening']],
    ['Address', 'address', 'textarea'], ['Special Notes', 'notes', 'textarea'],
    ['Preferred Contact Method', 'preferredContactMethod', 'select', ['WhatsApp', 'Phone', 'Email']],
  ];

  return (
    <form className="os-page" onSubmit={submit}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a7a6a' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            color: '#5a4e42', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} /> Customers
        </button>
        <ChevronRight size={12} />
        <span style={{ color: '#8a7a6a' }}>{customer.fullName}</span>
        <ChevronRight size={12} />
        <span>Edit Customer</span>
      </div>

      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Edit2 size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>Edit Customer</h2>
            <p>Update customer information and preferences</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
              fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
            }}
          >
            <X size={13} /> Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              border: 'none', borderRadius: 8, background: '#1a1611',
              fontSize: 13, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700, opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: '#fff5f0', border: '1px solid #f3c5b5', borderRadius: 8,
          fontSize: 13, color: '#8a3520',
        }}>
          <AlertCircle size={15} /> {message}
        </div>
      )}

      <div className="os-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Customer Information */}
          <div className="os-card">
            <div className="os-card-head">
              <User size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
              <div><strong>Customer Information</strong><p>Personal details and contact info</p></div>
            </div>
            <div className="os-card-body os-grid-2">
              {infoFields.map(([label, field, type, options]) => (
                <label
                  key={field}
                  className={`os-field${type === 'textarea' ? ' os-field-full' : ''}`}
                >
                  <span>{label}</span>
                  {type === 'select' ? (
                    <select value={form[field]} onChange={(event) => update(field, event.target.value)}>
                      {options.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : type === 'textarea' ? (
                    <textarea
                      ref={field === 'notes' ? notesFieldRef : undefined}
                      rows={3}
                      value={form[field]}
                      onChange={(event) => update(field, event.target.value)}
                    />
                  ) : (
                    <input type={type} value={form[field]} onChange={(event) => update(field, event.target.value)} />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Additional Preferences */}
          <div className="os-card">
            <div className="os-card-head">
              <Settings size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
              <div><strong>Additional Preferences</strong><p>Fit, style and fabric preferences</p></div>
            </div>
            <div className="os-card-body os-grid-2">
              <label className="os-field">
                <span>Preferred Fit</span>
                <select value={form.preferredFit} onChange={(event) => update('preferredFit', event.target.value)}>
                  <option>Regular Fit</option>
                  <option>Slim Fit</option>
                  <option>Loose Fit</option>
                </select>
              </label>
              <label className="os-field">
                <span>Preferred Style</span>
                <select value={form.preferredStyle} onChange={(event) => update('preferredStyle', event.target.value)}>
                  <option>Classic</option>
                  <option>Contemporary</option>
                  <option>Traditional</option>
                </select>
              </label>
              <div className="os-field">
                <span>Fabric Preferences</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Wool', 'Linen', 'Cotton'].map((fabric) => (
                    <span key={fabric} style={{
                      padding: '4px 10px', background: '#faf7f3', border: '1px solid #ddd5c8',
                      borderRadius: 20, fontSize: 12, color: '#5a4e42', cursor: 'pointer',
                    }}>{fabric} ×</span>
                  ))}
                </div>
              </div>
              <div className="os-field">
                <span>Color Preferences</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Navy', 'Black', 'Grey', 'White'].map((color) => (
                    <span key={color} style={{
                      padding: '4px 10px', background: '#faf7f3', border: '1px solid #ddd5c8',
                      borderRadius: 20, fontSize: 12, color: '#5a4e42', cursor: 'pointer',
                    }}>{color} ×</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <aside className="os-sidebar">

          {/* Customer Status */}
          <div className="os-summary-card">
            <header>
              <User size={14} strokeWidth={1.5} />
              <h3>Customer Status</h3>
            </header>
            <div style={{ padding: '4px 0 10px' }}>
              <label className="os-field">
                <span>Status</span>
                <select value={form.status} onChange={(event) => update('status', event.target.value)}>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Archived</option>
                </select>
              </label>
            </div>
            <dl>
              <dt>Customer Since</dt>
              <dd>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2025'}</dd>
              <dt>Total Orders</dt>
              <dd>{customer.totalOrders || 0}</dd>
              <dt>Total Spent</dt>
              <dd>{money.format(customer.lifetimeSpend || 0)}</dd>
              <dt>Store Credit</dt>
              <dd>{money.format(customer.storeCreditBalance || 0)}</dd>
            </dl>
          </div>

          {/* Elite Membership */}
          <div className="os-card">
            <div className="os-card-head">
              <Star size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
              <div><strong>Elite Membership</strong></div>
              <button
                type="button"
                onClick={() => update('elite', !form.elite)}
                style={{
                  marginLeft: 'auto', width: 40, height: 22, borderRadius: 11,
                  background: form.elite ? '#c97b08' : '#ddd5c8',
                  border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: form.elite ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <div className="os-card-body">
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#5a4e42' }}>
                Elite customers receive an automatic 5% discount on every order.
              </p>
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
                background: '#faf7f3', borderRadius: 8, fontSize: 12,
              }}>
                <div>
                  <small style={{ display: 'block', color: '#8a7a6a' }}>Discount Rate</small>
                  <strong style={{ color: '#c97b08', fontSize: 16 }}>5%</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ display: 'block', color: '#8a7a6a' }}>Applied</small>
                  <small style={{ color: '#5a4e42' }}>Every invoice</small>
                </div>
              </div>
            </div>
          </div>

          {/* Measurements */}
          <div className="os-summary-card">
            <header>
              <Ruler size={14} strokeWidth={1.5} />
              <h3>Measurements</h3>
            </header>
            <dl>
              <dt>Status</dt>
              <dd style={{ fontWeight: 700 }}>{customer.measurementsAdded ? 'Saved' : 'Not saved'}</dd>
              <dt>Last Updated</dt>
              <dd>{customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('en-GB') : '—'}</dd>
              <dt>Created By</dt>
              <dd>Bola</dd>
            </dl>
            <button
              type="button"
              onClick={() => onViewMeasurements?.()}
              disabled={!onViewMeasurements}
              style={{
                width: '100%', padding: '8px 12px', marginTop: 8,
                border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
                fontSize: 12, color: '#5a4e42', cursor: onViewMeasurements ? 'pointer' : 'not-allowed',
                fontWeight: 500, opacity: onViewMeasurements ? 1 : 0.5,
              }}
            >View Measurements</button>
          </div>

          {/* Internal Notes */}
          <div className="os-summary-card">
            <header>
              <StickyNote size={14} strokeWidth={1.5} />
              <h3>Notes (Internal)</h3>
            </header>
            {/* These were four hardcoded lines shown against every customer,
                regardless of what had actually been recorded. */}
            {form.notes.trim() ? (
              <ul style={{ margin: '6px 0', padding: '0 0 0 16px', fontSize: 13, color: '#5a4e42', lineHeight: 1.7 }}>
                {form.notes.split('\n').filter((note) => note.trim()).map((note, index) => (
                  <li key={`${note}-${index}`}>{note}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: '6px 0', fontSize: 13, color: '#8a7a6a' }}>No notes recorded for this customer yet.</p>
            )}
            <button
              type="button"
              onClick={() => {
                notesFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                notesFieldRef.current?.focus({ preventScroll: true });
              }}
              style={{
                width: '100%', padding: '8px 12px', marginTop: 4,
                border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
                fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
              }}
            >Edit Notes</button>
          </div>

        </aside>
      </div>
    </form>
  );
}
