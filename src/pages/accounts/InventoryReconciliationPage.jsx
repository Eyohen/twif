import { useEffect, useMemo, useRef, useState } from 'react';
import { Boxes, PackageCheck, SlidersHorizontal, CircleCheck, AlertTriangle, TrendingDown, Search, Download, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { money, formatMoment } from '../../utils/oms';
import { downloadCsv, csvStamp } from '../../utils/csv';
import { Status } from '../../components/oms/Common';

// This page used to be eight invented fabrics with invented staff names, dates
// and a "2.61% variance" that came from nowhere — figures an accountant could
// have acted on. It now reconciles the two records the shop actually keeps:
// what each item has left on the shelf, and every allocation booked against it.

const KPI_COUNT = 6;

const number = (value) => Number(value || 0);

const statusOf = (fabric) => {
  const quantity = number(fabric.quantity);
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= number(fabric.lowStockThreshold)) return 'Low Stock';
  return 'In Balance';
};

const TABS = ['All Items', 'In Balance', 'Low Stock', 'Out of Stock'];

export default function AccountsInventoryReconciliationPage() {
  const [fabrics, setFabrics] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All Items');
  const [location, setLocation] = useState('All Locations');
  const [type, setType] = useState('All Types');
  const [activeKpiDot, setActiveKpiDot] = useState(0);
  const kpiScrollRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/oms/fabrics'),
      api.get('/oms/fabrics/allocations'),
    ]).then(([itemsResponse, allocationsResponse]) => {
      setFabrics(itemsResponse.data?.data?.fabrics || []);
      setAllocations(allocationsResponse.data?.data?.allocations || []);
    }).catch((requestError) => {
      setFabrics([]);
      setError(requestError.response?.data?.message || 'The reconciliation could not be loaded.');
    });
  }, []);

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return;
    const { scrollLeft, scrollWidth } = kpiScrollRef.current;
    setActiveKpiDot(Math.round(scrollLeft / (scrollWidth / KPI_COUNT)));
  };

  // Allocation is what takes stock off the shelf, so the two sides of the
  // reconciliation are the item's remaining count and the sum booked against it.
  const rows = useMemo(() => (fabrics || []).map((fabric) => {
    const booked = allocations.filter((allocation) => allocation.fabricId === fabric.id);
    const allocated = booked.reduce((sum, allocation) => sum + number(allocation.quantity), 0);
    const latest = booked[0] || null;
    const cost = number(fabric.cost);
    return {
      ...fabric,
      allocated,
      allocationCount: booked.length,
      received: number(fabric.quantity) + allocated,
      onHandValue: number(fabric.quantity) * cost,
      allocatedValue: allocated * cost,
      status: statusOf(fabric),
      lastAllocatedAt: latest?.createdAt || null,
      lastAllocatedTo: latest ? `${latest.invoiceNumber} · ${latest.tailorName}` : null,
    };
  }), [fabrics, allocations]);

  // An allocation whose item has since been deleted is the one true break in
  // the ledger: stock left the shelf and there is nothing left to book it to.
  const orphaned = useMemo(() => {
    const known = new Set((fabrics || []).map((fabric) => fabric.id));
    return allocations.filter((allocation) => !known.has(allocation.fabricId));
  }, [fabrics, allocations]);

  const locations = ['All Locations', ...[...new Set(rows.map((row) => row.location).filter(Boolean))].sort()];
  const types = ['All Types', ...[...new Set(rows.map((row) => row.type).filter(Boolean))].sort()];

  const filtered = rows.filter((row) => {
    const haystack = `${row.name} ${row.sku || ''} ${row.location || ''}`.toLowerCase();
    if (!haystack.includes(search.toLowerCase())) return false;
    if (tab !== 'All Items' && row.status !== tab) return false;
    if (location !== 'All Locations' && row.location !== location) return false;
    if (type !== 'All Types' && row.type !== type) return false;
    return true;
  });

  const onHandValue = rows.reduce((sum, row) => sum + row.onHandValue, 0);
  const allocatedValue = rows.reduce((sum, row) => sum + row.allocatedValue, 0);
  const inBalance = rows.filter((row) => row.status === 'In Balance');
  const lowStock = rows.filter((row) => row.status === 'Low Stock');
  const outOfStock = rows.filter((row) => row.status === 'Out of Stock');
  const uncosted = rows.filter((row) => !number(row.cost));
  const share = (count) => (rows.length ? `${Math.round((count / rows.length) * 100)}%` : '0%');

  const tabCounts = {
    'All Items': rows.length,
    'In Balance': inBalance.length,
    'Low Stock': lowStock.length,
    'Out of Stock': outOfStock.length,
  };

  const exportReconciliation = () => downloadCsv(
    `twif-reconciliation-${csvStamp()}.csv`,
    ['Item', 'SKU', 'Type', 'Location', 'Unit', 'On hand', 'Allocated to jobs', 'Received in total', 'Unit cost', 'Value on hand', 'Value allocated', 'Status', 'Last allocation'],
    filtered.map((row) => [
      row.name, row.sku || '', row.type || '', row.location || '', row.unit || '',
      number(row.quantity), row.allocated, row.received, number(row.cost),
      row.onHandValue, row.allocatedValue, row.status,
      row.lastAllocatedAt ? formatMoment(row.lastAllocatedAt) : 'Never',
    ])
  );

  const exportAllocations = () => downloadCsv(
    `twif-allocations-${csvStamp()}.csv`,
    ['Date', 'Item', 'Quantity', 'Unit', 'Invoice', 'Customer', 'Tailor'],
    allocations.map((allocation) => [
      allocation.createdAt ? formatMoment(allocation.createdAt) : '',
      allocation.fabricName, number(allocation.quantity), allocation.unit,
      allocation.invoiceNumber, allocation.customerName, allocation.tailorName,
    ])
  );

  if (!fabrics) {
    return (
      <div className="os-page">
        <div className="os-card" style={{ padding: 40, textAlign: 'center', color: '#8a7a6a' }}>Loading reconciliation…</div>
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} />
          <div>
            <h2>Inventory Reconciliation</h2>
            <p>What each item has left, against everything allocated out of it</p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportReconciliation}
          disabled={!filtered.length}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            background: filtered.length ? '#1a1611' : '#ddd5c8', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: filtered.length ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          <Download size={14} /> Export Report
        </button>
      </div>

      {error ? (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fff5f0', color: '#8a3520', border: '1px solid #f0c8b8', fontSize: 13 }}>{error}</div>
      ) : null}

      <div className="kpi-carousel-wrap">
        <section className="reconciliation-kpis" ref={kpiScrollRef} onScroll={handleKpiScroll}>
          {[
            [<Boxes size={18} />, 'Items Tracked', rows.length, `${allocations.length} allocations booked`, 'purple'],
            [<PackageCheck size={18} />, 'Value On Hand', money.format(onHandValue), uncosted.length ? `${uncosted.length} without a unit cost` : 'Every item costed', 'green'],
            [<SlidersHorizontal size={18} />, 'Allocated To Jobs', money.format(allocatedValue), 'At unit cost', 'orange'],
            [<CircleCheck size={18} />, 'In Balance', inBalance.length, `${share(inBalance.length)} of items`, 'green'],
            [<AlertTriangle size={18} />, 'Low Or Out', lowStock.length + outOfStock.length, `${outOfStock.length} at zero`, 'red'],
            [<TrendingDown size={18} />, 'Unmatched', orphaned.length, orphaned.length ? 'Allocated, item since removed' : 'Every allocation matches an item', 'blue'],
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
      </div>

      <div className="os-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="os-card">
            <div className="os-card-body" style={{ gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff' }}>
                  <Search size={14} style={{ color: '#b0a090', flexShrink: 0 }} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search item, SKU or location..."
                    style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1a1611', background: 'transparent', flex: 1 }}
                  />
                </label>
                {[[location, setLocation, locations], [type, setType, types]].map(([value, setValue, options]) => (
                  <select
                    key={options[0]}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    style={{ padding: '9px 32px 9px 12px', border: '1px solid #ddd5c8', borderRadius: 8, fontSize: 13, color: '#5a4e42', background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23998877' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', cursor: 'pointer' }}
                  >
                    {options.map((option) => <option key={option}>{option}</option>)}
                  </select>
                ))}
              </div>
              <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TABS.map((label) => (
                  <button
                    type="button"
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
                    }}>{tabCounts[label]}</span>
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
                  {['Item / SKU', 'Type', 'Location', 'On Hand', 'Allocated Out', 'Received In Total', 'Status', 'Last Allocation'].map((col) => (
                    <th key={col} style={{ textTransform: 'uppercase', fontSize: 10, color: '#8a7a6a', letterSpacing: '0.08em', padding: '11px 14px', background: '#faf7f3', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #eee5da' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#8a7a6a', fontSize: 14 }}>
                      <Boxes size={32} style={{ display: 'block', margin: '0 auto 10px', color: '#ddd5c8' }} />
                      {rows.length ? 'No items match this filter' : 'No inventory has been added yet'}
                    </td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} onMouseEnter={(e) => e.currentTarget.style.background = '#faf7f3'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', fontFamily: 'monospace', marginTop: 2 }}>{row.sku || 'No SKU'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{row.type || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5', color: '#5a4e42' }}>{row.location || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{number(row.quantity)} {row.unit}</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{number(row.cost) ? money.format(row.onHandValue) : 'No unit cost'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{row.allocated} {row.unit}</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{row.allocationCount} allocation{row.allocationCount === 1 ? '' : 's'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ fontWeight: 600, color: '#1a1611' }}>{row.received} {row.unit}</div>
                      <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>On hand plus allocated</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <Status>{row.status}</Status>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f3ede5' }}>
                      <div style={{ color: '#1a1611' }}>{row.lastAllocatedAt ? formatMoment(row.lastAllocatedAt) : 'Never'}</div>
                      {row.lastAllocatedTo ? <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 2 }}>{row.lastAllocatedTo}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="recon-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
            {filtered.map((row) => (
              <div key={row.id} className="os-card">
                <div className="os-card-head">
                  <div>
                    <strong>{row.name}</strong>
                    <p>{row.sku || 'No SKU'}{row.location ? ` · ${row.location}` : ''}</p>
                  </div>
                  <Status>{row.status}</Status>
                </div>
                <div className="os-card-body">
                  <div className="os-grid-3" style={{ gap: 10 }}>
                    {[
                      ['On hand', `${number(row.quantity)} ${row.unit}`],
                      ['Allocated', `${row.allocated} ${row.unit}`],
                      ['Received', `${row.received} ${row.unit}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1611', marginTop: 3 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {orphaned.length ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: '#fff5f0', border: '1px solid #f0c8b8', borderRadius: 10, color: '#8a3520' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                {orphaned.length} allocation{orphaned.length === 1 ? '' : 's'} point at an item that is no longer in inventory
                ({[...new Set(orphaned.map((allocation) => allocation.fabricName))].join(', ')}). The stock left the shelf but
                there is nothing left to reconcile it against.
              </p>
            </div>
          ) : null}
        </div>

        <aside className="os-sidebar">
          <div className="os-summary-card">
            <header>
              <Boxes size={15} />
              <h3>Reconciliation Summary</h3>
            </header>
            <dl>
              <dt>In Balance</dt>
              <dd style={{ color: '#2a7d4f', fontWeight: 700 }}>{inBalance.length} ({share(inBalance.length)})</dd>
              <dt>Low Stock</dt>
              <dd style={{ color: '#c97b08', fontWeight: 700 }}>{lowStock.length} ({share(lowStock.length)})</dd>
              <dt>Out of Stock</dt>
              <dd style={{ color: '#8a3520', fontWeight: 700 }}>{outOfStock.length} ({share(outOfStock.length)})</dd>
            </dl>
          </div>

          <div className="os-summary-card">
            <header>
              <TrendingDown size={15} />
              <h3>Value</h3>
            </header>
            <dl>
              <dt>On hand</dt>
              <dd style={{ color: '#1a1611', fontWeight: 700 }}>{money.format(onHandValue)}</dd>
              <dt>Allocated to jobs</dt>
              <dd style={{ color: '#1a1611', fontWeight: 700 }}>{money.format(allocatedValue)}</dd>
              <dt>Received in total</dt>
              <dd style={{ color: '#1a1611', fontWeight: 700 }}>{money.format(onHandValue + allocatedValue)}</dd>
              {/* An item with no unit cost contributes nothing, so saying how
                  many there are keeps the totals honest. */}
              <dt>Items without a cost</dt>
              <dd style={{ color: uncosted.length ? '#8a3520' : '#2a7d4f', fontWeight: 700 }}>{uncosted.length}</dd>
            </dl>
          </div>

          <div className="os-card">
            <div className="os-card-head">
              <FileText size={15} style={{ color: '#c0a87a' }} />
              <div>
                <strong>Recent Allocations</strong>
                <p>Latest stock taken out for a job</p>
              </div>
            </div>
            <div className="os-card-body" style={{ gap: 10 }}>
              {allocations.length ? allocations.slice(0, 5).map((allocation) => (
                <div key={allocation.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1611', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{allocation.fabricName}</div>
                    <div style={{ fontSize: 11, color: '#8a7a6a', marginTop: 1 }}>{allocation.invoiceNumber} · {allocation.customerName}</div>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1611', whiteSpace: 'nowrap' }}>{number(allocation.quantity)} {allocation.unit}</span>
                </div>
              )) : (
                <p style={{ margin: 0, fontSize: 12, color: '#8a7a6a' }}>No fabric has been allocated to a job yet.</p>
              )}
              <button
                type="button"
                onClick={exportAllocations}
                disabled={!allocations.length}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: '#faf7f3',
                  border: '1px solid #eee5da', borderRadius: 8, cursor: allocations.length ? 'pointer' : 'not-allowed',
                  width: '100%', textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#5a4e42',
                  fontFamily: 'inherit', opacity: allocations.length ? 1 : 0.6,
                }}
              >
                <span style={{ color: '#c97b08' }}><Download size={14} /></span>
                Download allocations
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
