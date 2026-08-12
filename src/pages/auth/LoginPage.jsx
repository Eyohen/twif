import { useState } from 'react';
import { api, setStoredAccessToken } from '../../lib/api';

export default function LoginPage({ onLogin, notice = '' }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  // The Admin role signs in with a second factor. `step` is what the form is
  // asking for: the PIN, a code from the authenticator app, or — the first time
  // — the barcode to set the app up with.
  const [step, setStep] = useState('credentials');
  const [ticket, setTicket] = useState('');
  const [code, setCode] = useState('');
  const [enrolment, setEnrolment] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState(null);

  const finishSignIn = (staff, token) => {
    setStoredAccessToken(token);
    onLogin({
      role: staff.role,
      phone: staff.phone,
      name: staff.displayName,
      label: staff.displayName,
      store: staff.store,
      profileImageUrl: staff.profileImageUrl,
      tailorDepartment: staff.tailorDepartment,
      tailorGrade: staff.tailorGrade,
    });
  };

  // The PIN used to be checked here, in the browser, against a list compiled
  // into the JavaScript — so all seven were readable by anyone who opened the
  // bundle. It goes to the server now, and what comes back is a token the rest
  // of the API requires.
  const submit = async (event) => {
    event.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    setError('');

    try {
      const response = await api.post('/oms/auth/login', { phone: phone.trim(), pin: pin.trim() });
      const data = response.data?.data || {};

      // An Admin's PIN gets them to the second step and no further.
      if (data.twoFactorRequired) {
        setTicket(data.ticket);
        if (data.enrolled) {
          setStep('code');
        } else {
          const setup = await api.post('/oms/auth/2fa/setup', { ticket: data.ticket });
          setEnrolment(setup.data?.data || null);
          setStep('enrol');
        }
        return;
      }

      const { token, staff } = data;
      if (!token || !staff) throw new Error('missing token');
      finishSignIn(staff, token);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
        || (requestError.response ? 'Could not sign you in' : 'Cannot reach the server. Check your connection.'),
      );
    } finally {
      setSigningIn(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    setError('');
    try {
      const path = step === 'enrol' ? '/oms/auth/2fa/confirm' : '/oms/auth/2fa/verify';
      const response = await api.post(path, { ticket, code: code.trim() });
      const data = response.data?.data || {};

      // Enrolment hands back the recovery codes once, and only once — they are
      // stored hashed, so nobody can read them out again later.
      if (step === 'enrol' && data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        setEnrolment((current) => ({ ...current, token: data.token, staff: data.staff }));
        setStep('recovery');
        return;
      }
      finishSignIn(data.staff, data.token);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'That code could not be checked.');
      setCode('');
    } finally {
      setSigningIn(false);
    }
  };

  const twoFactorPanel = () => {
    if (step === 'recovery') {
      return (
        <section className="login-panel two-factor">
          <h2>Keep these somewhere safe</h2>
          <p>
            Each of these signs you in once if you lose your phone. They are not shown again —
            write them down or print them before you carry on.
          </p>
          <ul className="recovery-codes">
            {recoveryCodes.map((entry) => <li key={entry}>{entry}</li>)}
          </ul>
          <button
            className="login-submit"
            type="button"
            onClick={() => finishSignIn(enrolment.staff, enrolment.token)}
          >I have saved them <span>→</span></button>
        </section>
      );
    }

    return (
      <section className="login-panel two-factor">
        <h2>{step === 'enrol' ? 'Set up your authenticator' : 'Enter your code'}</h2>
        {step === 'enrol' ? (
          <>
            <p>
              An Admin account signs in with a code as well as a PIN. Scan this with Google
              Authenticator, then type the six digits it shows.
            </p>
            {enrolment?.qr ? <img className="two-factor-qr" src={enrolment.qr} alt="Barcode to scan with your authenticator app" /> : null}
            <p className="two-factor-secret">
              Cannot scan it? Type this key into the app instead: <code>{enrolment?.secret}</code>
            </p>
          </>
        ) : (
          <p>Open your authenticator app and enter the six digits for twif OMS, or use a recovery code.</p>
        )}
        <form onSubmit={submitCode}>
          {error ? <div className="login-error">{error}</div> : null}
          <label>
            {step === 'enrol' ? 'Six-digit code' : 'Code'}
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode={step === 'enrol' ? 'numeric' : 'text'}
              autoComplete="one-time-code"
              placeholder={step === 'enrol' ? '000000' : '000000 or a recovery code'}
              autoFocus
            />
          </label>
          <button className="login-submit" type="submit" disabled={signingIn}>
            {signingIn ? 'Checking…' : <>Continue <span>→</span></>}
          </button>
        </form>
        <button
          type="button"
          className="two-factor-back"
          onClick={() => { setStep('credentials'); setCode(''); setError(''); setTicket(''); }}
        >← Start again</button>
      </section>
    );
  };

  return (
    <main className="login-page">
      <section className="login-app-frame">
        <section className="login-story">
          <div className="login-brand-top">
            <div className="app-mark">twif</div>
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
          {step !== 'credentials' ? twoFactorPanel() : (
          <section className="login-panel">
            <div className="login-lock">▣</div>
            <div className="login-panel-head"><div><h2>Welcome back</h2><p>Sign in to continue to your account</p></div></div>
            <form onSubmit={submit}>
              {error ? <div className="login-error">{error}</div> : null}
              {!error && notice ? <div className="login-notice">{notice}</div> : null}
              <label>Phone number<span className="login-input-icon">⌕</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="08160000000" /></label>
              <label>PIN<span className="pin-input-wrap"><input value={pin} onChange={(event) => setPin(event.target.value)} type={showPin ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter PIN" /><button type="button" className="pin-toggle" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin((current) => !current)}>{showPin ? '◉' : '◎'}</button></span></label>
              {/* "Remember me" changed nothing — the session is kept either way —
                  and "Forgot PIN?" led nowhere. There is no self-service reset;
                  the Owner sets a new PIN from User Management. */}
              <p className="login-form-options">Forgotten your PIN? Ask the Owner to set you a new one.</p>
              <button className="login-submit" type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : <>Continue <span>→</span></>}</button>
            </form>
            <p className="login-terms">By continuing, you agree to our <b>Terms of Use</b> and <b>Privacy Policy.</b></p>
          </section>
          )}
          {/* "All systems operational — last updated 22 Jul 2026, 14:30" was fixed
              text: nothing monitored anything, and the date never moved. */}
          <footer className="login-support"><div><strong>Need help signing in?</strong><span>Contact the Owner or your system administrator.</span></div></footer>
        </section>
      </section>
    </main>
  );
}
