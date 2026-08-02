import { useMemo, useState } from 'react';
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

export default function AccountsInventoryReconciliationPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Items');
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

  return <div className="accounts-reconciliation-page">
    <header className="reconciliation-toolbar"><label>▣ &nbsp; 22 Jul – 22 Jul 2026 &nbsp;⌄</label><button>⇩ &nbsp; Export Report</button></header>
    <section className="reconciliation-layout">
      <main>
        <section className="reconciliation-kpis">{[
          ['◇', 'Total Allocated', money.format(allocatedValue), 'Across all stores', 'purple'],
          ['▤', 'Total Deducted', money.format(deductedValue), 'From production', 'green'],
          ['◔', 'Adjustments', money.format(Math.abs(varianceValue)), 'Manual adjustments', 'orange'],
          ['✓', 'In Balance', 28, 'Items / Fabrics', 'green'],
          ['△', 'Discrepancies', 8, 'Items / Fabrics', 'red'],
          ['♧', 'Value Variance', money.format(varianceValue), '2.61% variance', 'blue'],
        ].map(([icon, label, value, detail, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong><p>{detail}</p></span></article>)}</section>
        <section className="reconciliation-register">
          <header><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fabric, SKU, or store..." /></label><select><option>Store</option></select><select><option>Fabric Category</option></select><select><option>Reconciliation Status</option></select><select><option>▣ &nbsp; Date Range</option></select><button>⌁ &nbsp; Filters &nbsp;▽</button></header>
          <nav>{[['All Items', 36], ['In Balance', 28], ['Discrepancy', 8], ['Adjusted', 5]].map(([label, count]) => <button className={tab === label ? 'active' : ''} onClick={() => setTab(label)} key={label}>{label}<b>{count}</b></button>)}</nav>
          <div className="reconciliation-table"><table><thead><tr><th>Fabric / SKU</th><th>Category</th><th>Store</th><th>Allocated</th><th>Deducted</th><th>Adjustments</th><th>Variance</th><th>Status</th><th>Last Reconciled</th><th>Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.sku}><td><i className={`fabric-swatch swatch-${item.tone}`}/><span><strong>{item.name}</strong><small>{item.sku}</small></span></td><td>{item.category}</td><td>{item.store}</td><td><strong>{item.allocated.toFixed(1)} yds</strong><small>{money.format(item.allocated * item.unitValue)}</small></td><td><strong>{item.deducted.toFixed(1)} yds</strong><small>{money.format(item.deducted * item.unitValue)}</small></td><td className={item.adjustment > 0 ? 'positive' : item.adjustment < 0 ? 'negative' : ''}><strong>{item.adjustment > 0 ? '+' : ''}{item.adjustment.toFixed(1)} yds</strong><small>{money.format(item.adjustment * item.unitValue)}</small></td><td className={item.variance < 0 ? 'negative' : 'positive'}><strong>{item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)} yds</strong><small>{money.format(item.variance * item.unitValue)}</small></td><td><Status>{item.status}</Status></td><td>{item.date}<small>by {item.by}</small></td><td><button aria-label={`View ${item.name} reconciliation`}>⋮</button></td></tr>)}</tbody></table></div>
          <footer><span>Showing {filtered.length ? 1 : 0} to {filtered.length} of 36 items</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>5</button><button>›</button></div></footer>
        </section>
        <footer className="reconciliation-note">ⓘ &nbsp; Reconciliation should be performed daily to ensure accurate inventory and financial reporting.</footer>
      </main>
      <aside className="reconciliation-side">
        <article><h3>Reconciliation Summary</h3><div className="reconciliation-donut"><i/><ul><li><em className="balanced"/>In Balance <span>28 (77.8%)</span></li><li><em className="adjusted"/>Adjusted <span>5 (13.9%)</span></li><li><em className="discrepancy"/>Discrepancies <span>8 (22.2%)</span></li></ul></div></article>
        <article><h3>Variance Breakdown</h3><dl><dt>Positive Variance</dt><dd className="positive">+₦22,150</dd><dt>Negative Variance</dt><dd className="negative">-₦290,300</dd><dt>Net Variance</dt><dd className="negative">-₦268,150</dd><dt>Variance %</dt><dd>2.61%</dd></dl></article>
        <article className="top-discrepancies"><h3>Top Discrepancies by Value</h3>{discrepancies.slice(0, 3).reverse().map((item, index) => <section key={item.sku}><i>{index + 1}</i><span><strong>{item.name}</strong><small>{item.store}</small></span><b>{money.format(item.variance * item.unitValue)}</b></section>)}<button>View all discrepancies &nbsp;→</button></article>
        <article className="reconciliation-actions"><h3>Reports &amp; Review</h3><div><button>▤<span>View Reconciliation Logs</span></button><button>⇩<span>Download Reconciliation</span></button></div></article>
      </aside>
    </section>
  </div>;
}
