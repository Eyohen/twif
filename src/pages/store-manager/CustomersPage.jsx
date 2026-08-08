import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, UserCheck, Ruler, Calendar, Search, Plus, ChevronRight, User, FileText, Package, Edit2, Trash2, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import CustomerProfilePage from './CustomerProfilePage';
import EditCustomerPage from './EditCustomerPage';
import MeasurementsPage from './MeasurementsPage';
import CustomerOrdersPage from './CustomerOrdersPage';
import OrderDetailsPage from './OrderDetailsPage';

const KPI_COUNT = 4;

const SORT_OPTIONS = ['Name (A–Z)', 'Name (Z–A)', 'Newest first', 'Oldest first'];

export default function StoreManagerCustomersPage({ sentInvoices = [], onNavigate }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState(searchParams.get('filter') || 'All Customers');
  const [sortOrder, setSortOrder] = useState('Name (A–Z)');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [measurementCustomer, setMeasurementCustomer] = useState(null);
  const [ordersCustomer, setOrdersCustomer] = useState(null);
  const [openOrder, setOpenOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', phone: '', email: '', category: 'New' });
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

  useEffect(() => {
    api.get('/oms/customers')
      .then((response) => setCustomers(response.data?.data?.customers || []))
      .catch((error) => setMessage(error.response?.data?.message || 'Unable to load customers.'))
      .finally(() => setLoading(false));
  }, []);

  const createCustomer = async (event) => {
    event.preventDefault(); setMessage('');
    try {
      const response = await api.post('/oms/customers', createForm);
      const saved = response.data?.data?.customer;
      setCustomers((current) => [{ ...saved, totalOrders: 0, measurementsAdded: false, stores: [] }, ...current]);
      setCreateForm({ fullName: '', phone: '', email: '', category: 'New' });
      setCreating(false); setMessage('Customer created successfully.');
    } catch (error) { setMessage(error.response?.data?.message || 'Unable to create customer.'); }
  };

  const archiveCustomer = async (customer) => {
    try {
      await api.delete(`/oms/customers/${customer.id}`);
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      setMessage(`${customer.fullName} was archived.`);
    } catch (error) { setMessage(error.response?.data?.message || 'Unable to archive customer.'); }
  };

  const returning = customers.filter((customer) => Number(customer.totalOrders) > 1);
  const measured = customers.filter((customer) => customer.measurementsAdded);
  const newThisMonth = customers.filter((customer) => {
    if (!customer.createdAt) return false;
    const d = new Date(customer.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byName = (customer) => String(customer.fullName || '').trim().toLowerCase();
    const byDate = (customer) => new Date(customer.createdAt || 0).getTime();
    const comparators = {
      'Name (A–Z)': (a, b) => byName(a).localeCompare(byName(b)),
      'Name (Z–A)': (a, b) => byName(b).localeCompare(byName(a)),
      'Newest first': (a, b) => byDate(b) - byDate(a),
      'Oldest first': (a, b) => byDate(a) - byDate(b),
    };

    return customers.filter((customer) => {
      const matchesSearch = !query || [customer.fullName, customer.phone, customer.email, ...(customer.stores || [])].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesSegment = segment === 'All Customers'
        || (segment === 'Returning' && Number(customer.totalOrders) > 1)
        || (segment === 'New' && Number(customer.totalOrders) <= 1)
        || (segment === 'Measurements Saved' && customer.measurementsAdded)
        || (segment === 'No Measurements' && !customer.measurementsAdded);
      return matchesSearch && matchesSegment;
    }).sort(comparators[sortOrder] || comparators['Name (A–Z)']);
  }, [customers, search, segment, sortOrder]);

  if (editingCustomer) {
    return <EditCustomerPage
      customer={editingCustomer}
      onCancel={() => setEditingCustomer(null)}
      // The edit screen is checked first below, so it has to stand down or
      // setting the measurement customer changes nothing on screen.
      onViewMeasurements={() => { setMeasurementCustomer(editingCustomer); setEditingCustomer(null); }}
      onSave={(updated) => {
      setCustomers((current) => current.map((customer) => customer.id === updated.id ? updated : customer));
      setSelectedCustomer(updated);
      setEditingCustomer(null);
    }} />;
  }

  if (measurementCustomer) {
    return <MeasurementsPage customer={measurementCustomer} onBack={() => setMeasurementCustomer(null)} />;
  }

  if (ordersCustomer) {
    return <CustomerOrdersPage customer={ordersCustomer} sentInvoices={sentInvoices} onBack={() => setOrdersCustomer(null)} onOpenOrder={(order) => setOpenOrder(order)} />;
  }

  if (openOrder) {
    return <OrderDetailsPage order={{ ...openOrder, job: openOrder.orderSheet || {} }} onBack={() => setOpenOrder(null)} />;
  }

  if (selectedCustomer) {
    return (
      <CustomerProfilePage
        customer={selectedCustomer}
        sentInvoices={sentInvoices}
        onBack={() => setSelectedCustomer(null)}
        onEdit={() => setEditingCustomer(selectedCustomer)}
        onViewOrders={() => setOrdersCustomer(selectedCustomer)}
        onOpenOrder={(invoice) => setOpenOrder(invoice)}
        onNewInvoice={onNavigate ? (person) => onNavigate('Invoices', {
          new: '1',
          customer: person.fullName || '',
          phone: person.phone || '',
          email: person.email || '',
        }) : undefined}
      />
    );
  }

  const actionMenuItems = [
    [<User size={13} strokeWidth={1.8} />, 'View Profile'],
    [<Package size={13} strokeWidth={1.8} />, 'New Order'],
    [<FileText size={13} strokeWidth={1.8} />, 'New Invoice'],
    [<Ruler size={13} strokeWidth={1.8} />, 'View Measurements'],
    [<Calendar size={13} strokeWidth={1.8} />, 'View Orders'],
    [<Edit2 size={13} strokeWidth={1.8} />, 'Edit Customer'],
    [<Trash2 size={13} strokeWidth={1.8} />, 'Archive Customer'],
  ];

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Users size={22} strokeWidth={1.8} />
          <div>
            <h2>Customers</h2>
            <p>Manage customer profiles and create new orders</p>
          </div>
        </div>
        <button
          type="button"
          className="os-release-btn"
          style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
          onClick={() => setCreating(true)}
        >
          <Plus size={15} strokeWidth={2} />
          New Customer
        </button>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: customers.length, icon: <Users size={14} strokeWidth={1.8} /> },
          { label: 'Returning', value: returning.length, icon: <UserCheck size={14} strokeWidth={1.8} /> },
          { label: 'New This Month', value: newThisMonth.length, icon: <Calendar size={14} strokeWidth={1.8} /> },
          { label: 'Measurements Saved', value: measured.length, icon: <Ruler size={14} strokeWidth={1.8} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: '#fff', border: '1px solid #eee5da', borderRadius: 10,
            fontSize: 13, color: '#5a4e42',
          }}>
            <span style={{ color: '#c97b08' }}>{icon}</span>
            <strong style={{ color: '#1a1611', fontWeight: 700 }}>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="os-card">
        <div className="os-card-body" style={{ gap: 10 }}>
          {/* Search row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="os-field" style={{ flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff' }}>
              <Search size={15} strokeWidth={1.8} style={{ color: '#b0a090', flexShrink: 0 }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers..."
                style={{ border: 'none', outline: 'none', fontSize: 14, color: '#1a1611', background: 'transparent', flex: 1 }}
              />
            </label>
            <label className="os-field" style={{ minWidth: 160 }}>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                {['All Customers', 'Returning', 'New', 'Measurements Saved', 'No Measurements'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="os-field" style={{ minWidth: 170 }}>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort customers">
                {SORT_OPTIONS.map((item) => <option key={item} value={item}>{`Sort: ${item}`}</option>)}
              </select>
            </label>
          </div>

          {/* Tab pills */}
          <nav className="os-filter-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All Customers', 'Returning', 'New', 'Measurements Saved', 'No Measurements'].map((item) => (
              <button
                key={item}
                onClick={() => setSegment(item)}
                style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: segment === item ? 'none' : '1px solid #ddd5c8',
                  background: segment === item ? '#1a1611' : 'transparent',
                  color: segment === item ? '#fff' : '#5a4e42',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{item}</button>
            ))}
          </nav>
        </div>
      </div>

      {message ? (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#f0faf4', color: '#2a7d4f', border: '1px solid #c0e8d0', fontSize: 13 }}>
          {message}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8a7a6a', fontSize: 14 }}>Loading customers...</div>
      ) : (
        <>
          {/* Desktop table */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee5da', background: '#fff' }} className="os-customers-table-wrap os-desktop-table">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#faf7f3' }}>
                  {['Customer', 'Phone', 'Status', 'Last Visit', 'Measurements', 'Store', 'Actions'].map((col) => (
                    <th key={col} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 10).map((customer, index) => {
                  const initials = customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);
                  return (
                    <tr
                      key={customer.id}
                      style={{ borderBottom: '1px solid #f3ede5', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', background: '#0f0b06',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 800, flexShrink: 0,
                          }}>{initials}</div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f0b06' }}>{customer.fullName}</div>
                            <div style={{ fontSize: 11, color: '#8a7a6a' }}>
                              Since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '2026'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{customer.phone || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: Number(customer.totalOrders) > 1 ? '#f0faf4' : '#fffbf0',
                          color: Number(customer.totalOrders) > 1 ? '#2a7d4f' : '#7a6030',
                        }}>
                          {Number(customer.totalOrders) > 1 ? 'Returning' : 'New'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>
                        {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : `${22 - index} Jul 2026`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: customer.measurementsAdded ? '#2a7d4f' : '#8a3520',
                        }}>
                          {customer.measurementsAdded ? '✓ Saved' : '× Not saved'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{customer.stores?.[0] || 'Lekki'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
                              fontSize: 12, fontWeight: 600, background: '#fff', color: '#1a1611',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} strokeWidth={1.8} />
                            View Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Users size={40} strokeWidth={1.2} style={{ color: '#ccc', marginBottom: 12 }} />
                <div style={{ fontWeight: 700, color: '#1a1611', marginBottom: 4 }}>No customers found</div>
                <div style={{ fontSize: 13, color: '#8a7a6a' }}>No customers match your current filter or search.</div>
              </div>
            ) : null}
          </div>

          {/* Mobile card list */}
          <div className="os-customers-mobile-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.slice(0, 10).map((customer, index) => {
              const initials = customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);
              return (
                <div key={customer.id} className="os-card" style={{ overflow: 'visible' }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%', background: '#0f0b06',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 800, flexShrink: 0,
                      }}>{initials}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f0b06' }}>{customer.fullName}</div>
                        <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{customer.phone || customer.email || 'No contact info'}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0,
                      background: Number(customer.totalOrders) > 1 ? '#f0faf4' : '#fffbf0',
                      color: Number(customer.totalOrders) > 1 ? '#2a7d4f' : '#7a6030',
                    }}>
                      {Number(customer.totalOrders) > 1 ? 'Returning' : 'New'}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid #f3ede5', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Visit</div>
                      <div style={{ fontSize: 12, color: '#1a1611', marginTop: 2 }}>
                        {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : `${22 - index} Jul 2026`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Measurements</div>
                      <div style={{ fontSize: 12, color: customer.measurementsAdded ? '#2a7d4f' : '#8a3520', marginTop: 2, fontWeight: 600 }}>
                        {customer.measurementsAdded ? '✓ Saved' : '× Not saved'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Store</div>
                      <div style={{ fontSize: 12, color: '#1a1611', marginTop: 2 }}>{customer.stores?.[0] || 'Lekki'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customer Since</div>
                      <div style={{ fontSize: 12, color: '#1a1611', marginTop: 2 }}>
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2026'}
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #f3ede5', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(customer)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', border: '1px solid #ddd5c8', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, background: '#fff', color: '#1a1611',
                        cursor: 'pointer',
                      }}
                    >
                      View Profile
                      <ChevronRight size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
            {!filtered.length ? (
              <div className="os-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Users size={40} strokeWidth={1.2} style={{ color: '#ccc', marginBottom: 12 }} />
                <div style={{ fontWeight: 700, color: '#1a1611', marginBottom: 4 }}>No customers found</div>
                <div style={{ fontSize: 13, color: '#8a7a6a' }}>No customers match your current filter or search.</div>
              </div>
            ) : null}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#8a7a6a' }}>
              Showing {filtered.length ? 1 : 0}–{Math.min(10, filtered.length)} of {customers.length} customers
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['‹', '1', '2', '3', '›'].map((p) => (
                <button key={p} style={{
                  padding: '6px 10px', border: '1px solid #ddd5c8', borderRadius: 6,
                  fontSize: 13, fontWeight: p === '1' ? 700 : 400,
                  background: p === '1' ? '#1a1611' : '#fff',
                  color: p === '1' ? '#fff' : '#5a4e42', cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* New Customer Modal */}
      {creating ? (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <form
            onSubmit={createCustomer}
            style={{
              background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
              display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: '#1a1611' }}>New Customer</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8a7a6a' }}>Create a customer profile for orders and invoices.</p>
              </div>
              <button type="button" onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8a7a6a', padding: 4 }}>×</button>
            </div>
            <div className="os-grid-2">
              <label className="os-field os-field-full">
                <span>Full Name</span>
                <input value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} required placeholder="e.g. Chukwuemeka Obi" />
              </label>
              <label className="os-field">
                <span>Phone Number</span>
                <input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} required placeholder="08012345678" />
              </label>
              <label className="os-field">
                <span>Email Address</span>
                <input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} placeholder="optional" />
              </label>
              <label className="os-field os-field-full">
                <span>Customer Type</span>
                <select value={createForm.category} onChange={(event) => setCreateForm({ ...createForm, category: event.target.value })}>
                  <option>New</option>
                  <option>Returning</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setCreating(false)}
                style={{
                  flex: 1, padding: '11px', border: '1px solid #ddd5c8', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, background: '#fff', color: '#5a4e42', cursor: 'pointer',
                }}
              >Cancel</button>
              <button type="submit" className="os-release-btn" style={{ flex: 2, padding: '11px' }}>
                <Plus size={15} strokeWidth={2} />
                Create Customer
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
