import { useRef, useState } from 'react';
import { ArrowLeft, Edit2, Plus, User, Ruler, ShoppingBag, FileText, Clock, StickyNote, Save, X, MapPin, Phone, Star, ChevronRight } from 'lucide-react';
import { money, invoiceApprovalStatus } from '../../utils/oms';
import { Status } from '../../components/oms/Common';
import { api } from '../../lib/api';

export default function CustomerProfilePage({ customer, sentInvoices = [], onBack, onEdit, onViewOrders, onOpenOrder }) {
  const invoices = sentInvoices.filter((invoice) => invoice.customer === customer.fullName);
  const measurements = customer.measurements || {};
  const measurementRows = [
    ['Height', measurements.height || '178 cm'], ['Chest', measurements.chest || '42 in'],
    ['Waist', measurements.waist || '34 in'], ['Hip', measurements.hip || '41 in'],
    ['Shoulder', measurements.shoulder || '18 in'], ['Sleeve', measurements.sleeve || '24 in'],
    ['Neck', measurements.neck || '16 in'], ['Trouser', measurements.trouser || '31 in'],
  ];
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(customer.notes || '');
  const [notesDraft, setNotesDraft] = useState(customer.notes || '');
  const [notesStatus, setNotesStatus] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  // Notes live on the customer profile, so they have to round-trip to the API —
  // keeping them in component state alone loses them on the next navigation.
  const saveNotes = async () => {
    if (String(customer.id || '').startsWith('sent-')) {
      setNotesStatus('Save this customer with Edit Customer first, then notes can be stored.');
      return;
    }
    setSavingNotes(true);
    setNotesStatus('');
    try {
      await api.patch(`/oms/customers/${customer.id}`, {
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        notes: notesDraft,
      });
      setNotes(notesDraft);
      setEditingNotes(false);
      setNotesStatus('Notes saved.');
    } catch (error) {
      setNotesStatus(error.response?.data?.message || 'Could not save these notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const overviewRef = useRef(null);
  const measurementsRef = useRef(null);
  const ordersRef = useRef(null);
  const invoicesRef = useRef(null);
  const timelineRef = useRef(null);
  const notesRef = useRef(null);

  const sections = [
    { label: 'Overview', Icon: User, ref: overviewRef },
    { label: 'Measurements', Icon: Ruler, ref: measurementsRef },
    { label: 'Orders', Icon: ShoppingBag, ref: ordersRef },
    { label: 'Invoices', Icon: FileText, ref: invoicesRef },
    { label: 'Timeline', Icon: Clock, ref: timelineRef },
    { label: 'Notes', Icon: StickyNote, ref: notesRef },
  ];

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const initials = customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return (
    <div className="os-page">
      {/* Back button + actions */}
      <div className="os-page-header">
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, background: 'none',
            border: '1px solid #ddd5c8', borderRadius: 8, padding: '8px 14px',
            fontSize: 13, fontWeight: 600, color: '#5a4e42', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to Customers
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13,
              fontWeight: 600, background: '#fff', color: '#1a1611', cursor: 'pointer',
            }}
          >
            <Edit2 size={13} strokeWidth={1.8} />
            Edit Customer
          </button>
          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              border: 'none', borderRadius: 8, fontSize: 13,
              fontWeight: 700, background: '#1a1611', color: '#fff', cursor: 'pointer',
            }}
          >
            <Plus size={14} strokeWidth={2} />
            New Order
          </button>
        </div>
      </div>

      {/* Profile header card */}
      <div className="os-card">
        <div className="os-card-head">
          <div style={{
            width: 60, height: 60, borderRadius: '50%', background: '#1a1611',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>{customer.fullName}</strong>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: Number(customer.totalOrders) > 1 ? '#f0faf4' : '#fffbf0',
                color: Number(customer.totalOrders) > 1 ? '#2a7d4f' : '#7a6030',
              }}>
                {Number(customer.totalOrders) > 1 ? 'Returning' : 'New'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 6 }}>
              {customer.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#5a4e42' }}>
                  <Phone size={12} strokeWidth={1.8} style={{ color: '#c97b08' }} />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span style={{ fontSize: 13, color: '#5a4e42' }}>{customer.email}</span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#5a4e42' }}>
                <MapPin size={12} strokeWidth={1.8} style={{ color: '#c97b08' }} />
                {customer.stores?.[0] || 'Lekki'} Store
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 5 }}>
              Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2025'}
            </div>
          </div>
        </div>
        {/* Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid #f3ede5' }}>
          {[
            { label: 'Total Orders', value: customer.totalOrders || invoices.length, action: 'View all orders', onClick: onViewOrders },
            { label: 'Last Visit', value: customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', action: 'Recently' },
            { label: 'Store Credit', value: money.format(customer.storeCreditBalance || 0), action: 'View details' },
            { label: 'Preferred Store', value: customer.stores?.[0] || 'Lekki', action: 'Primary' },
          ].map(({ label, value, action, onClick }, i) => (
            <div key={label} style={{
              padding: '14px 18px', borderRight: i < 3 ? '1px solid #f3ede5' : 'none', textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1611', margin: '4px 0' }}>{value}</div>
              <div
                style={{ fontSize: 11, color: '#c97b08', cursor: onClick ? 'pointer' : 'default', fontWeight: 600 }}
                onClick={onClick}
              >{action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {sections.map(({ label, Icon, ref }) => (
          <button
            key={label}
            onClick={() => { setActiveTab(label); scrollTo(ref); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: activeTab === label ? 'none' : '1px solid #ddd5c8',
              background: activeTab === label ? '#1a1611' : 'transparent',
              color: activeTab === label ? '#fff' : '#5a4e42',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Icon size={13} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      {/* Main content + sidebar */}
      <div className="os-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Overview / Customer Summary */}
          <div ref={overviewRef} className="os-card">
            <div className="os-card-head">
              <User size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Customer Summary</strong>
                <p>Profile details and contact information</p>
              </div>
              <button
                type="button"
                onClick={onEdit}
                style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', border: '1px solid #ddd5c8', borderRadius: 7,
                  fontSize: 12, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer',
                }}
              >
                <Edit2 size={12} strokeWidth={1.8} /> Edit
              </button>
            </div>
            <div className="os-card-body">
              <div className="os-grid-2">
                {[
                  ['Full Name', customer.fullName],
                  ['Phone Number', customer.phone || '—'],
                  ['Email Address', customer.email || '—'],
                  ['Date of Birth', customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString('en-GB') : '12 Mar 1988'],
                  ['Gender', customer.gender || 'Not specified'],
                  ['Occupation', customer.occupation || '—'],
                  ['Address', customer.address || '—'],
                  ['Preferred Contact', customer.communicationPreference || 'WhatsApp'],
                  ['Customer ID', customer.customerNumber || `CUST-${String(customer.id).slice(-6)}`],
                  ['Customer Type', Number(customer.totalOrders) > 1 ? 'Returning' : 'New'],
                  ['Registration Date', customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : '—'],
                  ['Referred By', customer.referredBy || 'Walk-in'],
                  ['Preferred Store', `${customer.stores?.[0] || 'Lekki'} Store`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    <span style={{ fontSize: 13, color: '#1a1611', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div ref={ordersRef} className="os-card">
            <div className="os-card-head">
              <ShoppingBag size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Recent Orders</strong>
                <p>{invoices.length} order{invoices.length !== 1 ? 's' : ''} total</p>
              </div>
              <button
                onClick={onViewOrders}
                style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', border: '1px solid #ddd5c8', borderRadius: 7,
                  fontSize: 12, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer',
                }}
              >
                View All <ChevronRight size={12} strokeWidth={2} />
              </button>
            </div>
            <div className="os-card-body" style={{ gap: 10 }}>
              {invoices.slice(0, 4).map((invoice) => (
                <div
                  key={invoice.invoiceNumber}
                  role="button"
                  tabIndex={0}
                  onClick={() => (onOpenOrder ? onOpenOrder(invoice) : onViewOrders?.())}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); (onOpenOrder ? onOpenOrder(invoice) : onViewOrders?.()); } }}
                  style={{
                    border: '1px solid #f3ede5', borderRadius: 10, padding: '12px 14px',
                    cursor: 'pointer', background: '#faf7f3', transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f0b06' }}>{invoice.invoiceNumber}</span>
                    <Status>{invoice.orderSheet?.status || invoice.orderStatus}</Status>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1611' }}>{invoice.item}</div>
                  <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>
                    {invoice.pieces || 1} piece{invoice.pieces !== 1 ? 's' : ''} &middot; Delivery: {invoice.deliveryDate ? new Date(invoice.deliveryDate).toLocaleDateString('en-GB') : 'Not set'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{money.format(invoice.total)}</span>
                    <ChevronRight size={14} strokeWidth={1.8} style={{ color: '#c0a87a' }} />
                  </div>
                </div>
              ))}
              {!invoices.length ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a7a6a', fontSize: 13 }}>No recent orders for this customer.</div>
              ) : null}
            </div>
          </div>

          {/* Invoices */}
          <div ref={invoicesRef} className="os-card">
            <div className="os-card-head">
              <FileText size={16} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div>
                <strong>Invoices</strong>
                <p>Billing and payment history</p>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 10 }}>
              {invoices.slice(0, 4).map((invoice) => (
                <div key={`inv-${invoice.invoiceNumber}`} style={{
                  border: '1px solid #f3ede5', borderRadius: 10, padding: '12px 14px', background: '#faf7f3',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#c97b08' }}>{invoice.invoiceNumber}</span>
                    <Status>{invoiceApprovalStatus(invoice)}</Status>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1611' }}>{money.format(invoice.total)}</div>
                  <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 4 }}>
                    Payment: {invoice.paymentStatus} &middot; Created: {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : '—'}
                  </div>
                </div>
              ))}
              {!invoices.length ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a7a6a', fontSize: 13 }}>No invoices for this customer.</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="os-sidebar">
          {/* Measurements */}
          <div ref={measurementsRef} className="os-summary-card">
            <header>
              <Ruler size={15} strokeWidth={1.8} />
              <h3>Measurements</h3>
              <span style={{
                marginLeft: 'auto', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: customer.measurementsAdded ? '#e2f3e5' : '#fef0e6',
                color: customer.measurementsAdded ? '#197740' : '#b05900',
              }}>
                {customer.measurementsAdded ? 'Saved' : 'Not saved'}
              </span>
            </header>
            <div style={{ padding: '6px 0 2px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {measurementRows.map(([label, value]) => (
                  <div key={label} style={{ padding: '8px 16px', borderBottom: '1px solid #f3ede5' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 16px', fontSize: 11, color: '#8a7a6a' }}>
                Last updated: {customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('en-GB') : 'Recently'} by Store Manager
              </div>
            </div>
          </div>

          {/* Notes */}
          <div ref={notesRef} className="os-card">
            <div className="os-card-head">
              <StickyNote size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Customer Notes</strong></div>
              {editingNotes ? (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => { setNotesDraft(notes); setEditingNotes(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '1px solid #ddd5c8', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer' }}
                  >
                    <X size={11} strokeWidth={2} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={savingNotes}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '1px solid #c97b08', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#c97b08', color: '#fff', cursor: savingNotes ? 'wait' : 'pointer' }}
                  >
                    <Save size={11} strokeWidth={2} /> {savingNotes ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setNotesDraft(notes); setEditingNotes(true); }}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '1px solid #ddd5c8', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer' }}
                >
                  <Edit2 size={11} strokeWidth={1.8} /> Edit
                </button>
              )}
            </div>
            <div className="os-card-body" style={{ gap: 10 }}>
              {editingNotes ? (
                <label className="os-field">
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={6}
                    placeholder="Add notes about this customer — one per line."
                    style={{ minHeight: 120 }}
                  />
                </label>
              ) : notes.trim() ? (
                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notes.split('\n').filter((note) => note.trim()).map((note, index) => (
                    <li key={`${note}-${index}`} style={{ fontSize: 13, color: '#5a4e42', lineHeight: 1.5 }}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#8a7a6a' }}>No notes yet. Use Edit to add one.</p>
              )}
              {notesStatus ? (
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: notesStatus === 'Notes saved.' ? '#2a7d4f' : '#8a3520' }}>{notesStatus}</p>
              ) : null}
            </div>
          </div>

          {/* Activity Timeline */}
          <div ref={timelineRef} className="os-card">
            <div className="os-card-head">
              <Clock size={15} strokeWidth={1.8} style={{ color: '#c97b08' }} />
              <div><strong>Activity Timeline</strong></div>
            </div>
            <div className="os-card-body" style={{ gap: 0 }}>
              {invoices.slice(0, 4).map((invoice, index) => (
                <div key={invoice.invoiceNumber} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: ['#f0faf4', '#fffbf0', '#f0f4ff', '#faf7f3'][index % 4],
                    color: ['#2a7d4f', '#7a6030', '#3a5098', '#8a7a6a'][index % 4],
                    border: '1px solid #eee5da',
                  }}>
                    {[<FileText size={12} />, <ShoppingBag size={12} />, <User size={12} />, <Clock size={12} />][index]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>
                      {invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('en-GB') : 'Recently'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611', margin: '2px 0' }}>
                      {index === 0 ? `Invoice ${invoice.invoiceNumber} was created`
                        : index === 1 ? 'Payment confirmed by Accounts'
                        : index === 2 ? 'Production started'
                        : invoiceApprovalStatus(invoice)}
                    </div>
                    <div style={{ fontSize: 11, color: '#8a7a6a' }}>
                      {index === 0 ? 'By Store Manager' : 'Customer activity updated'}
                    </div>
                  </div>
                </div>
              ))}
              {!invoices.length ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#8a7a6a', fontSize: 13 }}>No activity recorded.</div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
