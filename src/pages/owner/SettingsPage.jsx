import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Building2, FileText, Factory, Bell, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';

// Grouped the way an owner would look for them, rather than by data type.
const SECTIONS = [
  {
    title: 'Business',
    caption: 'Shown on invoices and in customer-facing messages',
    Icon: Building2,
    fields: [
      { key: 'businessName', label: 'Business name', type: 'text' },
      { key: 'supportEmail', label: 'Support email', type: 'email', placeholder: 'info@twif.ng' },
      { key: 'supportPhone', label: 'Support phone', type: 'tel', placeholder: '0803 000 0000' },
      { key: 'currency', label: 'Currency', type: 'select', options: ['NGN', 'USD', 'GBP'] },
    ],
  },
  {
    title: 'Invoicing',
    caption: 'How invoices are numbered and how long a quote stands',
    Icon: FileText,
    fields: [
      { key: 'invoicePrefix', label: 'Invoice prefix', type: 'text', hint: 'Leads every invoice number.' },
      { key: 'invoiceValidityHours', label: 'Quote valid for (hours)', type: 'number', min: 1 },
      { key: 'requirePaymentEvidence', label: 'Require proof of payment before an invoice can be sent as paid', type: 'toggle' },
    ],
  },
  {
    title: 'Production',
    caption: 'Defaults used when scheduling and chasing collection',
    Icon: Factory,
    fields: [
      { key: 'productionLeadTimeWeeks', label: 'Standard lead time (weeks)', type: 'number', min: 1 },
      { key: 'collectionReminderDays', label: 'Chase collection after (days)', type: 'number', min: 1 },
      { key: 'lowStockThreshold', label: 'Default low-stock threshold', type: 'number', min: 0 },
    ],
  },
  {
    title: 'Notifications',
    caption: 'Which events raise an alert for Owner and Admin',
    Icon: Bell,
    fields: [
      { key: 'notifyOnNewInvoice', label: 'A new invoice is waiting for Accounts', type: 'toggle' },
      { key: 'notifyOnLowStock', label: 'Stock reaches its low threshold', type: 'toggle' },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/oms/settings')
      .then((response) => {
        const value = response.data?.data?.settings || {};
        setSettings(value);
        setSaved(value);
      })
      .catch(() => setNotice({ tone: 'error', text: 'Settings could not be loaded.' }));
  }, []);

  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const dirty = settings && saved && JSON.stringify(settings) !== JSON.stringify(saved);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await api.put('/oms/settings', settings);
      const value = response.data?.data?.settings || settings;
      setSettings(value);
      setSaved(value);
      setNotice({ tone: 'success', text: 'Settings saved.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error.response?.data?.message || 'Settings could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="os-page">
        <div className="os-card" style={{ padding: 40, textAlign: 'center', color: '#8a7a6a' }}>
          {notice?.text || 'Loading settings…'}
        </div>
      </div>
    );
  }

  return (
    <form className="os-page" onSubmit={submit}>
      <div className="os-page-header">
        <div className="os-page-title">
          <SettingsIcon size={22} strokeWidth={1.8} />
          <div>
            <h2>Settings</h2>
            <p>Business details and the defaults the system works to</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="um-btn-ghost"
            onClick={() => setSettings(saved)}
            disabled={!dirty}
            style={{ opacity: dirty ? 1 : 0.5, cursor: dirty ? 'pointer' : 'not-allowed' }}
          >
            <RotateCcw size={13} strokeWidth={1.8} /> Discard
          </button>
          <button type="submit" className="os-release-btn" style={{ width: 'auto', padding: '10px 18px', fontSize: 13 }} disabled={!dirty || saving}>
            <Save size={15} strokeWidth={2} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {notice ? (
        <div className={`os-row-notice${notice.tone === 'error' ? ' is-error' : ''}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      ) : null}

      {SECTIONS.map(({ title, caption, Icon, fields }) => (
        <section className="os-card" key={title}>
          <div className="os-card-head">
            <Icon size={16} strokeWidth={1.6} style={{ color: '#c97b08' }} />
            <div><strong>{title}</strong><p>{caption}</p></div>
          </div>
          <div className="os-card-body settings-fields">
            {fields.map((field) => {
              if (field.type === 'toggle') {
                return (
                  <label className="settings-toggle" key={field.key}>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[field.key])}
                      onChange={(event) => update(field.key, event.target.checked)}
                    />
                    <span className="settings-toggle-track" aria-hidden="true"><i /></span>
                    <span className="settings-toggle-label">{field.label}</span>
                  </label>
                );
              }
              return (
                <label className="os-field" key={field.key}>
                  <span>{field.label}</span>
                  {field.type === 'select' ? (
                    <select value={settings[field.key] ?? ''} onChange={(event) => update(field.key, event.target.value)}>
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      min={field.min}
                      placeholder={field.placeholder}
                      value={settings[field.key] ?? ''}
                      onChange={(event) => update(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                    />
                  )}
                  {field.hint ? <small className="settings-hint">{field.hint}</small> : null}
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {dirty ? <div className="settings-dirty-bar">You have unsaved changes.</div> : null}
    </form>
  );
}
