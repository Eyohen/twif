import { useEffect, useState } from 'react';
import { Layers, Plus, Settings2, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);

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
    // Clicking with nothing typed did nothing at all — not even a message —
    // which read exactly like the button being broken.
    if (!name.trim()) { setMessage('Type a department name first.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const added = name.trim();
      await api.post('/oms/departments', { name: added });
      setName('');
      setMessage(`"${added}" was added.`);
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

  const openParameters = (department) => {
    setEditing({ ...department, fields: (department.fields || []).map((field) => ({ ...field })), newLabel: '' });
    setMessage('');
  };

  const addParameter = () => {
    const label = editing.newLabel.trim();
    if (!label) { setMessage('Type a parameter name first.'); return; }
    setEditing((current) => ({ ...current, newLabel: '', fields: [...current.fields, { label, required: true }] }));
  };

  const saveParameters = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.patch(`/oms/departments/${editing.id}`, { fields: editing.fields, note: editing.note || '' });
      setMessage(`${editing.name} parameters were updated.`);
      setEditing(null);
      reload();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Those parameters could not be saved.');
    } finally {
      setSaving(false);
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
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: message.includes('was added') ? '#f0faf4' : '#fff5f0',
          border: `1px solid ${message.includes('was added') ? '#c3e8d4' : '#f3c5b5'}`,
          color: message.includes('was added') ? '#2a7d4f' : '#8a3520',
        }}>
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
        Add a department, then use Manage parameters to control the details staff must enter for it.
      </p>

      {loading ? <p>Loading…</p> : (
        <table className="os-table">
          <thead><tr><th>Name</th><th>Parameters</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department.id}>
                <td>{department.name}</td>
                <td>{department.fields?.length || 0}</td>
                <td>{department.status === 'active' ? 'Active' : 'Inactive'}</td>
                <td>
                  <button type="button" onClick={() => openParameters(department)} style={{ marginRight: 8 }}>
                    <Settings2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Manage parameters
                  </button>
                  <button type="button" onClick={() => toggleStatus(department)}>
                    {department.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing ? (
        <div className="os-card" style={{ marginTop: 18 }}>
          <div className="os-card-header"><div><h3>{editing.name} parameters</h3><p>These fields appear on order sheets and are checked before production starts.</p></div></div>
          <div className="os-card-body" style={{ display: 'grid', gap: 14 }}>
            {editing.fields.length ? editing.fields.map((field, index) => (
              <div key={field.key || `${field.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center' }}>
                <input
                  value={field.label}
                  aria-label={`Parameter ${index + 1} name`}
                  onChange={(event) => setEditing((current) => ({ ...current, fields: current.fields.map((entry, fieldIndex) => fieldIndex === index ? { ...entry, label: event.target.value } : entry) }))}
                />
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={field.required !== false} onChange={(event) => setEditing((current) => ({ ...current, fields: current.fields.map((entry, fieldIndex) => fieldIndex === index ? { ...entry, required: event.target.checked } : entry) }))} /> Required</label>
                <button type="button" aria-label={`Remove ${field.label}`} onClick={() => setEditing((current) => ({ ...current, fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index) }))}><Trash2 size={14} /></button>
              </div>
            )) : <p style={{ color: '#8a7a6a', fontSize: 13 }}>No parameters yet.</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1 }} value={editing.newLabel} onChange={(event) => setEditing((current) => ({ ...current, newLabel: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addParameter(); } }} placeholder="e.g. Embroidery colour" />
              <button type="button" onClick={addParameter}><Plus size={14} style={{ verticalAlign: 'middle' }} /> Add parameter</button>
            </div>
            <label className="os-field"><span>Department note (optional)</span><textarea rows={3} value={editing.note || ''} onChange={(event) => setEditing((current) => ({ ...current, note: event.target.value }))} /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" disabled={saving} onClick={saveParameters} style={{ background: '#1a1611', color: '#fff' }}>{saving ? 'Saving…' : 'Save parameters'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
