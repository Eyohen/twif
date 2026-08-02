const defaultMeasurements = [
  ['Neck', '16', 'Comfort fit'], ['Shoulder', '18', '–'], ['Chest', '42', '–'],
  ['Waist', '34', '–'], ['Hip / Seat', '41', '–'], ['Sleeve Length', '24', '–'],
  ['Bicep', '15', '–'], ['Wrist', '7.5', '–'], ['Back Length', '17', '–'],
  ['Front Length', '28', '–'], ['Top Length', '29', '–'], ['Trouser Waist', '34', '–'],
  ['Trouser Hip', '41', '–'], ['Trouser Length (Outseam)', '42', '–'],
];

function BodyFigure({ back = false }) {
  return <svg className="measurement-body" viewBox="0 0 180 410" aria-label={back ? 'Back body measurement diagram' : 'Front body measurement diagram'}>
    <g fill="none" stroke="#8a8f95" strokeWidth="1.3">
      <ellipse cx="90" cy="39" rx="22" ry="29"/><path d="M70 60 48 76 34 147 25 221M110 60l22 16 14 71 9 74M54 75l7 117-8 79-4 109M126 75l-7 117 8 79 4 109M61 192l29 8 29-8M90 200v176M49 380l-12 8m94-8 12 8M25 221l-8 38m138-38 8 38"/>
    </g>
    <g stroke="#d88b00" strokeWidth="1.2" strokeDasharray="3 2" fill="none">
      <path d="M67 68h46"/><path d="M54 91h72"/><path d="M58 126h64"/><path d="M59 163h62"/><path d="M52 198h76"/><path d="M47 79l-13 144"/><path d="M126 80v105"/><path d="M90 200v174"/>
    </g>
    {[1,2,3,4,5,6,7,8].map((number,index)=><g key={number}><circle cx={[65,54,90,58,90,127,34,119][index]} cy={[68,91,126,163,198,83,145,163][index]} r="7" fill="#d88b00"/><text x={[65,54,90,58,90,127,34,119][index]} y={[71,94,129,166,201,86,148,166][index]} fill="#fff" textAnchor="middle" fontSize="7">{number}</text></g>)}
  </svg>;
}

export default function MeasurementsPage({ customer, onBack }) {
  const stored = customer.measurements || {};
  const rows = defaultMeasurements.map(([label, fallback, note]) => [label, stored[label.toLowerCase().replaceAll(' ', '')] || fallback, note]);
  return <div className="measurements-page">
    <header><div><p><button onClick={onBack}>Customers</button> &nbsp;›&nbsp; {customer.fullName} &nbsp;›&nbsp; <strong>Measurements</strong></p><h2>Measurements</h2><span>View and manage customer body measurements.</span></div><div><button>▣ &nbsp; Print / PDF</button><button>⌕ &nbsp; Edit Measurements</button><button className="use-order">＋ &nbsp; Use for New Order</button></div></header>
    <section className="measurement-customer-hero"><div><i>{customer.fullName.split(' ').map((part)=>part[0]).join('').slice(0,2)}</i><span><div><h3>{customer.fullName}</h3><b>{Number(customer.totalOrders)>1?'Returning Customer':'New Customer'}</b></div><p>⌕ &nbsp; {customer.phone||'—'} &nbsp;&nbsp;&nbsp; ▣ &nbsp; {customer.email||'—'} &nbsp;&nbsp;&nbsp; ◉ &nbsp; {customer.stores?.[0]||'Lekki'} Store</p><small>Last updated: {customer.updatedAt?new Date(customer.updatedAt).toLocaleDateString('en-GB'):'Recently'} by Bola</small></span></div><dl><div><dt>Measurement Set</dt><dd>#3</dd></div><div><dt>Created On</dt><dd>{customer.createdAt?new Date(customer.createdAt).toLocaleDateString('en-GB'):'—'}</dd></div><div><dt>Last Updated</dt><dd>{customer.updatedAt?new Date(customer.updatedAt).toLocaleDateString('en-GB'):'—'}</dd></div><div><dt>Total Orders Using</dt><dd>{customer.totalOrders||0} orders</dd></div></dl></section>
    <nav className="measurement-tabs"><button className="active">Measurements</button><button>Measurement History</button><button>Notes</button></nav>
    <section className="measurement-content">
      <article className="body-measurement-table"><h3>Body Measurements</h3><table><thead><tr><th/><th>Measurement</th><th>Value</th><th>Units</th><th>Fit Note</th></tr></thead><tbody>{rows.map(([label,value,note],index)=><tr key={label}><td>{index+1}</td><td><strong>{label}</strong></td><td>{value}</td><td>in</td><td>{note}</td></tr>)}</tbody></table><footer>ⓘ &nbsp; All measurements are in inches. Ensure the customer stands straight and relaxed during measurement.</footer></article>
      <aside><article className="measurement-diagram"><header><h3>Measurement Diagram</h3><div><button className="active">Inches</button><button>cm</button></div></header><div><BodyFigure/><BodyFigure back/><ol>{defaultMeasurements.map(([label],index)=><li key={label}><i>{index+1}</i>{label.replace(' (Outseam)','')}</li>)}</ol></div></article><article className="measurement-additional"><h3>Additional Information</h3><dl><dt>Posture</dt><dd>Normal</dd><dt>Body Build</dt><dd>Average</dd><dt>Preferred Fit</dt><dd>{customer.preferredFit||'Regular Fit'}</dd><dt>Remarks</dt><dd>{customer.notes||'Prefers slim fit for pants. Likes comfortable chest fit.'}</dd></dl></article></aside>
    </section>
  </div>;
}
