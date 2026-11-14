import { todayIso } from '../../utils/oms';

// The one set of time filters every list and dashboard offers: Today,
// Yesterday, This Week, This Month and a Custom range, with All Time where a
// list should be able to show everything. `period` is the key; the date pair
// is only read while the key is 'custom'.
export const DEFAULT_PERIODS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'This Week'],
  ['month', 'This Month'],
  ['custom', 'Custom'],
];

export const ALL_TIME = ['all', 'All Time'];

export default function PeriodFilter({
  period,
  onPeriod,
  from,
  to,
  onFrom,
  onTo,
  periods = DEFAULT_PERIODS,
  label = 'Time period',
}) {
  return (
    <div className="period-filter" role="group" aria-label={label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {periods.map(([key, text]) => (
        <button
          key={key}
          type="button"
          aria-pressed={period === key}
          onClick={() => onPeriod(key)}
          style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: period === key ? 'none' : '1px solid #ddd5c8',
            background: period === key ? '#1a1611' : 'transparent',
            color: period === key ? '#fff' : '#5a4e42',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >{text}</button>
      ))}
      {period === 'custom' ? (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" aria-label="From date" value={from} max={to || todayIso()} onChange={(event) => onFrom(event.target.value)} />
          <span>→</span>
          <input type="date" aria-label="To date" value={to} min={from} max={todayIso()} onChange={(event) => onTo(event.target.value)} />
        </span>
      ) : null}
    </div>
  );
}

// A custom range that opens on the first of this month, so choosing Custom
// shows something straight away instead of looking as if nothing happened.
export const initialCustomRange = () => ({ from: `${todayIso().slice(0, 7)}-01`, to: todayIso() });
