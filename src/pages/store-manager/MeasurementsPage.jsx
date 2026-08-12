import { Fragment, useState } from 'react';
import { ArrowLeft, Printer, Edit2, Save, X, Ruler, ChevronRight, User, Phone, Mail, Clock } from 'lucide-react';
import { api } from '../../lib/api';

// The measurements a tailor takes. Every one starts empty: a chart that
// arrives pre-filled with 16in neck and 42in chest is a garment cut wrong.
// The set the shop actually measures to, grouped the way a tailor works.
// "Length" appears under both Top and Bottom and means different things, so a
// field is keyed by its group as well as its name.
export const MEASUREMENT_GROUPS = [
  { group: 'Top', fields: ['Shoulder', 'Sleeve', 'Chest', 'Stomach', 'Length', 'Round Sleeve', 'Neck'] },
  { group: 'Bottom', fields: ['Waist', 'Lap', 'Hip', 'Length', 'Calf', 'Ankle'] },
  {
    group: 'Others',
    fields: [
      'Agbada Length', 'Agbada Sleeve', 'Cap', 'Nipple to Nipple', 'Half Length',
      'Half Back', 'Inseam Length', 'Mini Skirt', 'Midi Skirt', 'Knee Length',
    ],
  },
];

export const MEASUREMENT_FIELDS = MEASUREMENT_GROUPS.flatMap(({ group, fields }) =>
  fields.map((label) => ({ group, label, key: `${group}_${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '_') })));

// Measurements taken before this set existed were stored under bare names.
// They are read under the old key when the new one is empty, so nobody's
// figures disappear the day the list changes.
const LEGACY_KEYS = {
  top_shoulder: 'shoulder', top_chest: 'chest', top_neck: 'neck',
  top_length: 'toplength', top_sleeve: 'sleevelength',
  bottom_waist: 'trouserwaist', bottom_hip: 'trouserhip', bottom_length: 'trouserlength(outseam)',
};

const readValue = (stored, key) => stored[key] ?? stored[LEGACY_KEYS[key]] ?? '';

function BodyFigure({ back = false }) {
  return (
    <svg className="measurement-body" viewBox="0 0 180 410" aria-label={back ? 'Back body measurement diagram' : 'Front body measurement diagram'}>
      <g fill="none" stroke="#8a8f95" strokeWidth="1.3">
        <ellipse cx="90" cy="39" rx="22" ry="29" />
        <path d="M70 60 48 76 34 147 25 221M110 60l22 16 14 71 9 74M54 75l7 117-8 79-4 109M126 75l-7 117 8 79 4 109M61 192l29 8 29-8M90 200v176M49 380l-12 8m94-8 12 8M25 221l-8 38m138-38 8 38" />
      </g>
      <g stroke="#d88b00" strokeWidth="1.2" strokeDasharray="3 2" fill="none">
        <path d="M67 68h46" /><path d="M54 91h72" /><path d="M58 126h64" />
        <path d="M59 163h62" /><path d="M52 198h76" /><path d="M47 79l-13 144" />
        <path d="M126 80v105" /><path d="M90 200v174" />
      </g>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((number, index) => (
        <g key={number}>
          <circle
            cx={[65, 54, 90, 58, 90, 127, 34, 119][index]}
            cy={[68, 91, 126, 163, 198, 83, 145, 163][index]}
            r="7" fill="#d88b00"
          />
          <text
            x={[65, 54, 90, 58, 90, 127, 34, 119][index]}
            y={[71, 94, 129, 166, 201, 86, 148, 166][index]}
            fill="#fff" textAnchor="middle" fontSize="7"
          >{number}</text>
        </g>
      ))}
    </svg>
  );
}

export default function MeasurementsPage({ customer, onBack, onSaved }) {
  const stored = customer.measurements || {};
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => Object.fromEntries(
    MEASUREMENT_FIELDS.map((field) => [field.key, readValue(stored, field.key)])
  ));
  const [draft, setDraft] = useState(values);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const recorded = MEASUREMENT_FIELDS.filter((field) => String(values[field.key] ?? '').trim()).length;

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Most people in the customer list exist only because an invoice was
      // raised for them — they have no profile, and measurements have nowhere
      // to be stored. Rather than refusing, the profile is created from what
      // the invoice already knows and the measurements saved against it.
      let customerId = customer.id;
      if (String(customerId || '').startsWith('sent-')) {
        if (!String(customer.email || '').trim()) {
          setMessage('This customer has no email address. Add one with Edit Customer, then save their measurements.');
          setSaving(false);
          return;
        }
        const created = await api.post('/oms/customers', {
          fullName: customer.fullName,
          phone: customer.phone || '',
          email: customer.email,
          category: 'Active',
        });
        customerId = created.data?.data?.customer?.id;
        if (!customerId) throw new Error('The customer profile could not be created.');
      }

      // Only the profile block is carried over; the rest of `measurements`
      // holds unrelated profile fields that must not be flattened away.
      await api.patch(`/oms/customers/${customerId}`, {
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        ...(stored.profile || {}),
        measurements: draft,
      });
      setValues(draft);
      setEditing(false);
      setMessage(customerId === customer.id
        ? 'Measurements saved.'
        : `Profile created for ${customer.fullName}, and their measurements saved.`);
      onSaved?.(draft, customerId);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Measurements could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const initials = customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);
  const isReturning = Number(customer.totalOrders) > 1;

  return (
    <div className="os-page">

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a7a6a' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            color: '#5a4e42', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} /> Customers
        </button>
        <ChevronRight size={12} />
        <span>{customer.fullName}</span>
        <ChevronRight size={12} />
        <span>Measurements</span>
      </div>

      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Ruler size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>Measurements</h2>
            <p>View and manage customer body measurements</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Print / PDF, Edit Measurements and Use for New Order were all
              inert, and there was no way to record a measurement at all. */}
          <button
            type="button"
            className="measurement-action"
            onClick={() => window.print()}
          >
            <Printer size={13} /> Print / PDF
          </button>
          {editing ? (
            <>
              <button
                type="button"
                className="measurement-action"
                onClick={() => { setDraft(values); setEditing(false); setMessage(''); }}
              >
                <X size={13} /> Cancel
              </button>
              <button
                type="button"
                className="measurement-action is-primary"
                onClick={save}
                disabled={saving}
              >
                <Save size={13} /> {saving ? 'Saving…' : 'Save measurements'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="measurement-action is-primary"
              onClick={() => { setDraft(values); setEditing(true); setMessage(''); }}
            >
              <Edit2 size={13} /> {recorded ? 'Edit measurements' : 'Add measurements'}
            </button>
          )}
        </div>
      </div>

      {/* Customer Hero Card */}
      <div className="os-card">
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span style={{
            width: 52, height: 52, borderRadius: '50%', background: '#e8f0fc', color: '#2a65c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>{initials}</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#1a1611' }}>{customer.fullName}</h3>
              <span style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: isReturning ? '#eaf7ee' : '#fffbf0',
                color: isReturning ? '#168647' : '#7a6030',
              }}>
                {isReturning ? 'Returning Customer' : 'New Customer'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                <Phone size={11} /> {customer.phone || '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                <Mail size={11} /> {customer.email || '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                <User size={11} /> {customer.stores?.[0] || 'Lekki'} Store
              </span>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#b0a090', marginTop: 4 }}>
              <Clock size={10} />
              Last updated: {customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('en-GB') : 'Recently'} by Bola
            </span>
          </div>

          {/* Meta Chips */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              ['Measurement Set', '#3'],
              ['Created On', customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : '—'],
              ['Last Updated', customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('en-GB') : '—'],
              ['Total Orders Using', `${customer.totalOrders || 0} orders`],
            ].map(([label, value]) => (
              <div key={label} style={{
                background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 8,
                padding: '8px 12px', minWidth: 90,
              }}>
                <small style={{ display: 'block', fontSize: 11, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</small>
                <strong style={{ fontSize: 13, color: '#1a1611' }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* A tab strip offering Measurement History and Notes stood here, but
            neither is kept for a customer, so both tabs did nothing. */}
      </div>

      {/* Content: Table + Diagram */}
      <div className="os-layout">

        {/* Measurement Table */}
        <div className="os-card">
          <div className="os-card-head">
            <Ruler size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
            <div><strong>Body Measurements</strong><p>All values in inches</p></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Measurement', 'Value', 'Units', 'Fit Note'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '11px 14px', fontSize: 11,
                      color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: '#faf7f3', borderBottom: '1px solid #eee5da',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEASUREMENT_FIELDS.map(({ group, label, key }, index) => {
                  const value = String(values[key] ?? '').trim();
                  const startsGroup = index === 0 || MEASUREMENT_FIELDS[index - 1].group !== group;
                  return (
                    <Fragment key={key}>
                    {/* The three groups are how a tailor reads the sheet. */}
                    {startsGroup ? (
                      <tr>
                        <th colSpan={5} style={{
                          textAlign: 'left', padding: '9px 14px', fontSize: 11, fontWeight: 800,
                          color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: '#f6f1e8', borderBottom: '1px solid #eee5da',
                        }}>{group}</th>
                      </tr>
                    ) : null}
                    <tr
                      style={{ borderBottom: '1px solid #f3ede5' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td data-label="#" style={{ padding: '11px 14px', fontSize: 12, color: '#b0a090', width: 40 }}>{index + 1}</td>
                      <td data-label="Measurement" style={{ padding: '11px 14px' }}>
                        <strong style={{ fontSize: 13, color: '#1a1611' }}>{label}</strong>
                      </td>
                      <td data-label="Value" style={{ padding: '11px 14px' }}>
                        {editing ? (
                          <input
                            className="measurement-input"
                            inputMode="decimal"
                            value={draft[key] ?? ''}
                            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                            placeholder="—"
                            aria-label={label}
                          />
                        ) : (
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                            background: value ? '#fff0df' : '#f2efe9',
                            color: value ? '#c06a00' : '#a0917f', fontSize: 13, fontWeight: 700,
                          }}>{value || '—'}</span>
                        )}
                      </td>
                      <td data-label="Unit" style={{ padding: '11px 14px', fontSize: 12, color: '#8a7a6a' }}>in</td>
                      <td data-label="Notes" style={{ padding: '11px 14px', fontSize: 12, color: '#5a4e42' }}>
                        {value ? '' : 'Not measured'}
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{
            padding: '12px 18px', borderTop: '1px solid #eee5da',
            fontSize: 12, color: '#8a7a6a', background: '#faf7f3',
          }}>
            All measurements are in inches. Ensure the customer stands straight and relaxed during measurement.
          </div>
        </div>

        {/* Sidebar: Diagram + Additional Info */}
        <aside className="os-sidebar">

          <div className="os-card">
            <div className="os-card-head">
              <div>
                <strong>Measurement Diagram</strong>
                <p>Front and back reference points</p>
              </div>
              {/* An Inches / cm switch sat here and converted nothing. Every
                  measurement in the system is recorded in inches. */}
              <span style={{
                marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, fontSize: 11,
                fontWeight: 600, border: '1px solid #ddd5c8', color: '#5a4e42', background: '#faf7f3',
              }}>Inches</span>
            </div>
            <div className="os-card-body">
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <BodyFigure />
                <BodyFigure back />
              </div>
              <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {MEASUREMENT_FIELDS.map(({ key, group, label }, index) => (
                  <li key={key} style={{ fontSize: 11, color: '#5a4e42' }}>
                    <strong style={{ color: '#c97b08', marginRight: 4 }}>{index + 1}</strong>
                    {group === 'Others' ? label : `${group} ${label.toLowerCase()}`}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="os-summary-card">
            <header>
              <User size={14} strokeWidth={1.5} />
              <h3>Additional Information</h3>
            </header>
            <dl>
              <dt>Posture</dt><dd>Normal</dd>
              <dt>Body Build</dt><dd>Average</dd>
              <dt>Preferred Fit</dt><dd>{customer.preferredFit || 'Regular Fit'}</dd>
              <dt>Remarks</dt><dd style={{ fontSize: 12, lineHeight: 1.5 }}>{customer.notes || 'No remarks recorded.'}</dd>
            </dl>
          </div>

        </aside>
      </div>
    </div>
  );
}
