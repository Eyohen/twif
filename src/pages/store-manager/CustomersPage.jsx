import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import CustomerProfilePage from './CustomerProfilePage';
import EditCustomerPage from './EditCustomerPage';
import MeasurementsPage from './MeasurementsPage';
import CustomerOrdersPage from './CustomerOrdersPage';

export default function StoreManagerCustomersPage({ sentInvoices = [] }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('All Customers');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [measurementCustomer, setMeasurementCustomer] = useState(null);
  const [ordersCustomer, setOrdersCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', phone: '', email: '', category: 'New' });

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
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch = !query || [customer.fullName, customer.phone, customer.email, ...(customer.stores || [])].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesSegment = segment === 'All Customers'
        || (segment === 'Returning' && Number(customer.totalOrders) > 1)
        || (segment === 'New' && Number(customer.totalOrders) <= 1)
        || (segment === 'Measurements Saved' && customer.measurementsAdded)
        || (segment === 'No Measurements' && !customer.measurementsAdded);
      return matchesSearch && matchesSegment;
    });
  }, [customers, search, segment]);

  if (editingCustomer) {
    return <EditCustomerPage customer={editingCustomer} onCancel={() => setEditingCustomer(null)} onSave={(updated) => {
      setCustomers((current) => current.map((customer) => customer.id === updated.id ? updated : customer));
      setSelectedCustomer(updated);
      setEditingCustomer(null);
    }} />;
  }

  if (measurementCustomer) {
    return <MeasurementsPage customer={measurementCustomer} onBack={() => setMeasurementCustomer(null)} />;
  }

  if (ordersCustomer) {
    return <CustomerOrdersPage customer={ordersCustomer} sentInvoices={sentInvoices} onBack={() => setOrdersCustomer(null)} />;
  }

  if (selectedCustomer) {
    return <CustomerProfilePage customer={selectedCustomer} sentInvoices={sentInvoices} onBack={() => setSelectedCustomer(null)} onEdit={() => setEditingCustomer(selectedCustomer)} />;
  }

  return (
    <div className="store-customers-page">
      <div className="store-customer-create"><button type="button" onClick={() => setCreating(true)}>＋ &nbsp; New Customer</button></div>
      <section className="store-customer-kpis">
        {[
          ['♙', 'All Customers', customers.length, 'View all customers', 'gold'],
          ['♧', 'Returning Customers', returning.length, `${customers.length ? Math.round((returning.length / customers.length) * 100) : 0}% of total`, 'green'],
          ['⌁', 'Measurements Saved', measured.length, `${customers.length ? Math.round((measured.length / customers.length) * 100) : 0}% of total`, 'purple'],
          ['♙', 'Visited This Month', customers.length, '+8 from last month', 'blue'],
        ].map(([icon, label, value, detail, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong><b>{detail}</b></span></article>)}
      </section>
      <section className="store-customer-register">
        <header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, phone, email or invoice number..." /></label><button>♧ &nbsp; Filters &nbsp;⌄</button></header>
        <nav><div>{['All Customers', 'Returning', 'New', 'Measurements Saved', 'No Measurements'].map((item) => <button className={segment === item ? 'active' : ''} onClick={() => setSegment(item)} key={item}>{item}</button>)}</div><select><option>Sort by: Last Visit (Recent)</option><option>Customer name</option></select></nav>
        {message ? <div className="invoice-message">{message}</div> : null}
        {loading ? <div className="invoice-preview-empty">Loading customers...</div> : <div className="store-customer-table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Status</th><th>Last Visit</th><th>Measurements</th><th>Store</th><th>Actions</th></tr></thead><tbody>
          {filtered.slice(0, 10).map((customer, index) => <tr key={customer.id}>
            <td><div className="store-customer-name"><i>{customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span><strong>{customer.fullName}</strong><small>Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '2026'}</small></span></div></td>
            <td>{customer.phone || '—'}</td><td>{customer.email || '—'}</td><td><b className={Number(customer.totalOrders) > 1 ? 'returning' : 'new'}>{Number(customer.totalOrders) > 1 ? 'Returning' : 'New'}</b></td>
            <td>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : `${22 - index} Jul 2026`}</td>
            <td><span className={customer.measurementsAdded ? 'measure-saved' : 'measure-missing'}>{customer.measurementsAdded ? '✓  Saved' : '×  Not saved'}</span></td><td>{customer.stores?.[0] || 'Lekki'}</td>
            <td className="customer-actions-cell">
              <button className="customer-more" type="button" aria-expanded={openMenuId === customer.id} aria-label={`Actions for ${customer.fullName}`} onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}>•••</button>
              {openMenuId === customer.id ? <div className="customer-action-menu">
                {[['♙', 'View Profile'], ['▱', 'New Order'], ['▤', 'New Invoice'], ['⌁', 'View Measurements'], ['▣', 'View Orders'], ['⌕', 'Edit Customer'], ['♲', 'Archive Customer']].map(([icon, label], actionIndex) => <button className={actionIndex === 6 ? 'danger' : ''} type="button" key={label} onClick={() => {
                  setOpenMenuId(null);
                  if (label === 'View Profile') setSelectedCustomer(customer);
                  if (label === 'View Measurements') setMeasurementCustomer(customer);
                  if (label === 'View Orders') setOrdersCustomer(customer);
                  if (label === 'Edit Customer') setEditingCustomer(customer);
                  if (label === 'Archive Customer') archiveCustomer(customer);
                }}><i>{icon}</i>{label}</button>)}
              </div> : null}
            </td>
          </tr>)}
        </tbody></table>{!filtered.length ? <div className="accounts-empty">No customers match this view.</div> : null}</div>}
        <div className="owner-mobile-customer-list">{filtered.slice(0, 10).map((customer, index) => (
          <article key={customer.id}>
            <header>
              <div className="customer-card-identity">
                <i className="customer-card-avatar">{customer.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i>
                <div className="customer-card-info">
                  <strong>{customer.fullName}</strong>
                  <small>{customer.phone || customer.email || 'No contact info'}</small>
                </div>
              </div>
              <span className={`customer-card-badge ${Number(customer.totalOrders) > 1 ? 'returning' : 'new'}`}>{Number(customer.totalOrders) > 1 ? 'Returning' : 'New'}</span>
            </header>
            <section>
              <div><small>Email</small><span>{customer.email || '—'}</span></div>
              <div><small>Last Visit</small><span>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : `${22-index} Jul 2026`}</span></div>
              <div><small>Measurements</small><span className={customer.measurementsAdded ? 'measure-saved' : 'measure-missing'}>{customer.measurementsAdded ? '✓ Saved' : '× Not saved'}</span></div>
              <div><small>Store</small><span>{customer.stores?.[0] || 'Lekki'}</span></div>
            </section>
            <footer>
              <span>Since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', {month:'short',year:'numeric'}) : 'Jan 2026'}</span>
              <button type="button" onClick={() => setSelectedCustomer(customer)}>View Profile &nbsp;›</button>
            </footer>
          </article>
        ))}{!filtered.length ? <div className="accounts-empty">No customers match this view.</div> : null}</div>
        <footer><span>Showing {filtered.length ? 1 : 0} to {Math.min(10, filtered.length)} of {customers.length} customers</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>{Math.max(1, Math.ceil(customers.length / 10))}</button><button>›</button></div></footer>
      </section>
      {creating ? <div className="receive-stock-backdrop"><form onSubmit={createCustomer}><button type="button" onClick={() => setCreating(false)}>×</button><h2>New Customer</h2><p>Create a customer profile that can be used for orders and invoices.</p><label>Full Name<input value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} required /></label><label>Phone Number<input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} required /></label><label>Email Address<input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} /></label><label>Customer Type<select value={createForm.category} onChange={(event) => setCreateForm({ ...createForm, category: event.target.value })}><option>New</option><option>Returning</option></select></label><footer><button type="button" onClick={() => setCreating(false)}>Cancel</button><button type="submit">Create Customer</button></footer></form></div> : null}
    </div>
  );
}
