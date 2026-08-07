import { useMemo, useRef, useState } from 'react';
import { Boxes, PackageCheck, SlidersHorizontal, CircleCheck, AlertTriangle, TrendingDown, Search, Download, MoreHorizontal, FileText } from 'lucide-react';
import { money } from '../../utils/oms';
import { Status } from '../../components/oms/Common';

const reconciliationItems = [
  ['Satin Fabric (Black)', 'SAT-BLK-001', 'Satin', 'Lekki', 120, 118, 2, -2, 'Discrepancy', '22 Jul 2026', 'Femi', 2000],
  ['Lining Fabric (Navy)', 'LIN-NVY-002', 'Lining', 'Ikoyi', 85, 85, 0, 0, 'In Balance', '22 Jul 2026', 'Bola', 1000],
  ['Lining Fabric (Cream)', 'LIN-CRM-003', 'Lining', 'Lekki', 60, 55, 0, -5, 'Discrepancy', '22 Jul 2026', 'Femi', 1000],
  ['Wool (Charcoal)', 'WOL-CHR-004', 'Wool', 'VI', 45, 45, 0, 0, 'In Balance', '21 Jul 2026', 'Grace', 4000],
  ['Lace Fabric (Black)', 'LAC-BLK-005', 'Lace', 'Ikoyi', 30, 28, -1, -3, 'Adjusted', '21 Jul 2026', 'Grace', 2500],
  ['Trouser Fabric (Green)', 'TRS-GRN-006', 'Trouser', 'Lekki', 95, 85, 0, -10, 'Discrepancy', '20 Jul 2026', 'Femi', 2500],
  ['Shirt Fabric (White)', 'SHR-WHT-007', 'Shirt', 'Lekki', 110, 110, 0, 0, 'In Balance', '20 Jul 2026', 'Bola', 1500],
  ['Satin Fabric (Burgundy)', 'SAT-BRG-008', 'Satin', 'VI', 70, 66, 2, -2, 'Discrepancy', '20 Jul 2026', 'Femi', 2000],
].map(([name, sku, category, store, allocated, deducted, adjustment, variance, status, date, by, unitValue], index) => ({ name, sku, category, store, allocated, deducted, adjustment, variance, status, date, by, unitValue, tone: index }));

const KPI_COUNT = 6;

const SWATCH_COLORS = ['#3a2e26', '#1d3a5c', '#e8e0d0', '#4a4a4a', '#1a1a2e', '#2d5a27', '#f5f0e8', '#6b1a1a'];

export default function AccountsInventoryReconciliationPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Items');
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    const cardWidth = scrollWidth / KPI_COUNT;
    setActiveKpiDot(Math.round(scrollLeft / cardWidth));
  };

  const filtered = useMemo(() => reconciliationItems.filter((item) => {
    const searchMatch = `${item.name} ${item.sku} ${item.store}`.toLowerCase().includes(search.toLowerCase());
    const tabMatch = tab === 'All Items' || item.status === tab;
    return searchMatch && tabMatch;
  }), [search, tab]);
  const allocatedValue = reconciliationItems.reduce((sum, item) => sum + item.allocated * item.unitValue, 0);
  const deductedValue = reconciliationItems.reduce((sum, item) => sum + item.deducted * item.unitValue, 0);
  const varianceValue = allocatedValue - deductedValue;
  const discrepancies = reconciliationItems.filter((item) => item.status === 'Discrepancy');
  const balanced = reconciliationItems.filter((item) => item.status === 'In Balance');
  const adjusted = reconciliationItems.filter((item) => item.status === 'Adjusted');

  const tabs = [
    ['All Items', 36],
    ['In Balance', 28],
    ['Discrepancy', 8],
    ['Adjusted', 5],
  ];

  return (
    <div className="os-page">
      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} />
          <div>
            <h2>Inventory Reconciliation</h2>
            <p>Compare allocated vs. deducted fabric quantities across all stores</p>
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={14} /> Export Report
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-carousel-wrap">
        <section className="reconciliation-kpis" ref={kpiScrollRef} onScroll={handleKpiScroll}>
          {[
            [<Boxes size={18} />, 'Total Allocated', money.format(allocatedValue), 'Across all stores', 'purple'],
            [<PackageCheck size={18} />, 'Total Deducted', money.format(deductedValue), 'From production', 'green'],
            [<SlidersHorizontal size={18} />, 'Adjustments', money.format(Math.abs(varianceValue)), 'Manual adjustments', 'orange'],
            [<CircleCheck size={18} />, 'In Balance', balanced.length, 'Items / Fabrics', 'green'],
            [<AlertTriangle size={18} />, 'Discrepancies', discrepancies.length, 'Items / Fabrics', 'red'],
            [<TrendingDown size={18} />, 'Value Variance', money.format(varianceValue), '2.61% variance', 'blue'],
          ].map(([icon, label, value, detail, tone]) => (
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
        <div className="kpi-scroll-dots">
          {Array.from({ length: KPI_COUNT }, (_, i) => (
            <span key={i} className={activeKpiDot === i ? 'dot-active' : ''} />
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="os-layout">
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter & Search Bar */}
          <div className="os-card">
            <div className="os-card-body" style={{ gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff' }}>
                  <Search size={14} style={{ color: '#b0a090', flexShrink: 0 }} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search fabric, SKU, or store..."
                    style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1a1611', background: 'transparent', flex: 1 }}
                  />
                </label>
                {['Store', 'Fabric Category', 'Reconciliation Status'].map((placeholder) => (
                  <select key={placeholder} style={{ padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' }}>
                    <option>{placeholder}</option>
                  </select>
                ))}
              </div>
              {/* Tab Nav */}
              <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tabs.map(([label, count]) => (
                  <button
                    key={label}
                    onClick={() => setTab(label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      borderRadius: 20, border: '1px solid', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      background: tab === label ? '#1a1611' : 'transparent',
                      color: tab === label ? '#fff' : '#5a4e42',
                      borderColor: tab === label ? '#1a1611' : '#ddd5c8',
                    }}
                  >
                    {label}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 18, height: 18, borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: tab === label ? 'rgba(255,255,255,0.2)' : '#f3ede5',
                      color: tab === label ? '#fff' : '#8a7a6a', padding: '0 5px',
                    }}>{count}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Desktop Table */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee5da', background: '#fff' }} className="recon-table-desktop">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fabric / SKU', 'Category', 'Store', 'Allocated', 'Deducted', 'Adjustments', 'Variance', 'Status', 'Last Reconciled', ''].map((col) => (
                    <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '11px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #eee5da' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px 20px', color: '#8a7a6a', fontSize: 14 }}>
                      <Boxes size={32} style={{ display: 'block', margin: '0 auto 10px', color: '#ddd5c8' }} />
                      No items found
                    </td>
                  </tr>
                ) : filtered.map((item) => (
                  <tr key={item.sku} onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: SWATCH_COLORS[item.tone] || '#888', flexShrink: 0 }} />
                        <span>
                          <div style={{ fontWeight: 600, color: '#1a1611' }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: '#8a7a6a', fontFamily: 'monospace', marginTop: 2 }}>{item.sku}</div>
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{item.category}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{item.store}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{item.allocated.toFixed(1)} yds</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{money.format(item.allocated * item.unitValue)}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{item.deducted.toFixed(1)} yds</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{money.format(item.deducted * item.unitValue)}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: item.adjustment > 0 ? '#2a7d4f' : item.adjustment < 0 ? '#8a3520' : '#1a1611' }}>
                        {item.adjustment > 0 ? '+' : ''}{item.adjustment.toFixed(1)} yds
                      </div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{money.format(item.adjustment * item.unitValue)}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: item.variance < 0 ? '#8a3520' : '#2a7d4f' }}>
                        {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)} yds
                      </div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{money.format(item.variance * item.unitValue)}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <Status>{item.status}</Status>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ color: '#1a1611' }}>{item.date}</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>by {item.by}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <button aria-label={`View ${item.name} reconciliation`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid #ddd5c8', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#8a7a6a' }}>
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3ede5', background: '#faf7f3' }}>
                <span style={{ fontSize: 12, color: '#8a7a6a' }}>Showing {filtered.length ? 1 : 0}–{filtered.length} of 36 items</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['‹', '1', '2', '3', '5', '›'].map((label, i) => (
                    <button key={i} style={{ minWidth: 30, height: 30, border: '1px solid #ddd5c8', borderRadius: 6, background: label === '1' ? '#1a1611' : '#fff', color: label === '1' ? '#fff' : '#5a4e42', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card List */}
          <div className="recon-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item) => (
              <div key={item.sku} className="os-card">
                <div className="os-card-head">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: SWATCH_COLORS[item.tone] || '#888', flexShrink: 0 }} />
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.sku} · {item.store}</p>
                  </div>
                  <Status>{item.status}</Status>
                </div>
                <div className="os-card-body">
                  <div className="os-grid-3" style={{ gap: 10 }}>
                    {[
                      ['Allocated', `${item.allocated.toFixed(1)} yds`],
                      ['Deducted', `${item.deducted.toFixed(1)} yds`],
                      ['Variance', `${item.variance > 0 ? '+' : ''}${item.variance.toFixed(1)} yds`],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1611', marginTop: 3 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: '#fffbf0', border: '1px solid #f0ddb0', borderRadius: 10, color: '#7a6030' }}>
            <AlertTriangle size={14} style={{ color: '#c97b08', flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>Reconciliation should be performed daily to ensure accurate inventory and financial reporting.</p>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="os-sidebar">
          {/* Reconciliation Summary */}
          <div className="os-summary-card">
            <header>
              <Boxes size={15} />
              <h3>Reconciliation Summary</h3>
            </header>
            <dl>
              <dt>In Balance</dt>
              <dd style={{ color: '#2a7d4f', fontWeight: 700 }}>28 (77.8%)</dd>
              <dt>Adjusted</dt>
              <dd style={{ color: '#c97b08', fontWeight: 700 }}>5 (13.9%)</dd>
              <dt>Discrepancies</dt>
              <dd style={{ color: '#8a3520', fontWeight: 700 }}>8 (22.2%)</dd>
            </dl>
          </div>

          {/* Variance Breakdown */}
          <div className="os-summary-card">
            <header>
              <TrendingDown size={15} />
              <h3>Variance Breakdown</h3>
            </header>
            <dl>
              <dt>Positive Variance</dt>
              <dd style={{ color: '#2a7d4f', fontWeight: 700 }}>+₦22,150</dd>
              <dt>Negative Variance</dt>
              <dd style={{ color: '#8a3520', fontWeight: 700 }}>-₦290,300</dd>
              <dt>Net Variance</dt>
              <dd style={{ color: '#8a3520', fontWeight: 700 }}>-₦268,150</dd>
              <dt>Variance %</dt>
              <dd style={{ color: '#1a1611', fontWeight: 700 }}>2.61%</dd>
            </dl>
          </div>

          {/* Top Discrepancies */}
          <div className="os-card">
            <div className="os-card-head">
              <AlertTriangle size={15} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Top Discrepancies</strong>
                <p>By value impact</p>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 10 }}>
              {discrepancies.slice(0, 3).reverse().map((item, index) => (
                <div key={item.sku} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#fff0f0', color: '#8a3520', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{index + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1611', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 1 }}>{item.store}</div>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#8a3520', whiteSpace: 'nowrap' }}>{money.format(item.variance * item.unitValue)}</span>
                </div>
              ))}
              <button style={{ width: '100%', padding: '8px', textAlign: 'center', background: 'transparent', border: '1px solid #eee5da', borderRadius: 8, fontSize: 12, color: '#5a4e42', cursor: 'pointer', fontFamily: 'inherit' }}>
                View all discrepancies →
              </button>
            </div>
          </div>

          {/* Reports & Review */}
          <div className="os-card">
            <div className="os-card-head">
              <FileText size={15} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Reports &amp; Review</strong>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 8, padding: '12px' }}>
              {[
                [<FileText size={14} />, 'View Reconciliation Logs'],
                [<Download size={14} />, 'Download Reconciliation'],
              ].map(([icon, label]) => (
                <button key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#5a4e42', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3ede5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#faf7f3'}
                >
                  <span style={{ color: '#c97b08' }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .recon-table-desktop { display: none !important; }
          .recon-mobile-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
