import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Building2, FileText, Factory, Bell, RotateCcw, Users, Trash2, CheckCircle, Shield, Mail, KeyRound, XCircle } from 'lucide-react';
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
      {
        key: 'paymentReleasePercent',
        label: 'Payment needed before production starts (%)',
        type: 'number',
        min: 0,
        max: 100,
        hint: 'An order is held until this share of the invoice has been paid. The invoice asks the customer for 80% upfront. Only an Owner or Admin can send a held order through anyway.',
      },
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


// Two customers sharing an email address is refused on create, but records made
// before that rule went in are still there — and an owner had no way to see
// them, let alone decide which one to keep.
function CustomerRecordsPanel() {
  const [report, setReport] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get('/oms/customers/duplicates')
    .then((response) => setReport(response.data?.data || { duplicates: [], missingEmail: [] }))
    .catch(() => setNotice({ tone: 'error', text: 'The customer records could not be checked.' }));

  useEffect(() => { load(); }, []);

  const archive = async (customer) => {
    setBusyId(customer.id);
    setNotice(null);
    try {
      await api.delete(`/oms/customers/${customer.id}`);
      await load();
      setNotice({ tone: 'success', text: `${customer.fullName} was archived.` });
    } catch (error) {
      setNotice({ tone: 'error', text: error.response?.data?.message || 'That record could not be archived.' });
    } finally {
      setBusyId(null);
    }
  };

  if (!report) return null;

  const { duplicates = [], missingEmail = [] } = report;
  const clean = !duplicates.length && !missingEmail.length;

  return (
    <section className="os-card">
      <div className="os-card-head">
        <Users size={16} strokeWidth={1.6} style={{ color: '#c97b08' }} />
        <div>
          <strong>Customer records</strong>
          <p>Records that share an email address, or have none</p>
        </div>
      </div>
      <div className="os-card-body dup-panel">
        {notice ? (
          <div className={`os-row-notice${notice.tone === 'error' ? ' is-error' : ''}`} role="status">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
          </div>
        ) : null}

        {clean ? (
          <p className="dup-clean"><CheckCircle size={15} strokeWidth={1.8} /> Every customer has an email address of their own.</p>
        ) : null}

        {duplicates.map((group) => (
          <div className="dup-group" key={group.email}>
            <h4>{group.email} <span>{group.customers.length} records</span></h4>
            {/* Keeping the record with measurements — and the older one where
                neither has any — loses the least history. */}
            {group.customers.map((customer) => (
              <div className="dup-row" key={customer.id}>
                <div>
                  <strong>{customer.fullName}</strong>
                  <span>{customer.phone || 'No phone'} · added {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'unknown'}</span>
                  <small>{customer.hasMeasurements ? 'Has measurements' : 'No measurements'}</small>
                </div>
                <button type="button" onClick={() => archive(customer)} disabled={busyId === customer.id}>
                  <Trash2 size={13} strokeWidth={1.8} /> {busyId === customer.id ? 'Archiving…' : 'Archive'}
                </button>
              </div>
            ))}
          </div>
        ))}

        {missingEmail.length ? (
          <div className="dup-group">
            <h4>No email address <span>{missingEmail.length} records</span></h4>
            <p className="dup-hint">
              An email address is required on every new customer, so these predate the rule.
              Open each on the Customers page and add one — the tracking link is sent there.
            </p>
            {missingEmail.map((customer) => (
              <div className="dup-row" key={customer.id}>
                <div>
                  <strong>{customer.fullName}</strong>
                  <span>{customer.phone || 'No phone'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ConfirmDialog({ title, text, confirmLabel, busy, onConfirm, onCancel }) {
  return (
    <div className="um-modal-backdrop" role="presentation">
      <div className="um-modal" role="dialog" aria-modal="true" aria-labelledby="security-confirm-title">
        <button type="button" className="um-modal-close" onClick={onCancel} aria-label="Close"><XCircle size={18} /></button>
        <Shield size={32} style={{ color: '#c97b08', margin: '0 auto 12px', display: 'block' }} />
        <h3 id="security-confirm-title" style={{ textAlign: 'center', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ textAlign: 'center', color: '#6f6255', lineHeight: 1.5 }}>{text}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button type="button" className="um-btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="os-release-btn" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountSecurityPanel({ account, reload, onLogout }) {
  const [email, setEmail] = useState(account?.email || '');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => setEmail(account?.email || ''), [account?.email]);

  const requestEmailChange = () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setNotice({ tone: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (clean === String(account.email || '').toLowerCase()) {
      setNotice({ tone: 'error', text: 'The email address has not changed.' });
      return;
    }
    setNotice(null);
    setPending('email');
  };

  const requestPinChange = () => {
    if (pin.trim().length < 4) return setNotice({ tone: 'error', text: 'A PIN must be at least 4 characters.' });
    if (pin !== confirmPin) return setNotice({ tone: 'error', text: 'The two PINs do not match.' });
    setNotice(null);
    setPending('pin');
  };

  const confirmChange = async () => {
    setBusy(true);
    try {
      if (pending === 'email') {
        await api.patch(`/oms/staff/${account.id}`, { email: email.trim().toLowerCase() });
        await reload();
        setNotice({ tone: 'success', text: 'Email address changed successfully.' });
        setPending(null);
      } else {
        await api.patch(`/oms/staff/${account.id}`, { pin: pin.trim() });
        setPending(null);
        setPin('');
        setConfirmPin('');
        onLogout('PIN changed successfully. Sign in again with your new PIN.');
      }
    } catch (error) {
      setPending(null);
      setNotice({ tone: 'error', text: error.response?.data?.message || `The ${pending === 'email' ? 'email address' : 'PIN'} could not be changed.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="os-card">
      <div className="os-card-head">
        <KeyRound size={16} strokeWidth={1.6} style={{ color: '#c97b08' }} />
        <div><strong>Owner account security</strong><p>Change the sign-in email or PIN with confirmation</p></div>
      </div>
      <div className="os-card-body" style={{ gap: 16 }}>
        {notice ? <div className={`os-row-notice${notice.tone === 'error' ? ' is-error' : ''}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)}>×</button></div> : null}
        <div className="settings-fields">
          <label className="os-field">
            <span><Mail size={13} /> Email address</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <button type="button" className="um-btn-ghost" onClick={requestEmailChange}>Change email</button>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="os-field"><span>New PIN</span><input type="password" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="new-password" /></label>
            <label className="os-field"><span>Confirm new PIN</span><input type="password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} autoComplete="new-password" /></label>
            <button type="button" className="um-btn-ghost" onClick={requestPinChange} style={{ gridColumn: '1 / -1' }}>Change PIN</button>
          </div>
        </div>
      </div>
      {pending ? (
        <ConfirmDialog
          title={pending === 'email' ? 'Change email address?' : 'Change login PIN?'}
          text={pending === 'email'
            ? `Your Owner account email will change to ${email.trim().toLowerCase()}.`
            : 'Your current sessions will end and you will sign in again using the new PIN.'}
          confirmLabel={pending === 'email' ? 'Yes, change email' : 'Yes, change PIN'}
          busy={busy}
          onConfirm={confirmChange}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </section>
  );
}

function TwoFactorPanel() {
  const [account, setAccount] = useState(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const load = () => api.get('/oms/auth/me')
    .then((response) => setAccount(response.data?.data?.staff || null))
    .catch(() => setAccount(null));

  useEffect(() => { load(); }, []);

  if (!account || !['owner', 'admin'].includes(account.role)) return null;

  const startSetup = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await api.post('/oms/auth/2fa/settings/setup');
      setSetup(response.data?.data || null);
      setCode('');
    } catch (error) {
      setNotice({ tone: 'error', text: error.response?.data?.message || 'Two-factor setup could not be started.' });
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await api.post('/oms/auth/2fa/settings/confirm', { code: code.trim() });
      setRecoveryCodes(response.data?.data?.recoveryCodes || []);
      setSetup(null);
      setCode('');
      await load();
      setNotice({ tone: 'success', text: 'Two-factor sign-in is on. Google Authenticator will be required at your next login.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error.response?.data?.message || 'That code could not be confirmed.' });
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await api.post('/oms/auth/2fa/disable', { code: code.trim() });
      setCode('');
      setConfirmDisable(false);
      await load();
      setNotice({ tone: 'success', text: 'Two-factor sign-in is off. You will be asked to set it up again next time you sign in.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error.response?.data?.message || 'That could not be turned off.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="os-card">
      <div className="os-card-head">
        <Shield size={16} strokeWidth={1.6} style={{ color: '#c97b08' }} />
        <div>
          <strong>Two-factor sign-in</strong>
          <p>{account.role === 'owner' ? 'Protect Owner login with Google Authenticator' : 'Required on an Admin account'}</p>
        </div>
      </div>
      <div className="os-card-body" style={{ gap: 12 }}>
        {notice ? (
          <div className={`os-row-notice${notice.tone === 'error' ? ' is-error' : ''}`} role="status">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
          </div>
        ) : null}

        {recoveryCodes.length ? (
          <div className="sheet-measurements-empty">
            <strong>Save these recovery codes now</strong>
            <p>Each code works once if Google Authenticator is unavailable. They cannot be shown again.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontFamily: 'monospace' }}>
              {recoveryCodes.map((item) => <code key={item}>{item}</code>)}
            </div>
            <button type="button" className="um-btn-ghost" onClick={() => setRecoveryCodes([])} style={{ marginTop: 12 }}>I have saved these codes</button>
          </div>
        ) : account.twoFactorEnabled ? (
          <>
            <p className="dup-clean"><CheckCircle size={15} strokeWidth={1.8} /> On, with {account.recoveryCodesLeft} recovery code{account.recoveryCodesLeft === 1 ? '' : 's'} left.</p>
            {account.recoveryCodesLeft <= 2 ? (
              <p className="sheet-measurements-empty">
                You are nearly out of recovery codes. Turn two-factor off and set it up again to be
                issued a fresh set.
              </p>
            ) : null}
            {/* Changing phone: turn it off with a current code, then set the new
                phone up at the next sign-in. */}
            <div className="two-factor-off">
              <label className="os-field">
                <span>Code from your app, or a recovery code</span>
                <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" />
              </label>
              <button type="button" onClick={() => setConfirmDisable(true)} disabled={busy || !code.trim()}>
                Turn off
              </button>
            </div>
          </>
        ) : setup ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <p style={{ margin: 0 }}>Scan this QR code in Google Authenticator, then enter the six-digit code it shows.</p>
            <img src={setup.qr} alt="Google Authenticator setup QR code" width="220" height="220" />
            <details><summary>Cannot scan the QR code?</summary><code style={{ wordBreak: 'break-all' }}>{setup.secret}</code></details>
            <label className="os-field" style={{ width: '100%' }}><span>Six-digit code</span><input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" /></label>
            <div style={{ display: 'flex', gap: 8 }}><button type="button" className="um-btn-ghost" onClick={() => { setSetup(null); setCode(''); }}>Cancel</button><button type="button" className="os-release-btn" style={{ width: 'auto' }} onClick={confirmSetup} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm and turn on'}</button></div>
          </div>
        ) : (
          <p className="sheet-measurements-empty">
            Two-factor sign-in is off. <button type="button" className="um-btn-ghost" onClick={startSetup} disabled={busy}>{busy ? 'Starting…' : 'Set up Google Authenticator'}</button>
          </p>
        )}
      </div>
      {confirmDisable ? (
        <ConfirmDialog
          title="Turn off two-factor sign-in?"
          text="Your Owner account will return to PIN-only login. You can set Google Authenticator up again later."
          confirmLabel="Yes, turn it off"
          busy={busy}
          onConfirm={turnOff}
          onCancel={() => setConfirmDisable(false)}
        />
      ) : null}
    </section>
  );
}

export default function SettingsPage({ onLogout }) {
  const [settings, setSettings] = useState(null);
  const [account, setAccount] = useState(null);
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
    api.get('/oms/auth/me')
      .then((response) => setAccount(response.data?.data?.staff || null))
      .catch(() => setAccount(null));
  }, []);

  const reloadAccount = async () => {
    const response = await api.get('/oms/auth/me');
    const value = response.data?.data?.staff || null;
    setAccount(value);
    return value;
  };

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

      {account?.role === 'owner' ? <AccountSecurityPanel account={account} reload={reloadAccount} onLogout={onLogout} /> : null}

      <TwoFactorPanel />

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
                      max={field.max}
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

      {/* Every control in this panel is a plain button, so it cannot submit
          the settings form it sits inside. */}
      <CustomerRecordsPanel />

      {dirty ? <div className="settings-dirty-bar">You have unsaved changes.</div> : null}
    </form>
  );
}
