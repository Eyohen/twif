import { useState } from 'react';
import { money } from '../../utils/oms';
import { api } from '../../lib/api';

export default function EditCustomerPage({ customer, onCancel, onSave }) {
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
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setMessage('');
    try {
      const response = await api.patch(`/oms/customers/${customer.id}`, form);
      const saved = response.data?.data?.customer;
      onSave({ ...customer, ...form, ...(saved || {}), stores: [form.preferredStore] });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save customer changes.');
    } finally { setSaving(false); }
  };

  return (
    <form className="edit-customer-page" onSubmit={submit}>
      <header><div><p>Customers &nbsp;›&nbsp; <strong>Edit Customer</strong></p><h2>Edit Customer</h2><span>Update customer information and preferences.</span></div><div><button type="button" onClick={onCancel}>Cancel</button><button className="save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></div></header>
      {message ? <div className="invoice-message">{message}</div> : null}
      <div className="edit-customer-grid">
        <main>
          <section className="edit-customer-panel customer-info-form"><h3>♙ &nbsp; Customer Information</h3><div>{[
            ['Full Name *', 'fullName', 'input'], ['Customer Type', 'customerType', 'select', ['Returning', 'New']],
            ['Phone Number *', 'phone', 'input'], ['Registration Date', 'registrationDate', 'date'],
            ['Email Address', 'email', 'email'], ['Referred By', 'referredBy', 'select', ['Walk-in', 'Referral', 'Social Media']],
            ['Date of Birth', 'dateOfBirth', 'date'], ['Preferred Store', 'preferredStore', 'select', ['Lekki', 'Ikeja', 'Surulere']],
            ['Gender', 'gender', 'select', ['Male', 'Female', 'Other']], ['Communication Preference', 'communicationPreference', 'select', ['WhatsApp', 'Phone', 'Email']],
            ['Occupation', 'occupation', 'input'], ['Preferred Contact Time', 'preferredContactTime', 'select', ['Anytime', 'Morning', 'Afternoon', 'Evening']],
            ['Address', 'address', 'textarea'], ['Special Notes', 'notes', 'textarea'],
            ['Preferred Contact Method', 'preferredContactMethod', 'select', ['WhatsApp', 'Phone', 'Email']],
          ].map(([label, field, type, options]) => <label key={field}>{label}{type === 'select' ? <select value={form[field]} onChange={(event) => update(field, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : type === 'textarea' ? <textarea value={form[field]} onChange={(event) => update(field, event.target.value)} /> : <input type={type} value={form[field]} onChange={(event) => update(field, event.target.value)} />}</label>)}</div></section>
          <section className="edit-customer-panel additional-preferences"><h3>⚙ &nbsp; Additional Preferences</h3><div><label>Preferred Fit<select value={form.preferredFit} onChange={(event) => update('preferredFit', event.target.value)}><option>Regular Fit</option><option>Slim Fit</option><option>Loose Fit</option></select></label><label>Fabric Preferences<div className="preference-tags"><span>Wool ×</span><span>Linen ×</span><span>Cotton ×</span></div></label><label>Preferred Style<select value={form.preferredStyle} onChange={(event) => update('preferredStyle', event.target.value)}><option>Classic</option><option>Contemporary</option><option>Traditional</option></select></label><label>Color Preferences<div className="preference-tags"><span>Navy ×</span><span>Black ×</span><span>Grey ×</span><span>White ×</span></div></label></div></section>
        </main>
        <aside>
          <section className="edit-customer-panel customer-status-card"><h3>♙ &nbsp; Customer Status</h3><label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option>Active</option><option>Inactive</option><option>Archived</option></select></label><dl><dt>Customer Since</dt><dd>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2025'}</dd><dt>Total Orders</dt><dd>{customer.totalOrders || 0}</dd><dt>Total Spent</dt><dd>{money.format(customer.lifetimeSpend || 0)}</dd><dt>Store Credit</dt><dd>{money.format(customer.storeCreditBalance || 0)}</dd></dl></section>
          <section className="edit-customer-panel elite-membership"><header><h3>♕ &nbsp; Elite Membership &nbsp;ⓘ</h3><button type="button" className={form.elite ? 'on' : ''} onClick={() => update('elite', !form.elite)}><i /></button></header><strong>✓ &nbsp; Elite customer</strong><p>This customer receives an automatic 5% discount on every order.</p><div><span><small>Discount Rate</small><b>5%</b></span><span>Applied automatically<br />on every invoice</span></div><small>This setting applies to all new invoices for this customer.</small></section>
          <section className="edit-customer-panel edit-measurements-card"><h3>▣ &nbsp; Measurements</h3><dl><dt>Status</dt><dd><b>{customer.measurementsAdded ? 'Saved' : 'Not saved'}</b></dd><dt>Last Updated</dt><dd>{customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('en-GB') : '—'}</dd><dt>Created By</dt><dd>Bola</dd></dl><button type="button">View Measurements</button></section>
          <section className="edit-customer-panel internal-notes-card"><h3>▤ &nbsp; Notes (Internal)</h3><ul><li>Likes slim fit</li><li>Usually requests French cuffs</li><li>Prefers WhatsApp updates</li><li>Sensitive to wool fabrics</li></ul><button type="button">Edit Notes</button></section>
        </aside>
      </div>
    </form>
  );
}
