import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { api } from '../../lib/api';

// Weekly production targets, shown wherever someone needs them: the Production
// overview, Tailor Performance, and a tailor's own log. A week is Monday to
// Sunday. Completed jobs are counted as they are — 8 against a target of 5 reads
// 8/5 — and every week stands on its own.

export const STATUS_LABELS = {
  not_met: 'Target Not Met',
  met: 'Target Met',
  exceeded: 'Target Exceeded',
  no_target: 'No target set',
};

export function TargetStatus({ status }) {
  return <span className={`target-status is-${status}`}>{STATUS_LABELS[status] || STATUS_LABELS.no_target}</span>;
}

const shortDay = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const weekRangeLabel = (weekStart) => {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${shortDay(weekStart)} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};
const shiftWeek = (weekStart, weeks) => {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
};

// The bar is only ever full at 100%; the number beside it is not capped.
function Progress({ completed, target }) {
  const fill = target ? Math.min(completed / target, 1) * 100 : 0;
  return <div className={`tailor-workload-bar${target && completed >= target ? ' is-full' : ''}`} style={{ '--fill': `${fill}%` }} />;
}

// Every tailor's week, with a stepper to go back through earlier weeks. Management
// flags (a result worth a bonus review, or a run of missed weeks) are shown to
// management only; nothing is ever applied automatically.
export function TailorTargetBoard({ showFlags = true }) {
  const [week, setWeek] = useState('');
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    api.get('/oms/tailor-targets', { params: week ? { week } : {} })
      .then((response) => { if (!cancelled) setData(response.data?.data || null); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [week]);

  const current = data?.week;
  const goBack = () => setWeek(shiftWeek(current.start, -1));
  const goForward = () => setWeek(shiftWeek(current.start, 1));

  return (
    <div className="target-board">
      <div className="target-stepper" role="group" aria-label="Week">
        <button type="button" onClick={goBack} disabled={!current} aria-label="Previous week"><ChevronLeft size={15} /></button>
        <div>
          <strong>{current?.current ? 'This week' : 'Week'}</strong>
          <small>{current ? weekRangeLabel(current.start) : 'Loading…'}</small>
        </div>
        <button type="button" onClick={goForward} disabled={!current || current.current} aria-label="Next week"><ChevronRight size={15} /></button>
        {current && !current.current ? <button type="button" className="target-today" onClick={() => setWeek('')}>This week</button> : null}
      </div>

      <div className="target-list">
        {failed ? <div className="invoice-preview-empty">The targets could not be loaded.</div> : null}
        {!failed && data && !data.tailors.length ? <div className="invoice-preview-empty">No tailors are set up yet.</div> : null}
        {!failed && data ? data.tailors.map((tailor) => (
          <div key={tailor.id} className="target-row">
            <div className="tailor-workload-row">
              <div className="tailor-workload-identity">
                <div className="table-avatar table-avatar--sm">{tailor.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <span className="tailor-workload-name">{tailor.name}<small>{tailor.departments.join(', ') || 'No department'}</small></span>
              </div>
              <div className="tailor-workload-count">
                {tailor.target ? (
                  <strong aria-label={`${tailor.completed} of ${tailor.target} jobs`}>{tailor.completed}/{tailor.target}</strong>
                ) : (
                  <strong aria-label={`${tailor.completed} jobs, no target`}>{tailor.completed}</strong>
                )}
                <Progress completed={tailor.completed} target={tailor.target} />
              </div>
            </div>
            <div className="target-row-foot">
              <TargetStatus status={tailor.status} />
              {tailor.status === 'no_target' ? <small>The Owner sets a target under User Management.</small> : null}
            </div>
            {showFlags && tailor.flag ? (
              <p className={`target-flag is-${tailor.flag.type}`}>
                <Flag size={12} /> {tailor.flag.text} <em>For management review. Nothing is applied automatically.</em>
              </p>
            ) : null}
          </div>
        )) : null}
      </div>
    </div>
  );
}

// One tailor's weeks, newest first: the target that applied, what was completed,
// and how it came out. Management passes a staffId; a tailor reads their own.
export function TargetHistory({ staffId, weeks = 12, title = 'Weekly record' }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const request = staffId
      ? api.get('/oms/tailor-targets/history', { params: { staffId, weeks } })
      : api.get('/oms/tailor-targets/me', { params: { weeks } });
    request
      .then((response) => { if (!cancelled) setData(response.data?.data || null); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [staffId, weeks]);

  const rows = data?.weeks || [];
  return (
    <div className="target-history">
      <h4>{title}</h4>
      {failed ? <p className="target-history-note">The weekly record could not be loaded.</p> : null}
      {!failed && data && !rows.length ? <p className="target-history-note">No weeks to show yet.</p> : null}
      {rows.length ? (
        <table className="tailor-log-table">
          <thead><tr><th>Week</th><th>Target</th><th>Completed</th><th>Result</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.weekStart}>
                <td>{weekRangeLabel(row.weekStart)}{index === 0 ? ' (this week)' : ''}</td>
                <td>{row.target ?? '—'}</td>
                <td>{row.completed}{row.target ? `/${row.target}` : ''}</td>
                <td><TargetStatus status={row.status} />{!row.closed ? <small className="target-history-note"> so far</small> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {staffId && data?.flag ? (
        <p className={`target-flag is-${data.flag.type}`}><Flag size={12} /> {data.flag.text} <em>For management review. Nothing is applied automatically.</em></p>
      ) : null}
    </div>
  );
}

// A tailor's own weeks, newest first, read once so the card and the figures beside
// it on their log come from the same count.
export function useMyTargetWeeks(count = 12) {
  const [weeks, setWeeks] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.get('/oms/tailor-targets/me', { params: { weeks: Math.min(52, Math.max(1, count)) } })
      .then((response) => { if (!cancelled) setWeeks(response.data?.data?.weeks || []); })
      .catch(() => { if (!cancelled) setWeeks([]); });
    return () => { cancelled = true; };
  }, [count]);
  return weeks;
}

// One of a tailor's weeks at the top of their log.
export function MyTargetCard({ week }) {
  if (!week) return null;
  return (
    <div className="target-card">
      <div>
        <small>Weekly target · {weekRangeLabel(week.weekStart)}</small>
        <strong>{week.target ? `${week.completed}/${week.target}` : `${week.completed}`}</strong>
        <span>{week.target
          ? `jobs completed ${week.closed ? 'that' : 'this'} week`
          : `jobs completed ${week.closed ? 'that' : 'this'} week. No target was set for you for this week.`}</span>
      </div>
      <div className="target-card-side">
        <TargetStatus status={week.status} />
        {week.target ? <Progress completed={week.completed} target={week.target} /> : null}
      </div>
    </div>
  );
}
