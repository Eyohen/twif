import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';

export default function ShopifySyncPage() {
  const [status, setStatus] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api.get('/oms/shopify/sync-status')
      .then((response) => setStatus(response.data?.data || null))
      .catch((error) => setNotice({ tone: 'error', text: error.response?.data?.message || 'The Shopify sync status could not be loaded.' }));
  }, []);

  if (!status) {
    return (
      <div className="os-page">
        <div className="os-card" style={{ padding: 40, textAlign: 'center', color: '#8a7a6a' }}>
          {notice?.text || 'Loading Shopify sync status…'}
        </div>
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <RefreshCw size={22} strokeWidth={1.8} />
          <div>
            <h2>Shopify Sync</h2>
            <p>Customers and orders arriving from the Shopify store</p>
          </div>
        </div>
      </div>

      <div className="os-kpi-row">
        {[
          ['Linked Customers', status.linkedCustomers],
          ['Orders Synced', status.ordersSynced],
          ['Last Sync', status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('en-GB') : 'Never'],
        ].map(([label, value]) => (
          <div key={label} className="os-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1611', marginTop: 6 }}>{value}</div>
          </div>
        ))}
      </div>

      <section className="os-card">
        <div className="os-card-head">
          <div><strong>Recent Sync Activity</strong><p>{status.recentEvents.length} recent event{status.recentEvents.length === 1 ? '' : 's'}</p></div>
        </div>
        <div className="os-card-body" style={{ gap: 0 }}>
          {status.recentEvents.length ? status.recentEvents.map((event, index) => (
            <div key={`${event.shopifyId}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3ede5' }}>
              {event.result === 'success'
                ? <CheckCircle size={15} strokeWidth={1.8} style={{ color: '#2a7d4f', flexShrink: 0 }} />
                : <XCircle size={15} strokeWidth={1.8} style={{ color: '#8a3520', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1611' }}>
                  {event.type === 'customer' ? 'Customer' : 'Order'} {event.shopifyId}
                </div>
                <div style={{ fontSize: 12, color: '#8a7a6a' }}>
                  {event.result === 'success' ? event.payloadSummary : event.errorMessage}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#b0a090', flexShrink: 0 }}>
                {new Date(event.createdAt).toLocaleString('en-GB')}
              </div>
            </div>
          )) : <p style={{ margin: 0, fontSize: 13, color: '#8a7a6a' }}>No Shopify activity yet.</p>}
        </div>
      </section>
    </div>
  );
}
