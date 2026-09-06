import { useState } from 'react';
import { Camera, Image as ImageIcon, Check } from 'lucide-react';
import { api } from '../../lib/api';

const PAYMENT_METHODS = ['transfer', 'cash', 'card', 'check'];

// Recording a payment against an invoice, wherever that needs doing —
// Accounts' Payments screen, the invoice review screen, and Edit Invoice all
// need the same amount/method/evidence form and the same cumulative-balance
// behaviour, so it lives here once rather than three times.
export default function RecordPaymentForm({ invoiceNumber, balance, defaultMethod = 'transfer', onRecorded }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(defaultMethod);
  const [evidenceList, setEvidenceList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // A customer completing an instalment plan can hand over proof more than
  // once for the same payment — a bank alert and a counter receipt, say — so
  // each picker adds to the list rather than replacing what's already there.
  const selectEvidence = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Payment evidence must be an image or screenshot.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Payment evidence must be smaller than 5 MB.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setEvidenceList((current) => [
      ...current,
      { name: file.name, type: file.type, size: file.size, dataUrl: reader.result, uploadedAt: new Date().toISOString() },
    ]);
    reader.readAsDataURL(file);
  };

  const removeEvidence = (index) => setEvidenceList((current) => current.filter((_, position) => position !== index));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await api.patch(`/oms/invoices/${invoiceNumber}/payment`, {
        amountReceived: Number(amount),
        method,
        ...(evidenceList.length ? { paymentEvidence: evidenceList } : {}),
      });
      const updated = response.data?.data?.invoice;
      if (updated) onRecorded?.(updated);
      setAmount('');
      setEvidenceList([]);
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
        {evidenceList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {evidenceList.map((item, index) => (
              <div key={`${item.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={item.dataUrl} alt="Payment evidence preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee5da' }} />
                <span style={{ fontSize: 12, color: '#5a4e42', flex: 1 }}>{item.name}</span>
                <button type="button" onClick={() => removeEvidence(index)} style={{ padding: '4px 10px', border: '1px solid #f3d5cc', borderRadius: 6, background: '#fff5f0', color: '#8a3520', fontSize: 11, cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#8a7a6a', marginTop: evidenceList.length ? 8 : 6, marginBottom: 0 }}>
          {evidenceList.length ? 'Add another receipt screenshot or payment photo, if there is one.' : 'Optional: attach a receipt screenshot or payment photo (max 5 MB). You can add more than one.'}
        </p>
      </div>

      <button type="submit" disabled={saving || amount === ''}>
        <Check size={14} /> {saving ? 'Recording…' : 'Record payment'}
      </button>
      {error ? <p className="record-payment-error">{error}</p> : null}
    </form>
  );
}
