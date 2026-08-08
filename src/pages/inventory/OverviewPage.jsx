import { useRef, useState } from 'react';
import { Box, AlertTriangle, XCircle, Package, Truck, LayoutGrid, PlusCircle, Edit3, List, Boxes, TrendingUp, ChevronRight } from 'lucide-react';

export default function InventoryOverviewPage() {
  const kpiRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);
  const kpiCount = 5;

  const handleKpiScroll = () => {
    const el = kpiRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / (el.scrollWidth / kpiCount));
    setActiveDot(Math.min(index, kpiCount - 1));
  };

  const alerts = [
    ['Black Jacquard', 'Suiting', '1.5 m', 'Low Stock'],
    ['White Cotton Poplin', 'Shirting', 'Out of Stock', 'Out of Stock'],
    ['Green Chiffon', 'Dress', '3.2 m', 'Low Stock'],
    ['Linen (Cream)', 'Native Wear', '4.8 m', 'Low Stock'],
  ];
  const pending = [
    ['INV74108', 'Olive Lawrence', 'Wool', 'High'],
    ['INV61259', 'Tomi Ajayi', 'Satin', 'Medium'],
    ['INV88920', 'Kelechi Okafor', 'Linen', 'Low'],
    ['INV77231', 'Henry Eyo', 'Cotton Poplin', 'Medium'],
  ];
  const allocations = [
    ['INV30659', 'Jimmy Aki', 'Green Chiffon', '3 m', 'Production', '09:42 AM'],
    ['INV35943', 'Henry Eyo', 'Linen (Cream)', '2 m', 'Production', '09:15 AM'],
    ['INV65761', 'Olive Lawrence', 'Black Jacquard', '5 m', 'Production', '08:51 AM'],
    ['INV77231', 'Tomi Ajayi', 'Cotton Poplin', '4 m', 'Production', '08:20 AM'],
  ];

  const kpis = [
    { icon: <Box size={20} />, label: 'Total Fabrics', value: '156', detail: 'Items in inventory', tone: 'gold' },
    { icon: <AlertTriangle size={20} />, label: 'Low Stock', value: '8', detail: 'Items below threshold', tone: 'orange' },
    { icon: <XCircle size={20} />, label: 'Out of Stock', value: '5', detail: 'Items unavailable', tone: 'red' },
    { icon: <Package size={20} />, label: 'Allocated Today', value: '12', detail: 'Rolls released', tone: 'blue' },
    { icon: <Truck size={20} />, label: 'Deliveries Today', value: '3', detail: 'New receipts', tone: 'green' },
  ];

  const quickActions = [
    { icon: <Truck size={20} />, title: 'Receive Stock', detail: 'Record new fabric deliveries', tone: 'gold' },
    { icon: <Package size={20} />, title: 'Allocate Fabric', detail: 'Allocate fabric to production', tone: 'blue' },
    { icon: <Edit3 size={20} />, title: 'Update Stock', detail: 'Adjust or update stock levels', tone: 'green' },
    { icon: <List size={20} />, title: 'View Inventory', detail: 'Browse all fabrics in stock', tone: 'purple' },
  ];

  const recentActivity = [
    { icon: <LayoutGrid size={15} />, time: '09:42 AM', text: '6 m Black Jacquard allocated to Production', tone: 'gold' },
    { icon: <Edit3 size={15} />, time: '09:15 AM', text: 'Green Chiffon stock updated', tone: 'green' },
    { icon: <XCircle size={15} />, time: '08:51 AM', text: 'White Cotton Poplin marked Out of Stock', tone: 'red' },
    { icon: <Truck size={15} />, time: 'Yesterday, 04:30 PM', text: 'New Linen shipment received (25 m)', tone: 'green' },
  ];

  const TONE_COLORS = {
    gold: { bg: '#fff8ee', color: '#c97b08', iconBg: '#fff1d6' },
    orange: { bg: '#fff5e8', color: '#e48600', iconBg: '#fff0d6' },
    red: { bg: '#fff5f0', color: '#c0392b', iconBg: '#ffe8e4' },
    blue: { bg: '#eaf2ff', color: '#1767df', iconBg: '#dbeafe' },
    green: { bg: '#f0faf4', color: '#2a7d4f', iconBg: '#dcf5e8' },
    purple: { bg: '#f5f0ff', color: '#6b3fa0', iconBg: '#ede4ff' },
  };

  const priorityStyle = (p) => ({
    High: { background: '#fff5f0', color: '#8a3520', border: '1px solid #f0c8b8' },
    Medium: { background: '#fffbf0', color: '#7a6030', border: '1px solid #f0ddb0' },
    Low: { background: '#f0faf4', color: '#2a7d4f', border: '1px solid #b8e4cb' },
  }[p] || {});

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} />
          <div>
            <h2>Inventory Overview</h2>
            <p>Real-time view of fabric stock, alerts, and daily activity</p>
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <PlusCircle size={14} /> Receive Stock
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-carousel-wrap">
        <section className="inventory-overview-kpis" ref={kpiRef} onScroll={handleKpiScroll}>
          {kpis.map(({ icon, label, value, detail, tone }) => (
            <article className={tone} key={label}>
              <i>{icon}</i>
              <span>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{detail}</p>
              </span>
            </article>
          ))}
        </section>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Inventory Alerts */}
        <div className="os-card">
          <div className="os-card-head">
            <AlertTriangle size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Inventory Alerts</strong>
              <p>Low stock and out-of-stock items</p>
            </div>
            <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fabric', 'Category', 'Remaining', 'Status', ''].map((col) => (
                    <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '9px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #eee5da' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map(([fabric, category, remaining, status]) => (
                  <tr key={fabric} onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', fontWeight: 600, color: '#1a1611' }}>{fabric}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{category}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', fontWeight: 700, color: status === 'Out of Stock' ? '#8a3520' : '#7a6030' }}>{remaining}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, ...(status === 'Out of Stock' ? { background: '#fff5f0', color: '#8a3520' } : { background: '#fffbf0', color: '#7a6030' }) }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <button style={{ padding: '4px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Allocations */}
        <div className="os-card">
          <div className="os-card-head">
            <Package size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Pending Allocations</strong>
              <p>Awaiting fabric release</p>
            </div>
            <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Invoice', 'Customer', 'Fabric', 'Priority'].map((col) => (
                    <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '9px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #eee5da' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map(([invoice, customer, fabric, priority]) => (
                  <tr key={invoice} onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid #f3ede5', fontFamily: 'monospace', color: '#5a4e42' }}>{invoice}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', fontWeight: 600, color: '#1a1611' }}>{customer}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{fabric}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, ...priorityStyle(priority) }}>
                        {priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f3ede5', background: '#faf7f3' }}>
            <button style={{ fontSize: 12, color: '#c97b08', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              View all pending allocations →
            </button>
          </div>
        </div>

        {/* Today's Allocations */}
        <div className="os-card">
          <div className="os-card-head">
            <LayoutGrid size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Today&apos;s Allocations</strong>
              <p>Fabric released to production today</p>
            </div>
            <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Invoice', 'Customer', 'Fabric', 'Qty', 'Released To', 'Time'].map((col) => (
                    <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '9px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #eee5da' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allocations.map(([invoice, customer, fabric, qty, by, time]) => (
                  <tr key={invoice} onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid #f3ede5', fontFamily: 'monospace', color: '#5a4e42' }}>{invoice}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', fontWeight: 600, color: '#1a1611' }}>{customer}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{fabric}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', fontWeight: 700, color: '#1a1611' }}>{qty}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{by}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid #f3ede5', color: '#8a7a6a' }}>{time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f3ede5', background: '#faf7f3' }}>
            <button style={{ fontSize: 12, color: '#c97b08', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              View all today&apos;s allocations →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="os-card">
          <div className="os-card-head">
            <PlusCircle size={15} style={{ color: '#c0a87a' }} />
            <div>
              <strong>Quick Actions</strong>
              <p>Common inventory tasks</p>
            </div>
          </div>
          <div className="os-card-body">
            <div className="os-grid-2" style={{ gap: 10 }}>
              {quickActions.map(({ icon, title, detail, tone }) => {
                const t = TONE_COLORS[tone] || TONE_COLORS.gold;
                return (
                  <button
                    key={title}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px', background: t.bg, border: `1px solid ${t.iconBg}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'opacity 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: t.iconBg, color: t.color }}>
                      {icon}
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1611' }}>{title}</span>
                      <span style={{ display: 'block', fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="os-card">
        <div className="os-card-head">
          <TrendingUp size={15} style={{ color: '#c0a87a' }} />
          <div>
            <strong>Recent Activity</strong>
            <p>Latest stock movements and updates</p>
          </div>
          <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            View all <ChevronRight size={12} />
          </button>
        </div>
        <div className="os-card-body" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {recentActivity.map(({ icon, time, text, tone }) => {
            const t = TONE_COLORS[tone] || TONE_COLORS.gold;
            return (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: '1 1 260px', padding: '12px', background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: t.iconBg, color: t.color, flexShrink: 0 }}>
                  {icon}
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a7a6a', marginBottom: 3 }}>{time}</span>
                  <span style={{ display: 'block', fontSize: 13, color: '#1a1611', lineHeight: 1.4 }}>{text}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .os-page > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
