import { useState } from 'react';
import { Shield, XCircle } from 'lucide-react';
import { api } from '../../lib/api';

// Lets any signed-in member of staff change their own PIN. The current PIN is
// asked for again, and every session — this one included — ends on success,
// matching what the server does when a PIN is reset.
export default function ChangePinDialog({ onClose, onChanged }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!currentPin.trim()) return setError('Enter your current PIN.');
    if (newPin.trim().length < 4) return setError('A PIN must be at least 4 characters.');
    if (newPin !== confirmPin) return setError('The two new PINs do not match.');
    if (newPin.trim() === currentPin.trim()) return setError('Choose a PIN different from your current one.');
    setBusy(true);
    try {
      await api.post('/oms/auth/change-pin', { currentPin: currentPin.trim(), newPin: newPin.trim() });
      onChanged('PIN changed successfully. Sign in again with your new PIN.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your PIN could not be changed.');
      setBusy(false);
    }
  };

  return (
    <div className="um-modal-backdrop" role="presentation">
      <form className="um-modal" role="dialog" aria-modal="true" aria-labelledby="change-pin-title" onSubmit={submit}>
        <button type="button" className="um-modal-close" onClick={onClose} aria-label="Close"><XCircle size={18} /></button>
        <Shield size={32} style={{ color: '#c97b08', margin: '0 auto 12px', display: 'block' }} />
        <h3 id="change-pin-title" style={{ textAlign: 'center', margin: '0 0 8px' }}>Change your PIN</h3>
        <p style={{ textAlign: 'center', color: '#6f6255', lineHeight: 1.5 }}>You will be signed out and sign in again with the new PIN.</p>
        <label className="os-field"><span>Current PIN</span>
          <input type="password" value={currentPin} onChange={(event) => setCurrentPin(event.target.value)} autoComplete="current-password" required />
        </label>
        <label className="os-field"><span>New PIN</span>
          <input type="password" value={newPin} onChange={(event) => setNewPin(event.target.value)} autoComplete="new-password" placeholder="At least 4 characters" required />
        </label>
        <label className="os-field"><span>Confirm new PIN</span>
          <input type="password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} autoComplete="new-password" required />
        </label>
        {error ? <p role="alert" style={{ color: '#b02a2a', fontWeight: 600, margin: '10px 0 0' }}>{error}</p> : null}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button type="button" className="um-btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="os-release-btn" style={{ flex: 1 }} disabled={busy}>{busy ? 'Saving…' : 'Change PIN'}</button>
        </div>
      </form>
    </div>
  );
}
