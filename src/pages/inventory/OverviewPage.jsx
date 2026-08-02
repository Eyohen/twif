export default function InventoryOverviewPage() {
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
  return <div className="inventory-overview-page">
    <section className="inventory-overview-kpis">{[
      ['◇', 'Total Fabrics', '156', 'Items', 'gold'],
      ['△', 'Low Stock', '8', 'Items', 'orange'],
      ['×', 'Out of Stock', '5', 'Items', 'red'],
      ['♙', 'Allocated Today', '12', 'Rolls', 'blue'],
      ['▱', 'Deliveries Today', '3', 'Received', 'green'],
    ].map(([icon, label, value, detail, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong><p>{detail}</p></span></article>)}</section>
    <section className="inventory-overview-grid">
      <article className="inventory-overview-card inventory-alerts-card"><header><h2>△ &nbsp; Inventory Alerts</h2><button>View All &nbsp;›</button></header><table><thead><tr><th>Fabric</th><th>Category</th><th>Remaining</th><th>Status</th><th>Action</th></tr></thead><tbody>{alerts.map(([fabric, category, remaining, status]) => <tr key={fabric}><td>{fabric}</td><td>{category}</td><td className={status === 'Out of Stock' ? 'danger' : 'warning'}>{remaining}</td><td><b className={status === 'Out of Stock' ? 'danger' : 'warning'}>{status}</b></td><td><button>View &nbsp;›</button></td></tr>)}</tbody></table></article>
      <article className="inventory-overview-card pending-allocations-card"><header><h2>⌁ &nbsp; Pending Allocations</h2><button>View All &nbsp;›</button></header><table><thead><tr><th>Invoice</th><th>Customer</th><th>Requested Fabric</th><th>Priority</th></tr></thead><tbody>{pending.map(([invoice, customer, fabric, priority]) => <tr key={invoice}><td>{invoice}</td><td>{customer}</td><td>{fabric}</td><td><b className={`priority-${priority.toLowerCase()}`}>{priority}</b></td></tr>)}</tbody></table><footer>View all pending allocations &nbsp;›</footer></article>
      <article className="inventory-overview-card todays-allocations-card"><header><h2>▣ &nbsp; Today&apos;s Allocations</h2><button>View All &nbsp;›</button></header><table><thead><tr><th>Invoice</th><th>Customer</th><th>Fabric</th><th>Qty</th><th>Requested By</th><th>Time</th></tr></thead><tbody>{allocations.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table><footer>View all today&apos;s allocations &nbsp;›</footer></article>
      <article className="inventory-overview-card inventory-quick-actions"><header><h2>ϟ &nbsp; Quick Actions</h2></header><div>{[
        ['▱', 'Receive Stock', 'Record new fabric deliveries', 'gold'],
        ['♙', 'Allocate Fabric', 'Allocate fabric to production', 'blue'],
        ['⌕', 'Update Stock', 'Adjust or update stock levels', 'green'],
        ['◇', 'View Inventory', 'Browse all fabrics in stock', 'purple'],
      ].map(([icon, title, detail, tone]) => <button className={tone} key={title}><i>{icon}</i><span><strong>{title}</strong><small>{detail}</small></span></button>)}</div></article>
    </section>
    <section className="inventory-overview-card inventory-recent-activity"><header><h2>◷ &nbsp; Recent Activity</h2><button>View all activity &nbsp;›</button></header><div>{[
      ['▣', '09:42 AM', '6 m Black Jacquard allocated to Production', 'gold'],
      ['⌕', '09:15 AM', 'Green Chiffon stock updated', 'green'],
      ['×', '08:51 AM', 'White Cotton Poplin marked Out of Stock', 'red'],
      ['▱', 'Yesterday, 04:30 PM', 'New Linen shipment received (25 m)', 'green'],
    ].map(([icon, time, text, tone]) => <article key={text}><i className={tone}>{icon}</i><span><strong>{time}</strong><p>{text}</p></span></article>)}</div></section>
  </div>;
}
