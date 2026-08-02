import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Status } from '../../components/oms/Common';

const fallbackStaff = [
  { id: '1', displayName: 'Jim (Admin)', role: 'admin', store: 'Head Office', phone: '0803 123 4567', status: 'active', lastLoginAt: '2026-07-30T09:25:00', device: 'Chrome on Windows' },
  { id: '2', displayName: 'Bola (Accountant)', role: 'accounts', store: 'Head Office', phone: '0806 234 5678', status: 'active', lastLoginAt: '2026-07-29T16:40:00', device: 'Safari on iPhone' },
  { id: '3', displayName: 'Tunde (Tailor)', role: 'tailor', store: 'Lekki Store', phone: '0806 345 6789', status: 'active', lastLoginAt: '2026-07-30T09:12:00', device: 'Android App' },
  { id: '4', displayName: 'Ada (Store Manager)', role: 'store_manager', store: 'Victoria Island', phone: '0807 456 7890', status: 'active', lastLoginAt: '2026-07-28T11:32:00', device: 'Chrome on Windows' },
  { id: '5', displayName: 'Chinedu (Tailor)', role: 'tailor', store: 'Yaba Store', phone: '0808 567 8901', status: 'inactive', lastLoginAt: '2026-07-23T09:00:00', device: 'Android App' },
];

const roleLabel = (role) => ({ admin: 'Admin', accounts: 'Accountant', tailor: 'Tailor', store_manager: 'Store Manager', production_manager: 'Production', inventory_manager: 'Inventory' }[role] || role);
const blankForm = { displayName: '', fullName: '', phone: '', dateOfBirth: '', role: 'tailor', store: 'Lekki Store', tailorDepartment: 'native', tailorGrade: '1', pin: '', confirmPin: '', authCode: '' };

export default function UserManagementPage({ currentRole }) {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [screen, setScreen] = useState('list');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/oms/staff').then((response) => {
      const users = response.data?.data?.staffUsers || [];
      setStaff(users.length ? users : fallbackStaff);
    }).catch(() => setStaff(fallbackStaff));
  }, []);

  const filtered = useMemo(() => staff.filter((person) => `${person.displayName} ${person.role} ${person.phone}`.toLowerCase().includes(search.toLowerCase())), [staff, search]);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const openAdd = () => { setForm(blankForm); setScreen('add'); };
  const openProfile = (person) => { setSelected(person); setScreen('profile'); };
  const openEdit = () => {
    setForm({ ...blankForm, ...selected, fullName: selected.displayName?.replace(/\s*\(.+\)$/, '') || '' });
    setScreen('edit');
  };
  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form, displayName: form.displayName || form.fullName, ownerPhone: currentRole.phone, ownerPin: currentRole.pin };
    try {
      if (screen === 'edit') {
        const response = await api.patch(`/oms/staff/${selected.id}`, payload);
        const updated = response.data?.data?.staffUser || { ...selected, ...payload };
        setStaff((current) => current.map((person) => person.id === selected.id ? updated : person));
        setSelected(updated);
        setScreen('profile');
      } else {
        const response = await api.post('/oms/staff', payload);
        setStaff((current) => [response.data?.data?.staffUser || { ...payload, id: crypto.randomUUID(), status: 'active' }, ...current]);
        setScreen('list');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save staff account.');
    }
  };
  const setStatus = (status) => {
    setStaff((current) => current.map((person) => person.id === selected.id ? { ...person, status } : person));
    setSelected((current) => ({ ...current, status }));
    setModal(null);
  };

  if (screen === 'add' || screen === 'edit') return <StaffForm mode={screen} form={form} update={update} onCancel={() => setScreen(screen === 'edit' ? 'profile' : 'list')} onSubmit={save} message={message} />;
  if (screen === 'history') return <LoginHistory person={selected} onBack={() => setScreen('profile')} />;
  if (screen === 'profile') return <StaffProfile person={selected} onBack={() => setScreen('list')} onEdit={openEdit} onHistory={() => setScreen('history')} onModal={setModal} modal={modal} setStatus={setStatus} />;

  return <div className="user-management-page">
    <header className="user-management-actions"><button onClick={openAdd}>＋ &nbsp; Add Staff</button></header>
    <section className="staff-kpis">{[['Total Staff', staff.length, 'All staff members'], ['Active Staff', staff.filter((p) => p.status === 'active').length, 'Currently active'], ['Inactive Staff', staff.filter((p) => p.status !== 'active').length, 'Not active'], ['Birthdays This Month', 3, 'Celebrate with your team']].map(([label, value, detail]) => <article key={label}><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="staff-register"><header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff by name, role or phone..." /></label><select><option>All Roles</option></select><select><option>All Stores</option></select><select><option>All Statuses</option></select><button>▽ &nbsp; Filter</button></header><table><thead><tr><th>Staff</th><th>Role</th><th>Store</th><th>Phone</th><th>Tailor Grade</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((person, index) => <tr key={person.id}><td><div className="staff-person"><i>{person.displayName?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span><strong>{person.displayName}</strong><small>{person.displayName?.replace(/\s*\(.+\)$/, '')}</small></span></div></td><td><b className={`staff-role role-${person.role}`}>{roleLabel(person.role)}</b></td><td>{person.store}</td><td>{person.phone}</td><td>{person.role === 'tailor' ? <b className="tailor-grade">Grade {person.tailorGrade || 1}</b> : '—'}</td><td>{person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleString('en-GB') : 'Never'}<small>{person.device || ['Chrome on Windows', 'Safari on iPhone', 'Android App'][index % 3]}</small></td><td><Status>{person.status}</Status></td><td><button onClick={() => openProfile(person)}>•••</button></td></tr>)}</tbody></table><footer>Showing 1 to {filtered.length} of {staff.length} staff <span>‹ &nbsp; <b>1</b> &nbsp; 2 &nbsp; 3 &nbsp; 4 &nbsp; 5 &nbsp; ›</span></footer></section>
  </div>;
}

function StaffForm({ mode, form, update, onCancel, onSubmit, message }) {
  return <form className="staff-form-page" onSubmit={onSubmit}><header><h2>{mode === 'edit' ? 'Edit Staff' : 'Add New Staff'}</h2><p>{mode === 'edit' ? 'Update staff information. Google Auth code required to save.' : 'Create a new staff account. Google Auth code required to save.'}</p></header>{message && <div className="invoice-message">{message}</div>}<section><h3>Personal Information</h3><div className="staff-form-grid"><label>Full Name *<input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required /></label><label>Display Name *<input value={form.displayName} onChange={(e) => update('displayName', e.target.value)} required /></label><label>Phone Number *<input value={form.phone} onChange={(e) => update('phone', e.target.value)} required /></label><label>Date of Birth *<input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} /></label></div><div className="staff-photo">PO <button type="button">▣ &nbsp; Change Photo</button></div><hr/><h3>Work Information</h3><div className="staff-form-grid"><label>Role *<select value={form.role} onChange={(e) => update('role', e.target.value)}><option value="tailor">Tailor</option><option value="store_manager">Store Manager</option><option value="accounts">Accountant</option><option value="production_manager">Production</option><option value="admin">Admin</option></select></label><label>Assigned Store *<select value={form.store} onChange={(e) => update('store', e.target.value)}><option>Lekki Store</option><option>Head Office</option><option>Victoria Island</option><option>Yaba Store</option></select></label>{form.role === 'tailor' && <><label>Tailor Department *<select value={form.tailorDepartment} onChange={(e) => update('tailorDepartment', e.target.value)}><option value="native">Native</option><option value="suit">Suits</option><option value="trouser">Trouser</option><option value="finishing">Finishing</option></select></label><label>Tailor Grade *<select value={form.tailorGrade} onChange={(e) => update('tailorGrade', e.target.value)}>{[1, 2, 3, 4, 5].map((grade) => <option value={grade} key={grade}>Grade {grade}</option>)}</select></label></>}</div>{mode === 'add' && <><h3>Login Information</h3><div className="staff-form-grid"><label>Initial PIN *<input type="password" value={form.pin} onChange={(e) => update('pin', e.target.value)} required /></label><label>Confirm PIN *<input type="password" value={form.confirmPin} onChange={(e) => update('confirmPin', e.target.value)} required /></label></div></>}<h3>Security Verification</h3><label>Google Auth Code *<input className="auth-code-input" value={form.authCode} onChange={(e) => update('authCode', e.target.value)} placeholder="123 456" required /></label><footer><button type="button" onClick={onCancel}>Cancel</button><button>{mode === 'edit' ? 'Save Changes' : 'Create Staff'}</button></footer></section></form>;
}

function StaffProfile({ person, onBack, onEdit, onHistory, onModal, modal, setStatus }) {
  return <div className="staff-profile-page"><p><button onClick={onBack}>Staff Management</button> &nbsp;›&nbsp; Staff Profile</p><header><i>{person.displayName?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span><h2>{person.displayName} <Status>{person.status}</Status></h2><p>{roleLabel(person.role)} {person.role === 'tailor' ? `• Grade ${person.tailorGrade || 1}` : ''} &nbsp;•&nbsp; {person.store}</p><small>Phone: {person.phone} &nbsp;•&nbsp; DOB: 14 Mar 1992</small></span><div><button onClick={onEdit}>⌕ &nbsp; Edit Staff</button><button onClick={() => onModal('reset')}>♧ &nbsp; Reset PIN</button><button className="danger" onClick={() => onModal(person.status === 'active' ? 'deactivate' : 'reactivate')}>{person.status === 'active' ? 'Deactivate' : 'Reactivate'}</button></div></header><nav><button className="active">Overview</button><button onClick={onHistory}>Login History</button><button>Activity</button></nav><section className="staff-profile-grid"><article><h3>Personal Information</h3><dl><dt>Full Name</dt><dd>{person.displayName}</dd><dt>Display Name</dt><dd>{person.displayName}</dd><dt>Phone Number</dt><dd>{person.phone}</dd><dt>Date of Birth</dt><dd>14 Mar 1992</dd></dl><hr/><h3>Work Information</h3><dl><dt>Role</dt><dd>{roleLabel(person.role)}</dd><dt>Assigned Store</dt><dd>{person.store}</dd>{person.role === 'tailor' && <><dt>Department</dt><dd>{person.tailorDepartment || 'Native'}</dd><dt>Tailor Grade</dt><dd><b className="tailor-grade">Grade {person.tailorGrade || 1}</b></dd></>}<dt>Status</dt><dd>{person.status}</dd><dt>Date Created</dt><dd>22 May 2024, 09:15 AM</dd></dl></article><article><h3>Login Summary</h3><dl><dt>Last Login</dt><dd>Today, 09:25 AM<br/>Chrome on Windows</dd><dt>Last PIN Reset</dt><dd>18 May 2024, 02:40 PM</dd><dt>Login Attempts</dt><dd>Last 30 days: 12 Successful, 1 Failed</dd></dl><hr/><h3>Recent Login History</h3>{['Chrome on Windows', 'Android App', 'Chrome on Windows', 'iPhone (Safari)'].map((device, i) => <p key={`${device}-${i}`}>Today, 09:25 AM <span>{device}</span><Status>{i === 2 ? 'Failed' : 'Success'}</Status></p>)}</article></section>{modal && <StaffModal type={modal} person={person} close={() => onModal(null)} confirm={() => setStatus(modal === 'deactivate' ? 'inactive' : modal === 'reactivate' ? 'active' : person.status)} />}</div>;
}

function StaffModal({ type, person, close, confirm }) {
  const titles = { reset: 'Reset PIN', deactivate: 'Deactivate Staff', reactivate: 'Reactivate Staff' };
  return <div className="staff-modal-backdrop"><section className={`staff-modal ${type}`}><button onClick={close}>×</button><h2>{titles[type]}</h2>{type !== 'reset' && <div className="modal-callout">{type === 'deactivate' ? '△' : '✓'}<p>{type === 'deactivate' ? 'Are you sure you want to deactivate' : 'You are about to reactivate'}<strong>{person.displayName}</strong></p></div>}<label>New PIN *<input type="password" defaultValue="1234" /></label><label>Confirm New PIN *<input type="password" defaultValue="1234" /></label><label>Google Auth Code *<input defaultValue="123 456" /></label><footer><button onClick={close}>Cancel</button><button onClick={confirm}>{type === 'reset' ? 'Reset PIN' : type === 'deactivate' ? 'Deactivate Staff' : 'Reactivate Staff'}</button></footer></section></div>;
}

function LoginHistory({ person, onBack }) {
  return <div className="staff-login-history"><p><button onClick={onBack}>Staff Management</button> &nbsp;›&nbsp; {person.displayName} &nbsp;›&nbsp; Login History</p><header><div><h2>Login History</h2><span>View all login attempts for this staff member.</span></div><div><select><option>All Statuses</option></select><button>▣ &nbsp; 01 May 2024 - 22 May 2024</button><button>⇩ &nbsp; Export</button></div></header><table><thead><tr><th>Date &amp; Time</th><th>Device</th><th>Browser / App</th><th>IP Address</th><th>Status</th><th>Location</th></tr></thead><tbody>{Array.from({ length: 7 }, (_, index) => <tr key={index}><td>{22 - index} May 2024, 09:25 AM</td><td>{index % 2 ? 'Android 13' : 'Windows 10'}</td><td>{index % 2 ? 'TWIF Android App' : 'Chrome 124'}</td><td>197.210.45.{12 + index}</td><td><Status>{index === 2 || index === 5 ? 'Failed' : index === 3 ? 'Blocked' : 'Success'}</Status></td><td>Lagos, Nigeria</td></tr>)}</tbody></table></div>;
}
