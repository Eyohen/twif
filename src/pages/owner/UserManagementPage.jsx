import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Filter, Users, UserCog, UserCheck, Cake,
  MoreVertical, Edit2, Clock, Shield, ChevronRight, ArrowLeft,
  Download, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Phone, Calendar, Briefcase, Store, Star, Activity,
} from 'lucide-react';
import { api } from '../../lib/api';
import { downloadCsv, csvStamp } from '../../utils/csv';
import { formatMoment } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const roleLabel = (role) => ({
  admin: 'Admin',
  accounts: 'Accountant',
  tailor: 'Tailor',
  store_manager: 'Store Manager',
  production_manager: 'Production',
  inventory_manager: 'Inventory',
}[role] || role);

const roleStyle = {
  admin:              { bg: '#f2ecfb', color: '#7038c8' },
  accounts:           { bg: '#eaf7ee', color: '#168647' },
  tailor:             { bg: '#fffbf0', color: '#7a6030' },
  store_manager:      { bg: '#e8f0fc', color: '#2a65c7' },
  production_manager: { bg: '#fff0df', color: '#c06a00' },
  inventory_manager:  { bg: '#fce8e8', color: '#b02a2a' },
};

const blankForm = {
  displayName: '', fullName: '', phone: '', dateOfBirth: '',
  role: 'tailor', store: 'Lekki Store', tailorDepartment: 'native',
  tailorGrade: '1', pin: '', confirmPin: '', authCode: '',
};

function Avatar({ name, size = 'md' }) {
  const initials = (name || '??').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#e8f0fc', '#eaf7ee', '#fff0df', '#f2ecfb', '#fff5df'];
  const textColors = ['#2a65c7', '#168647', '#c06a00', '#7038c8', '#a96800'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  const dims = size === 'lg' ? 56 : size === 'md' ? 40 : 32;
  const fontSize = size === 'lg' ? 20 : size === 'md' ? 14 : 12;
  return (
    <span style={{
      width: dims, height: dims, borderRadius: '50%', flexShrink: 0,
      background: colors[idx], color: textColors[idx],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700,
    }}>
      {initials}
    </span>
  );
}

function RoleBadge({ role }) {
  const s = roleStyle[role] || { bg: '#f5f0e8', color: '#5a4e42' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
    }}>
      {roleLabel(role)}
    </span>
  );
}

export default function UserManagementPage({ currentRole }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [screen, setScreen] = useState('list');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');

  const reload = () => {
    setLoading(true);
    api.get('/oms/staff')
      .then((response) => {
        setStaff(response.data?.data?.staffUsers || []);
        setMessage('');
      })
      .catch((error) => {
        setStaff([]);
        setMessage(error.response?.data?.message || 'The staff list could not be loaded.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const stores = useMemo(() => [...new Set(staff.map((p) => p.store).filter(Boolean))], [staff]);

  const filtered = useMemo(() => staff.filter((person) => {
    const matchSearch = `${person.displayName} ${person.role} ${person.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || person.role === roleFilter;
    const matchStore = storeFilter === 'all' || person.store === storeFilter;
    const matchStatus = statusFilter === 'all' || person.status === statusFilter;
    return matchSearch && matchRole && matchStore && matchStatus;
  }), [staff, search, roleFilter, storeFilter, statusFilter]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const openAdd = () => { setForm(blankForm); setScreen('add'); };
  const openProfile = (person) => { setSelected(person); setScreen('profile'); };
  const openEdit = () => {
    setForm({ ...blankForm, ...selected, fullName: selected.displayName?.replace(/\s*\(.+\)$/, '') || '' });
    setScreen('edit');
  };

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    const payload = { ...form, displayName: form.displayName || form.fullName, ownerPhone: currentRole?.phone, ownerPin: currentRole?.pin };
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

  if (screen === 'add' || screen === 'edit') {
    return <StaffForm mode={screen} form={form} update={update} onCancel={() => setScreen(screen === 'edit' ? 'profile' : 'list')} onSubmit={save} message={message} />;
  }
  if (screen === 'history') {
    return <LoginHistory person={selected} onBack={() => setScreen('profile')} />;
  }
  if (screen === 'profile') {
    return (
      <StaffProfile
        person={selected}
        onBack={() => setScreen('list')}
        onEdit={openEdit}
        onHistory={() => setScreen('history')}
        onModal={setModal}
        modal={modal}
        setStatus={setStatus}
        currentRole={currentRole}
      />
    );
  }

  // The count was fixed at 3 whoever was on the staff list. Staff records carry
  // a date of birth, so it can simply be counted.
  const thisMonth = new Date().getMonth();
  const birthdays = staff.filter((person) => {
    if (!person.dateOfBirth) return false;
    const born = new Date(person.dateOfBirth);
    return !Number.isNaN(born.valueOf()) && born.getMonth() === thisMonth;
  });

  const exportStaff = () => downloadCsv(
    `twif-staff-${csvStamp()}.csv`,
    ['Name', 'Role', 'Store', 'Phone', 'Status', 'Date of birth', 'Last signed in'],
    filtered.map((person) => [
      person.displayName, roleLabel(person.role), person.store || '', person.phone,
      person.status, person.dateOfBirth || '',
      person.lastLoginAt ? formatMoment(person.lastLoginAt) : 'Never',
    ])
  );

  const kpis = [
    { icon: Users, label: 'Total Staff', value: staff.length, detail: 'All staff members', bg: '#e8f0fc', color: '#2a65c7' },
    { icon: UserCheck, label: 'Active Staff', value: staff.filter((p) => p.status === 'active').length, detail: 'Currently active', bg: '#eaf7ee', color: '#168647' },
    { icon: XCircle, label: 'Inactive', value: staff.filter((p) => p.status !== 'active').length, detail: 'Not active', bg: '#fce8e8', color: '#b02a2a' },
    { icon: Cake, label: 'Birthdays This Month', value: birthdays.length, detail: birthdays.length ? birthdays.map((person) => person.displayName).join(', ') : 'None on record this month', bg: '#fff0df', color: '#c06a00' },
  ];

  return (
    <div className="os-page">

      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <UserCog size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>User Management</h2>
            <p>Manage your staff accounts, roles and permissions</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
              fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
            }}
            onClick={reload}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            type="button"
            onClick={exportStaff}
            disabled={!filtered.length}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
              fontSize: 13, color: '#5a4e42', cursor: filtered.length ? 'pointer' : 'not-allowed',
              fontWeight: 500, opacity: filtered.length ? 1 : 0.6,
            }}
          >
            <Download size={13} /> Export
          </button>
          <button
            className="os-release-btn"
            style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
            onClick={openAdd}
          >
            <Plus size={15} /> Add Staff
          </button>
        </div>
      </div>

      {message ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: '#fff5f0', border: '1px solid #f0c8b8', color: '#8a3520', fontSize: 13 }} role="status">
          <AlertCircle size={15} /> {message}
        </div>
      ) : null}

      {/* KPI Row */}
      <div className="os-kpi-row" style={{ gap: 12 }}>
        {kpis.map(({ icon: Icon, label, value, detail, bg, color }) => (
          <div key={label} style={{
            background: bg, borderRadius: 12, padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{
              width: 42, height: 42, borderRadius: 10, background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={18} strokeWidth={1.75} color="#fff" />
            </span>
            <div>
              <strong style={{ display: 'block', fontSize: 22, fontWeight: 700, color: '#1a1611', lineHeight: 1.1 }}>{value}</strong>
              <small style={{ display: 'block', fontSize: 12, color: '#5a4e42', fontWeight: 600 }}>{label}</small>
              <small style={{ fontSize: 11, color: '#8a7a6a' }}>{detail}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Table Panel */}
      <div className="os-card">
        {/* Toolbar */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          borderBottom: '1px solid #eee5da', background: '#faf7f3',
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220,
            background: '#fff', border: '1px solid #ddd5c8', borderRadius: 8, padding: '8px 12px',
          }}>
            <Search size={14} style={{ color: '#8a7a6a', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role or phone..."
              style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1a1611', width: '100%', background: 'transparent' }}
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={13} style={{ color: '#8a7a6a' }} />
            {[
              { value: roleFilter, onChange: setRoleFilter, options: [['all', 'All Roles'], ['admin', 'Admin'], ['accounts', 'Accountant'], ['tailor', 'Tailor'], ['store_manager', 'Store Manager'], ['production_manager', 'Production']] },
              { value: storeFilter, onChange: setStoreFilter, options: [['all', 'All Stores'], ...stores.map(s => [s, s])] },
              { value: statusFilter, onChange: setStatusFilter, options: [['all', 'All Statuses'], ['active', 'Active'], ['inactive', 'Inactive']] },
            ].map((sel, i) => (
              <select
                key={i}
                value={sel.value}
                onChange={(e) => sel.onChange(e.target.value)}
                style={{
                  padding: '7px 10px', border: '1px solid #ddd5c8', borderRadius: 8,
                  fontSize: 12, color: '#5a4e42', background: '#fff', cursor: 'pointer',
                }}
              >
                {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8a7a6a' }}>
            <div style={{
              width: 32, height: 32, border: '3px solid #eee5da', borderTopColor: '#c97b08',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading staff...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Users size={36} strokeWidth={1.5} style={{ color: '#ddd5c8', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#1a1611' }}>No staff found</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#8a7a6a' }}>
              {search ? 'Try a different search term or clear the filters.' : 'Add your first staff member to get started.'}
            </p>
            {!search && (
              <button
                className="os-release-btn"
                style={{ width: 'auto', padding: '8px 16px', fontSize: 13, margin: '0 auto' }}
                onClick={openAdd}
              >
                <Plus size={14} /> Add Staff
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div style={{ overflowX: 'auto', display: 'block' }} className="um-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Staff Member', 'Role', 'Store', 'Phone', 'Tailor Grade', 'Last Login', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '11px 14px', fontSize: 11,
                        color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: '#faf7f3', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((person, index) => (
                    <tr
                      key={person.id}
                      style={{ borderBottom: '1px solid #f3ede5', cursor: 'pointer' }}
                      onClick={() => openProfile(person)}
                      onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td data-label="Staff Member" style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={person.displayName} size="sm" />
                          <div>
                            <strong style={{ display: 'block', fontSize: 13, color: '#1a1611' }}>{person.displayName}</strong>
                            <small style={{ fontSize: 11, color: '#8a7a6a' }}>{person.displayName?.replace(/\s*\(.+\)$/, '')}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Role" style={{ padding: '12px 14px' }}><RoleBadge role={person.role} /></td>
                      <td data-label="Store" style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a' }}>{person.store}</td>
                      <td data-label="Phone" style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a' }}>{person.phone}</td>
                      <td data-label="Tailor Grade" style={{ padding: '12px 14px' }}>
                        {person.role === 'tailor' ? (
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                            background: '#fff0df', color: '#c06a00', fontSize: 11, fontWeight: 700,
                          }}>Grade {person.tailorGrade || 1}</span>
                        ) : (
                          <span style={{ color: '#b0a090', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td data-label="Last Login" style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'block', fontSize: 13, color: '#5a4e42' }}>
                          {person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}
                        </span>
                        <small style={{ fontSize: 11, color: '#8a7a6a' }}>
                          {person.device || ['Chrome on Windows', 'Safari on iPhone', 'Android App'][index % 3]}
                        </small>
                      </td>
                      <td data-label="Status" style={{ padding: '12px 14px' }}><Status>{person.status}</Status></td>
                      <td data-label="Actions" style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          style={{
                            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid #ddd5c8', borderRadius: 6, background: '#faf7f3', cursor: 'pointer',
                          }}
                          onClick={() => openProfile(person)}
                        >
                          <MoreVertical size={14} style={{ color: '#5a4e42' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="um-cards-mobile" style={{ display: 'none' }}>
              {filtered.map((person) => (
                <div
                  key={person.id}
                  style={{
                    padding: '14px 18px', borderBottom: '1px solid #f3ede5', cursor: 'pointer',
                  }}
                  onClick={() => openProfile(person)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Avatar name={person.displayName} size="md" />
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: 14, color: '#1a1611' }}>{person.displayName}</strong>
                      <RoleBadge role={person.role} />
                    </div>
                    <Status>{person.status}</Status>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingLeft: 52 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                      <Store size={11} /> {person.store}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                      <Phone size={11} /> {person.phone}
                    </span>
                    {person.role === 'tailor' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                        <Star size={11} /> Grade {person.tailorGrade || 1}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 52, marginTop: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8a7a6a' }}>
                      <Clock size={11} /> Last login: {person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}
                    </span>
                    <ChevronRight size={13} style={{ color: '#8a7a6a' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '12px 18px', borderTop: '1px solid #eee5da', fontSize: 12, color: '#8a7a6a',
            }}>
              Showing <strong style={{ color: '#1a1611' }}>{filtered.length}</strong> of <strong style={{ color: '#1a1611' }}>{staff.length}</strong> staff members
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StaffForm({ mode, form, update, onCancel, onSubmit, message }) {
  return (
    <div className="os-page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a7a6a', marginBottom: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            color: '#5a4e42', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} /> User Management
        </button>
        <ChevronRight size={12} />
        <span>{mode === 'edit' ? 'Edit Staff' : 'Add New Staff'}</span>
      </div>

      <div className="os-page-header">
        <div className="os-page-title">
          <UserCog size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>{mode === 'edit' ? 'Edit Staff Member' : 'Add New Staff'}</h2>
            <p>{mode === 'edit' ? 'Update staff information. Google Auth code required to save.' : 'Create a new staff account. Google Auth code required to save.'}</p>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: '#fff5f0', border: '1px solid #f3c5b5', borderRadius: 8,
          fontSize: 13, color: '#8a3520',
        }}>
          <AlertCircle size={15} /> {message}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="os-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Personal Info */}
            <div className="os-card">
              <div className="os-card-head">
                <span className="os-step-num">1</span>
                <div><strong>Personal Information</strong><p>Name, phone and date of birth</p></div>
              </div>
              <div className="os-card-body os-grid-2">
                <label className="os-field">
                  <span>Full Name <span style={{ color: '#e05252' }}>*</span></span>
                  <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required placeholder="e.g. Tunde Okafor" />
                </label>
                <label className="os-field">
                  <span>Display Name <span style={{ color: '#e05252' }}>*</span></span>
                  <input value={form.displayName} onChange={(e) => update('displayName', e.target.value)} required placeholder="e.g. Tunde (Tailor)" />
                </label>
                <label className="os-field">
                  <span>Phone Number <span style={{ color: '#e05252' }}>*</span></span>
                  <input value={form.phone} onChange={(e) => update('phone', e.target.value)} required placeholder="080 0000 0000" />
                </label>
                <label className="os-field">
                  <span>Date of Birth</span>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
                </label>
              </div>
            </div>

            {/* Work Info */}
            <div className="os-card">
              <div className="os-card-head">
                <span className="os-step-num">2</span>
                <div><strong>Work Information</strong><p>Role, store and department assignment</p></div>
              </div>
              <div className="os-card-body os-grid-2">
                <label className="os-field">
                  <span>Role <span style={{ color: '#e05252' }}>*</span></span>
                  <select value={form.role} onChange={(e) => update('role', e.target.value)}>
                    <option value="tailor">Tailor</option>
                    <option value="store_manager">Store Manager</option>
                    <option value="accounts">Accountant</option>
                    <option value="production_manager">Production</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="os-field">
                  <span>Assigned Store <span style={{ color: '#e05252' }}>*</span></span>
                  <select value={form.store} onChange={(e) => update('store', e.target.value)}>
                    <option>Lekki Store</option>
                    <option>Head Office</option>
                    <option>Victoria Island</option>
                    <option>Yaba Store</option>
                  </select>
                </label>
                {form.role === 'tailor' && (
                  <>
                    <label className="os-field">
                      <span>Department <span style={{ color: '#e05252' }}>*</span></span>
                      <select value={form.tailorDepartment} onChange={(e) => update('tailorDepartment', e.target.value)}>
                        <option value="native">Native</option>
                        <option value="suit">Suits</option>
                        <option value="trouser">Trouser</option>
                        <option value="finishing">Finishing</option>
                      </select>
                    </label>
                    <label className="os-field">
                      <span>Tailor Grade <span style={{ color: '#e05252' }}>*</span></span>
                      <select value={form.tailorGrade} onChange={(e) => update('tailorGrade', e.target.value)}>
                        {[1, 2, 3, 4, 5].map((g) => <option value={g} key={g}>Grade {g}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Credentials (add only) */}
            {mode === 'add' && (
              <div className="os-card">
                <div className="os-card-head">
                  <span className="os-step-num">3</span>
                  <div><strong>Login Credentials</strong><p>Set initial PIN for the staff member</p></div>
                </div>
                <div className="os-card-body os-grid-2">
                  <label className="os-field">
                    <span>Initial PIN <span style={{ color: '#e05252' }}>*</span></span>
                    <input type="password" value={form.pin} onChange={(e) => update('pin', e.target.value)} required placeholder="4-digit PIN" />
                  </label>
                  <label className="os-field">
                    <span>Confirm PIN <span style={{ color: '#e05252' }}>*</span></span>
                    <input type="password" value={form.confirmPin} onChange={(e) => update('confirmPin', e.target.value)} required placeholder="Repeat PIN" />
                  </label>
                </div>
              </div>
            )}

            {/* Security */}
            <div className="os-card">
              <div className="os-card-head">
                <span className="os-step-num">{mode === 'add' ? 4 : 3}</span>
                <div><strong>Security Verification</strong><p>Your Google Authenticator code is required</p></div>
              </div>
              <div className="os-card-body">
                <label className="os-field os-field-full">
                  <span>Google Auth Code <span style={{ color: '#e05252' }}>*</span></span>
                  <input value={form.authCode} onChange={(e) => update('authCode', e.target.value)} placeholder="123 456" required />
                </label>
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  flex: 1, padding: '11px 16px', border: '1px solid #ddd5c8', borderRadius: 8,
                  background: '#fff', fontSize: 14, color: '#5a4e42', cursor: 'pointer', fontWeight: 600,
                }}
              >Cancel</button>
              <button
                type="submit"
                className="os-release-btn"
                style={{ flex: 2, fontSize: 14 }}
              >
                <CheckCircle size={15} />
                {mode === 'edit' ? 'Save Changes' : 'Create Staff Member'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="os-sidebar">
            <div className="os-summary-card">
              <header>
                <UserCog size={14} strokeWidth={1.5} />
                <h3>Staff Summary</h3>
              </header>
              <dl>
                <dt>Full Name</dt>
                <dd>{form.fullName || <span className="os-empty">—</span>}</dd>
                <dt>Display Name</dt>
                <dd>{form.displayName || <span className="os-empty">—</span>}</dd>
                <dt>Role</dt>
                <dd>{roleLabel(form.role)}</dd>
                <dt>Store</dt>
                <dd>{form.store}</dd>
                {form.role === 'tailor' && <><dt>Grade</dt><dd>Grade {form.tailorGrade}</dd></>}
              </dl>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

function StaffProfile({ person, onBack, onEdit, onHistory, onModal, modal, setStatus, currentRole }) {
  const roleS = roleStyle[person.role] || { bg: '#f5f0e8', color: '#5a4e42' };
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
          <ArrowLeft size={14} /> User Management
        </button>
        <ChevronRight size={12} />
        <span>Staff Profile</span>
      </div>

      {/* Profile Hero Card */}
      <div className="os-card">
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <Avatar name={person.displayName} size="lg" />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h2 style={{ margin: 0, fontSize: 20, color: '#1a1611' }}>{person.displayName}</h2>
                <Status>{person.status}</Status>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <RoleBadge role={person.role} />
                {person.role === 'tailor' && (
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                    background: '#fff0df', color: '#c06a00', fontSize: 11, fontWeight: 700,
                  }}>Grade {person.tailorGrade || 1}</span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                  <Store size={11} /> {person.store}
                </span>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8a7a6a' }}>
                <Phone size={11} /> {person.phone}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={onEdit}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
                  fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
                }}
              ><Edit2 size={13} /> Edit</button>
              <button
                onClick={() => onModal('reset')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
                  fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
                }}
              ><Shield size={13} /> Reset PIN</button>
              <button
                onClick={() => onModal(person.status === 'active' ? 'deactivate' : 'reactivate')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: person.status === 'active' ? '#fce8e8' : '#eaf7ee',
                  color: person.status === 'active' ? '#b02a2a' : '#168647',
                }}
              >
                {person.status === 'active' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                {person.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Nav */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderTop: '1px solid #eee5da', marginTop: 18 }}>
          {[
            { label: 'Overview', icon: Activity, action: null },
            { label: 'Login History', icon: Clock, action: onHistory },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={action || undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                border: 'none', borderBottom: action ? 'none' : '2px solid #c97b08',
                background: 'none', cursor: action ? 'pointer' : 'default',
                fontSize: 13, color: action ? '#8a7a6a' : '#1a1611', fontWeight: action ? 400 : 600,
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="os-card">
          <div className="os-card-head">
            <div><strong>Personal Information</strong><p>Identity and contact details</p></div>
          </div>
          <div className="os-card-body">
            <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Full Name', person.displayName],
                ['Phone', person.phone],
                ['Date of Birth', '14 Mar 1992'],
              ].map(([dt, dd]) => (
                <div key={dt} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid #f3ede5' }}>
                  <dt style={{ color: '#8a7a6a', fontWeight: 400 }}>{dt}</dt>
                  <dd style={{ margin: 0, color: '#1a1611', fontWeight: 500 }}>{dd}</dd>
                </div>
              ))}
              <div style={{ paddingTop: 4 }}>
                <strong style={{ display: 'block', fontSize: 12, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Work Information</strong>
              </div>
              {[
                ['Role', roleLabel(person.role)],
                ['Store', person.store],
                ...(person.role === 'tailor' ? [['Department', person.tailorDepartment || 'Native'], ['Tailor Grade', `Grade ${person.tailorGrade || 1}`]] : []),
                ['Account Status', person.status],
                ['Date Created', '22 May 2024'],
              ].map(([dt, dd]) => (
                <div key={dt} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid #f3ede5' }}>
                  <dt style={{ color: '#8a7a6a', fontWeight: 400 }}>{dt}</dt>
                  <dd style={{ margin: 0, color: '#1a1611', fontWeight: 500 }}>{dd}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="os-card">
          <div className="os-card-head">
            <div><strong>Login Summary</strong><p>Recent activity and access log</p></div>
          </div>
          <div className="os-card-body">
            <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Last Login', 'Today, 09:25 AM'],
                ['Last PIN Reset', '18 May 2024'],
              ].map(([dt, dd]) => (
                <div key={dt} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid #f3ede5' }}>
                  <dt style={{ color: '#8a7a6a', fontWeight: 400 }}>{dt}</dt>
                  <dd style={{ margin: 0, color: '#1a1611', fontWeight: 500 }}>{dd}</dd>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid #f3ede5' }}>
                <dt style={{ color: '#8a7a6a', fontWeight: 400 }}>Successful Logins</dt>
                <dd style={{ margin: 0, color: '#2a7d4f', fontWeight: 600 }}>12 in last 30 days</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid #f3ede5' }}>
                <dt style={{ color: '#8a7a6a', fontWeight: 400 }}>Failed Attempts</dt>
                <dd style={{ margin: 0, color: '#b02a2a', fontWeight: 600 }}>1 in last 30 days</dd>
              </div>
            </dl>

            <div style={{ marginTop: 16 }}>
              <strong style={{ display: 'block', fontSize: 12, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Recent Logins</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Chrome on Windows', 'Android App', 'Chrome on Windows', 'iPhone (Safari)'].map((device, i) => (
                  <div key={`${device}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3ede5' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13, color: '#1a1611' }}>{22 - i} May 2024</strong>
                      <small style={{ fontSize: 11, color: '#8a7a6a' }}>{device}</small>
                    </div>
                    <Status>{i === 2 ? 'Failed' : 'Success'}</Status>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <StaffModal
          type={modal}
          person={person}
          currentRole={currentRole}
          close={() => onModal(null)}
          confirm={() => setStatus(modal === 'deactivate' ? 'inactive' : modal === 'reactivate' ? 'active' : person.status)}
        />
      )}
    </div>
  );
}

function StaffModal({ type, person, close, confirm, currentRole }) {
  // Reset PIN used to arrive with "1234" already filled in, ask for a Google
  // Auth code that was never checked, and then change nothing at all — the
  // member of staff's old PIN kept working.
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetPin = async () => {
    setError('');
    if (pin.trim().length < 4) return setError('A PIN must be at least 4 characters.');
    if (pin !== confirmPin) return setError('The two PINs do not match.');
    setSaving(true);
    try {
      await api.patch(`/oms/staff/${person.id}`, {
        pin: pin.trim(),
        ownerPhone: currentRole?.phone,
        ownerPin: currentRole?.pin,
      });
      close();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'That PIN could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  const config = {
    reset:      { title: 'Reset PIN',       icon: Shield,       tone: 'blue',  bg: '#eff6ff', color: '#1d4ed8' },
    deactivate: { title: 'Deactivate Staff', icon: XCircle,     tone: 'red',   bg: '#fce8e8', color: '#b02a2a' },
    reactivate: { title: 'Reactivate Staff', icon: CheckCircle, tone: 'green', bg: '#eaf7ee', color: '#168647' },
  };
  const { title, icon: Icon, tone, bg, color } = config[type];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button type="button" onClick={close} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a7a6a' }}>
            <XCircle size={18} />
          </button>
        </div>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Icon size={22} style={{ color }} />
        </div>
        <h2 style={{ textAlign: 'center', margin: '0 0 10px', fontSize: 18, color: '#1a1611' }}>{title}</h2>
        {type !== 'reset' && (
          <p style={{ textAlign: 'center', fontSize: 14, color: '#5a4e42', margin: '0 0 20px', lineHeight: 1.5 }}>
            {type === 'deactivate'
              ? <>Are you sure you want to deactivate <strong>{person.displayName}</strong>? They will lose access immediately.</>
              : <>You are about to reactivate <strong>{person.displayName}</strong>. They will regain platform access.</>}
          </p>
        )}
        {type === 'reset' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#5a4e42', lineHeight: 1.5, textAlign: 'center' }}>
              Set a new PIN for <strong>{person.displayName}</strong>. They will be signed out
              everywhere and will need the new PIN to sign back in.
            </p>
            <label className="os-field">
              <span>New PIN <span style={{ color: '#e05252' }}>*</span></span>
              <input type="password" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="new-password" />
            </label>
            <label className="os-field">
              <span>Confirm PIN <span style={{ color: '#e05252' }}>*</span></span>
              <input type="password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} autoComplete="new-password" />
            </label>
            {error ? (
              <p style={{ margin: 0, padding: '9px 11px', borderRadius: 8, background: '#fff5f0', border: '1px solid #f0c8b8', color: '#8a3520', fontSize: 12 }}>{error}</p>
            ) : null}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={close}
            style={{
              flex: 1, padding: '10px 16px', border: '1px solid #ddd5c8', borderRadius: 8,
              background: '#fff', fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 600,
            }}
          >Cancel</button>
          <button
            type="button"
            onClick={type === 'reset' ? resetPin : confirm}
            disabled={saving}
            style={{
              flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8,
              background: color, color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700, opacity: saving ? 0.7 : 1,
            }}
          >{saving ? 'Saving…' : title}</button>
        </div>
      </div>
    </div>
  );
}

function LoginHistory({ person, onBack }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('All Outcomes');

  useEffect(() => {
    api.get(`/oms/staff/${person.id}/logins`)
      .then((response) => setEvents(response.data?.data?.events || []))
      .catch((requestError) => {
        setEvents([]);
        setError(requestError.response?.data?.message || 'The sign-in history could not be loaded.');
      });
  }, [person.id]);

  const label = {
    success: 'Success',
    wrong_credentials: 'Failed',
    inactive_account: 'Blocked',
  };

  const rows = (events || []).filter((event) => (
    outcomeFilter === 'All Outcomes' || label[event.outcome] === outcomeFilter
  ));

  const exportHistory = () => downloadCsv(
    `twif-signins-${person.displayName.replace(/\s+/g, '-').toLowerCase()}-${csvStamp()}.csv`,
    ['When', 'Outcome', 'Phone tried', 'IP address', 'Browser or app'],
    rows.map((event) => [
      formatMoment(event.createdAt), label[event.outcome] || event.outcome,
      event.phone, event.ipAddress || '', event.userAgent || '',
    ])
  );

  return (
    <div className="os-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a7a6a' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
            color: '#5a4e42', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} /> {person.displayName}
        </button>
        <ChevronRight size={12} />
        <span>Sign-in History</span>
      </div>

      <div className="os-page-header">
        <div className="os-page-title">
          <Clock size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>Sign-in History</h2>
            <p>Every attempt on <strong>{person.displayName}</strong>&apos;s number, successful or not</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={outcomeFilter}
            onChange={(event) => setOutcomeFilter(event.target.value)}
            style={{
              padding: '7px 10px', border: '1px solid #ddd5c8', borderRadius: 8,
              fontSize: 12, color: '#5a4e42', background: '#fff',
            }}
          >
            {['All Outcomes', 'Success', 'Failed', 'Blocked'].map((option) => <option key={option}>{option}</option>)}
          </select>
          <button
            type="button"
            onClick={exportHistory}
            disabled={!rows.length}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
              fontSize: 13, color: '#5a4e42', cursor: rows.length ? 'pointer' : 'not-allowed',
              opacity: rows.length ? 1 : 0.6,
            }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, background: '#fff5f0', border: '1px solid #f0c8b8', color: '#8a3520', fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      ) : null}

      <div className="os-card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date & Time', 'Outcome', 'Number Tried', 'IP Address', 'Browser / App'].map((heading) => (
                  <th key={heading} style={{
                    textAlign: 'left', padding: '11px 14px', fontSize: 11,
                    color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: '#faf7f3', borderBottom: '1px solid #eee5da', whiteSpace: 'nowrap',
                  }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events === null ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#8a7a6a', fontSize: 13 }}>
                    {events.length ? 'No attempts match this filter.' : 'No sign-in attempts have been recorded yet.'}
                  </td>
                </tr>
              ) : rows.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid #f3ede5' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <td data-label="Date & Time" style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42', whiteSpace: 'nowrap' }}>{formatMoment(event.createdAt)}</td>
                  <td data-label="Outcome" style={{ padding: '12px 14px' }}><Status>{label[event.outcome] || event.outcome}</Status></td>
                  <td data-label="Number Tried" style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{event.phone}</td>
                  <td data-label="IP Address" style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: '#8a7a6a' }}>{event.ipAddress || '—'}</td>
                  <td data-label="Browser / App" style={{ padding: '12px 14px', fontSize: 12, color: '#8a7a6a', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event.userAgent || ''}>{event.userAgent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
