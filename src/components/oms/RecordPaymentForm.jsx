import { useState } from 'react';
import { Camera, Image as ImageIcon, Check } from 'lucide-react';
import { api } from '../../lib/api';

const PAYMENT_METHODS = ['transfer', 'cash', 'card', 'check'];

// Recording a payment against an invoice, wherever that needs doing —
// Accounts' Payments screen and the invoice review screen both need the same
// amount/method/evidence form and the same cumulative-balance behaviour, so
// it lives here once rather than twice.
export default function RecordPaymentForm({ invoiceNumber, balance, defaultMethod = 'transfer', onRecorded }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(defaultMethod);
  const [evidence, setEvidence] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectEvidence = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Payment evidence must be an image or screenshot.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Payment evidence must be smaller than 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setEvidence({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result, uploadedAt: new Date().toISOString() });
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await api.patch(`/oms/invoices/${invoiceNumber}/payment`, {
        amountReceived: Number(amount),
        method,
        ...(evidence ? { paymentEvidence: evidence } : {}),
      });
      const updated = response.data?.data?.invoice;
      if (updated) onRecorded?.(updated);
      setAmount('');
      setEvidence(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'That payment could not be recorded.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="record-payment">
      <div>
        <label className="os-field">
          <span>Amount received</span>
          <input
            type="number"
            min="0"
            max={balance}
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={String(balance)}
            required
          />
        </label>
        <label className="os-field">
          <span>Method</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            {PAYMENT_METHODS.map((option) => (
              <option key={option} value={option}>{option.charAt(0).toUpperCase()}{option.slice(1)}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ border: '1px dashed #ddd5c8', borderRadius: 8, padding: 14, background: '#faf7f3', marginTop: 10 }}>
        {/* iOS offers Take Photo alongside the library from a single input;
            Android often shows only the library, so two explicit choices
            behave the same way on both — same pattern as invoice creation. */}
        <div className="evidence-picker">
          <label>
            <Camera size={14} strokeWidth={1.8} />
            Take a photo
            <input type="file" accept="image/*" capture="environment" onChange={selectEvidence} />
          </label>
          <label>
            <ImageIcon size={14} strokeWidth={1.8} />
            Choose a file
            <input type="file" accept="image/*" onChange={selectEvidence} />
          </label>
        </div>
        {evidence && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <img src={evidence.dataUrl} alt="Payment evidence preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee5da' }} />
            <span style={{ fontSize: 12, color: '#5a4e42', flex: 1 }}>{evidence.name}</span>
            <button type="button" onClick={() => setEvidence(null)} style={{ padding: '4px 10px', border: '1px solid #f3d5cc', borderRadius: 6, background: '#fff5f0', color: '#8a3520', fontSize: 11, cursor: 'pointer' }}>Remove</button>
          </div>
        )}
        {!evidence && <p style={{ fontSize: 12, color: '#8a7a6a', marginTop: 6, marginBottom: 0 }}>Optional: attach a receipt screenshot or payment photo (max 5 MB)</p>}
      </div>

      <button type="submit" disabled={saving || amount === ''}>
        <Check size={14} /> {saving ? 'Recording…' : 'Record payment'}
      </button>
      {error ? <p className="record-payment-error">{error}</p> : null}
    </form>
  );
}
