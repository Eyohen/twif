import { useEffect, useMemo, useState } from 'react';
import { Scissors, Award, Clock, CheckCircle, ArrowLeft, ChevronRight, Users } from 'lucide-react';
import { api } from '../../lib/api';
import {
  LOG_PERIODS, periodWindow, previousWindow, withinWindow,
  worksOnJob, scoresForTailor, changeAgainst, changeLabel, todayIso,
} from '../../utils/oms';
import { downloadCsv, csvStamp } from '../../utils/csv';

// Production could see what was on the board today but nothing about how a
// tailor had been doing. This reads a period — week, month, quarter, year or a
// range of your own — and reports it per tailor, and per department.

const READY = ['Ready', 'Ready for Collection'];

// How a tailor did over one window: what they finished, how it was marked, and
// whether it landed by the date Production gave them.
const measure = (jobs, tailorName) => {
  const mine = jobs.filter((job) => worksOnJob(job, tailorName));
  const finished = mine.filter((job) => READY.includes(job.status));
  const scores = finished.flatMap((job) => scoresForTailor(job, tailorName));
  const dated = finished.filter((job) => job.tailorDueDate);
  const onTime = dated.filter((job) => new Date(job.updatedAt) <= new Date(`${job.tailorDueDate}T23:59:59`));
  return {
    finished: finished.length,
    inHand: mine.length - finished.length,
    // An unscored tailor is not a tailor who scored zero.
    average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    scored: scores.length,
    onTimePercent: dated.length ? Math.round((onTime.length / dated.length) * 100) : null,
  };
};

const Figure = ({ label, value, detail, tone = 'plain' }) => (
  <div className={`tailor-figure ${tone}`}>
    <small>{label}</small>
    <strong>{value}</strong>
    {detail ? <span>{detail}</span> : null}
  </div>
);

export default function TailorReportsPage({ mode = 'list', productionJobs = [] }) {
  const [staff, setStaff] = useState([]);
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayIso());
  const [openTailor, setOpenTailor] = useState(null);

  useEffect(() => {
    api.get('/oms/staff')
      .then((response) => setStaff(response.data?.data?.staffUsers || []))
      .catch(() => setStaff([]));
  }, []);

  const tailors = useMemo(
    () => staff.filter((person) => person.role === 'tailor' && person.status === 'active'),
    [staff]
  );

  const window = periodWindow(period === 'custom' && !from ? 'month' : period, from, to);
  // Jobs are dated by their last movement, which for finished work is when it
  // was marked ready.
  const jobsInWindow = withinWindow(productionJobs, (job) => job.updatedAt, window);
  const jobsBefore = withinWindow(productionJobs, (job) => job.updatedAt, previousWindow(window));

  const rows = tailors.map((person) => ({
    person,
    now: measure(jobsInWindow, person.displayName),
    before: measure(jobsBefore, person.displayName),
  })).sort((a, b) => b.now.finished - a.now.finished);

  const byDepartment = rows.reduce((groups, row) => {
    const department = row.person.tailorDepartment || 'No department';
    groups[department] = [...(groups[department] || []), row];
    return groups;
  }, {});

  const periodLabel = LOG_PERIODS.find(([key]) => key === period)?.[1] || 'Period';

  const exportReport = () => downloadCsv(
    `twif-tailor-${mode}-${csvStamp()}.csv`,
    ['Tailor', 'Department', 'Grade', 'Finished', 'Still in hand', 'Average score', 'Pieces scored', 'On time %'],
    rows.map(({ person, now }) => [
      person.displayName, person.tailorDepartment || '', person.tailorGrade || '',
      now.finished, now.inHand,
      now.average === null ? 'Not scored' : now.average.toFixed(1),
      now.scored,
      now.onTimePercent === null ? 'No dated work' : now.onTimePercent,
    ])
  );

  // One tailor's own log, reached from the list.
  if (openTailor) {
    const row = rows.find(({ person }) => person.id === openTailor.id);
    const mine = jobsInWindow.filter((job) => worksOnJob(job, openTailor.displayName));
    return (
      <div className="os-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a7a6a' }}>
          <button
            type="button"
            onClick={() => setOpenTailor(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#5a4e42', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500 }}
          >
            <ArrowLeft size={14} /> Tailor list
          </button>
          <ChevronRight size={12} />
          <span>{openTailor.displayName}</span>
        </div>

        <div className="os-page-header">
          <div className="os-page-title">
            <Scissors size={22} strokeWidth={1.6} style={{ color: '#c97b08' }} />
            <div>
              <h2>{openTailor.displayName}</h2>
              <p>{openTailor.tailorDepartment || 'No department'} · Grade {openTailor.tailorGrade || '—'}</p>
            </div>
          </div>
        </div>

        <PeriodBar {...{ period, setPeriod, from, setFrom, to, setTo }} />

        <div className="tailor-figures">
          <Figure label={`Finished this ${periodLabel.toLowerCase()}`} value={row?.now.finished ?? 0} tone="green" />
          <Figure label="Still in hand" value={row?.now.inHand ?? 0} tone="gold" />
          <Figure
            label="Average score"
            value={row?.now.average === null || row?.now.average === undefined ? '—' : `${row.now.average.toFixed(1)} / 10`}
            detail={row?.now.scored ? `${row.now.scored} piece${row.now.scored === 1 ? '' : 's'} scored` : 'Nothing scored yet'}
            tone="blue"
          />
          <Figure
            label="On time"
            value={row?.now.onTimePercent === null || row?.now.onTimePercent === undefined ? '—' : `${row.now.onTimePercent}%`}
            detail="Against the date Production set"
            tone="purple"
          />
        </div>

        <div className="os-card">
          <div className="os-card-head">
            <CheckCircle size={16} strokeWidth={1.5} style={{ color: '#2a7d4f' }} />
            <div><strong>Work in this period</strong><p>Every order {openTailor.displayName} touched</p></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tailor-log-table">
              <thead>
                <tr>{['Order', 'Customer', 'Garment', 'Status', 'Due to Production', 'Score'].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}</tr>
              </thead>
              <tbody>
                {mine.length ? mine.map((job) => {
                  const scores = scoresForTailor(job, openTailor.displayName);
                  return (
                    <tr key={job.id || job.invoiceNumber}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{job.invoiceNumber}</td>
                      <td>{job.customer}</td>
                      <td>{job.item || '—'}</td>
                      <td>{job.status}</td>
                      <td>{job.tailorDueDate ? new Date(`${job.tailorDueDate}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Not set'}</td>
                      <td>{scores.length ? `${scores.join(', ')} / 10` : '—'}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#8a7a6a' }}>Nothing in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          {mode === 'performance' ? <Award size={22} strokeWidth={1.6} style={{ color: '#c97b08' }} /> : <Users size={22} strokeWidth={1.6} style={{ color: '#c97b08' }} />}
          <div>
            <h2>{mode === 'performance' ? 'Tailor Performance' : 'Tailor List'}</h2>
            <p>{mode === 'performance'
              ? 'How each department is doing, and everyone in it'
              : 'Every tailor, and the log behind their figures'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportReport}
          disabled={!rows.length}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            background: rows.length ? '#1a1611' : '#ddd5c8', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            cursor: rows.length ? 'pointer' : 'not-allowed',
          }}
        >Export</button>
      </div>

      <PeriodBar {...{ period, setPeriod, from, setFrom, to, setTo }} />

      {!tailors.length ? (
        <div className="os-card" style={{ padding: 40, textAlign: 'center', color: '#8a7a6a' }}>
          No tailors on the staff list yet.
        </div>
      ) : mode === 'performance' ? (
        Object.entries(byDepartment).map(([department, group]) => {
          const finished = group.reduce((sum, row) => sum + row.now.finished, 0);
          const before = group.reduce((sum, row) => sum + row.before.finished, 0);
          const scored = group.flatMap(({ person }) => jobsInWindow.flatMap((job) => scoresForTailor(job, person.displayName)));
          return (
            <div className="os-card" key={department}>
              <div className="os-card-head">
                <Scissors size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
                <div>
                  <strong>{department}</strong>
                  <p>{group.length} tailor{group.length === 1 ? '' : 's'} · {finished} finished{
                    changeLabel(changeAgainst(finished, before), 'the period before')
                      ? ` · ${changeLabel(changeAgainst(finished, before), 'the period before')}`
                      : ''
                  }</p>
                </div>
                <span className="tailor-dept-score">
                  {scored.length
                    ? `★ ${(scored.reduce((sum, score) => sum + score, 0) / scored.length).toFixed(1)} / 10`
                    : 'Not scored'}
                </span>
              </div>
              <div className="os-card-body" style={{ padding: 0 }}>
                <TailorTable rows={group} onOpen={setOpenTailor} />
              </div>
            </div>
          );
        })
      ) : (
        <div className="os-card">
          <TailorTable rows={rows} onOpen={setOpenTailor} />
        </div>
      )}
    </div>
  );
}

function PeriodBar({ period, setPeriod, from, setFrom, to, setTo }) {
  return (
    <div className="tailor-period">
      <nav>
        {LOG_PERIODS.map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={period === key ? 'is-on' : ''}
            onClick={() => setPeriod(key)}
          >{label}</button>
        ))}
      </nav>
      {period === 'custom' ? (
        <div className="tailor-period-range">
          <label className="os-field">
            <span>From</span>
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="os-field">
            <span>To</span>
            <input type="date" value={to} min={from} max={todayIso()} onChange={(event) => setTo(event.target.value)} />
          </label>
          {!from ? <span className="tailor-period-hint">Pick a start date — until then this month is shown.</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function TailorTable({ rows, onOpen }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tailor-log-table">
        <thead>
          <tr>{['Tailor', 'Department', 'Grade', 'Finished', 'In hand', 'Average', 'On time', ''].map((heading) => (
            <th key={heading}>{heading}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map(({ person, now, before }) => {
            const change = changeAgainst(now.finished, before.finished);
            return (
              <tr key={person.id}>
                <td><strong>{person.displayName}</strong></td>
                <td>{person.tailorDepartment || '—'}</td>
                <td>{person.tailorGrade || '—'}</td>
                <td>
                  {now.finished}
                  {change ? <small className={change.up ? 'up' : 'down'}>{change.up ? '↑' : '↓'} {Math.abs(change.percent).toFixed(0)}%</small> : null}
                </td>
                <td>{now.inHand}</td>
                <td>{now.average === null ? <span style={{ color: '#8a7a6a' }}>Not scored</span> : `${now.average.toFixed(1)} / 10`}</td>
                <td>{now.onTimePercent === null ? <span style={{ color: '#8a7a6a' }}>—</span> : `${now.onTimePercent}%`}</td>
                <td>
                  <button type="button" className="tailor-open" onClick={() => onOpen(person)}>
                    <Clock size={12} /> Log
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
