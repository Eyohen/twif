import { useEffect, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { api } from '../../lib/api';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const reload = () => {
    setLoading(true);
    api.get('/oms/departments')
      .then((response) => setDepartments(response.data?.data?.departments || []))
      .catch((error) => setMessage(error.response?.data?.message || 'The department list could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const addDepartment = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      await api.post('/oms/departments', { name: name.trim() });
      setName('');
      reload();
    } catch (error) {
      setMessage(error.response?.data?.message || 'That department could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (department) => {
    const nextStatus = department.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/oms/departments/${department.id}`, { status: nextStatus });
      reload();
    } catch (error) {
      setMessage(error.response?.data?.message || 'That department could not be updated.');
    }
  };

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Layers size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>Departments</h2>
            <p>Garment departments order-sheet items can be tagged with</p>
          </div>
        </div>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', background: '#fff5f0', border: '1px solid #f3c5b5', borderRadius: 8, color: '#8a3520', fontSize: 13 }}>
          {message}
        </div>
      )}

      <form onSubmit={addDepartment} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <label className="os-field" style={{ flex: 1 }}>
          <span>New department name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Kaftan" />
        </label>
        <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <Plus size={14} /> Add
        </button>
      </form>
      <p style={{ fontSize: 12, color: '#8a7a6a' }}>
        A newly added department has no field set yet — it needs development
        follow-up before staff can fill anything in for it.
      </p>

      {loading ? <p>Loading…</p> : (
        <table className="os-table">
          <thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department.id}>
                <td>{department.name}</td>
                <td>{department.status === 'active' ? 'Active' : 'Inactive'}</td>
                <td>
                  <button type="button" onClick={() => toggleStatus(department)}>
                    {department.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
