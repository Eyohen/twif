import { useState } from 'react';
import { demoCredentials } from '../../config/oms';

export default function LoginPage({ onLogin, notice = '' }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const account = demoCredentials.find((item) => item.phone === phone.trim() && item.pin === pin.trim());
    if (!account) {
      setError('Invalid phone number or PIN');
      return;
    }
    setError('');
    onLogin(account);
  };

  return (
    <main className="login-page">
      <section className="login-app-frame">
        <section className="login-story">
          <div className="login-brand-top">
            <div className="app-mark">TWIF</div>
            <div><strong>The Way It Fits</strong><span>Operations Management System</span></div>
          </div>
          <div className="login-welcome">
            <p>Staff Access</p>
            <h1>Manage the floor from <em>anywhere.</em></h1>
            <i />
            <span>One platform. Every department.<br />Orders, production, inventory, payments<br />and customers — all in sync.</span>
          </div>
          <div className="login-features">
            {[['⌁', 'Real-time updates', 'Stay informed with live data.'], ['◇', 'Secure & reliable', 'Enterprise-grade security always.'], ['♙', 'Team collaboration', 'Built for your entire team to win.'], ['▥', 'Actionable insights', 'Make smarter decisions every day.']].map(([icon, title, detail]) => (
              <article key={title}><i>{icon}</i><strong>{title}</strong><span>{detail}</span></article>
            ))}
          </div>
          <small className="login-copyright">© 2026 The Way It Fits. All rights reserved.</small>
        </section>
        <section className="login-auth-side">
          <section className="login-panel">
            <div className="login-lock">▣</div>
            <div className="login-panel-head"><div><h2>Welcome back</h2><p>Sign in to continue to your account</p></div></div>
            <form onSubmit={submit}>
              {error ? <div className="login-error">{error}</div> : null}
              {!error && notice ? <div className="login-notice">{notice}</div> : null}
              <label>Phone number<span className="login-input-icon">⌕</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="08160000000" /></label>
              <label>PIN<span className="pin-input-wrap"><input value={pin} onChange={(event) => setPin(event.target.value)} type={showPin ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter PIN" /><button type="button" className="pin-toggle" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin((current) => !current)}>{showPin ? '◉' : '◎'}</button></span></label>
              <div className="login-form-options"><label><input type="checkbox" defaultChecked />Remember me on this device</label><button type="button">Forgot PIN?</button></div>
              <button className="login-submit" type="submit">Continue <span>→</span></button>
            </form>
            <p className="login-terms">By continuing, you agree to our <b>Terms of Use</b> and <b>Privacy Policy.</b></p>
          </section>
          <footer className="login-support"><div><strong>Need help signing in?</strong><span>Contact IT support or your system administrator.</span></div><div><strong>● &nbsp; All systems operational</strong><span>Last updated: 22 Jul 2026, 14:30</span></div></footer>
        </section>
      </section>
    </main>
  );
}
