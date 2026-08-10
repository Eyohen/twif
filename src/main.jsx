import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* The template's AuthProvider used to wrap this. It fetched /auth/me on
        every load — the customer-account endpoint from the product this
        codebase started as — and on the 401 it cleared the stored token, which
        is now the staff token the OMS signs in with. Nothing in the OMS ever
        used it: its three consumers are unreachable from here. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Twif OMS service worker registration failed:', error);
    });
  });
} else if ('serviceWorker' in navigator) {
  // A production service worker can otherwise keep serving stale bundles when
  // the same localhost origin is later used by Vite in development.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
  if ('caches' in window) {
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith('twif-oms-'))
      .map((key) => caches.delete(key))));
  }
}
