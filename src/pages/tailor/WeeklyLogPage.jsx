import { CheckCircle, Clock, BarChart2, TrendingUp, Calendar, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, MessageSquare, Award } from 'lucide-react';
import { Status } from '../../components/oms/Common';

const SUMMARY_ITEMS = [
  { key: 'completed', icon: CheckCircle,  label: 'Jobs Completed',           tone: 'green'  },
  { key: 'progress',  icon: Clock,        label: 'In Progress',              tone: 'gold'   },
  { key: 'avg',       icon: BarChart2,    label: 'Avg. Completion Time',     tone: 'blue'   },
  { key: 'ontime',    icon: TrendingUp,   label: 'On-Time Delivery',         tone: 'purple' },
];

const toneStyle = {
  green:  { bg: '#f0faf4', iconBg: '#2a7d4f', text: '#2a7d4f' },
  gold:   { bg: '#fffbf0', iconBg: '#c97b08', text: '#7a6030' },
  blue:   { bg: '#eff6ff', iconBg: '#2563eb', text: '#1d4ed8' },
  purple: { bg: '#faf5ff', iconBg: '#7c3aed', text: '#6d28d9' },
};

export default function WeeklyLogPage({ currentRole, productionJobs = [] }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const assignedJobs = productionJobs.filter((order) => order.tailor === tailorName);
  const completedJobs = assignedJobs.filter((order) => order.status === 'Ready');
  const activeJobs = assignedJobs.filter((order) => order.status !== 'Ready');

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const dateLabel = `${monday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const averageDays = completedJobs.length
    ? completedJobs.reduce((sum, job) => {
        const start = new Date(job.assignedAt || job.updatedAt || now);
        const end = new Date(job.updatedAt || now);
        return sum + Math.max(1, Math.round((end - start) / 86400000));
      }, 0) / completedJobs.length
    : 0;

  const summaryValues = {
    completed: completedJobs.length,
    progress:  activeJobs.length,
    avg:       `${averageDays.toFixed(1)} days`,
    ontime:    `${completedJobs.length ? 100 : 0}%`,
  };

  return (
    <div className="os-page">

      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Calendar size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>Weekly Log</h2>
            <p>Track your completed work this week</p>
          </div>
        </div>
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
            fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
          }}
        >
          <ChevronLeft size={14} />
          <span>{dateLabel}</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* KPI Summary Row */}
      <div className="os-kpi-row" style={{ gap: 12 }}>
        {SUMMARY_ITEMS.map(({ key, icon: Icon, label, tone }) => {
          const s = toneStyle[tone];
          return (
            <div
              key={key}
              style={{
                background: s.bg, border: `1px solid ${s.bg}`, borderRadius: 12,
                padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <span style={{
                width: 42, height: 42, borderRadius: 10, background: s.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} strokeWidth={1.75} color="#fff" />
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: 22, fontWeight: 700, color: '#1a1611', lineHeight: 1.1 }}>
                  {summaryValues[key]}
                </strong>
                <small style={{ fontSize: 12, color: '#8a7a6a' }}>{label}</small>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed Jobs Table */}
      <div className="os-card">
        <div className="os-card-head">
          <CheckCircle size={16} strokeWidth={1.5} style={{ color: '#2a7d4f' }} />
          <div>
            <strong>Jobs Completed This Week</strong>
            <p>All garments marked ready during this period</p>
          </div>
          <span style={{
            marginLeft: 'auto', background: '#1a1611', color: '#fff',
            borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700,
          }}>
            {completedJobs.length}
          </span>
        </div>

        {completedJobs.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Customer', 'Invoice No.', 'Item', 'Completed On', 'Status'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '11px 14px', fontSize: 11,
                      color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: '#faf7f3', borderBottom: '1px solid #eee5da',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedJobs.map((order) => {
                  const initials = order.customer.split(' ').map(p => p[0]).join('').slice(0, 2);
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f3ede5' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: '50%', background: '#e8f0fc',
                            color: '#2a65c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>{initials}</span>
                          <strong style={{ fontSize: 13, color: '#1a1611' }}>{order.customer}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#8a7a6a', fontFamily: 'monospace' }}>
                        {order.invoiceNumber || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#5a4e42' }}>{order.item}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a' }}>
                        {new Date(order.updatedAt || now).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}><Status>Completed</Status></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            padding: '48px 24px', textAlign: 'center', color: '#8a7a6a', fontSize: 14,
          }}>
            <CheckCircle size={32} strokeWidth={1.5} style={{ color: '#ddd5c8', marginBottom: 12 }} />
            <p style={{ margin: 0 }}>Completed jobs will appear here after you mark assigned work ready.</p>
          </div>
        )}
      </div>

      {/* Weekly Performance History */}
      <div className="os-card">
        <div className="os-card-head">
          <BarChart2 size={16} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <strong>Weekly Performance</strong>
            <p>Your output trend over the past weeks</p>
          </div>
          <Award size={16} strokeWidth={1.5} className="os-card-icon" />
        </div>
        <div className="os-card-body">
          <div className="os-kpi-row os-kpi-row-5" style={{ gap: 10 }}>
            {[5, 7, completedJobs.length, null, null].map((jobs, index) => {
              const start = new Date(monday);
              start.setDate(monday.getDate() + ((index - 2) * 7));
              const end = new Date(start);
              end.setDate(start.getDate() + 6);
              const isCurrentWeek = index === 2;
              const isBest = index === 1;
              return (
                <div
                  key={index}
                  style={{
                    borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                    border: `1px solid ${isCurrentWeek ? '#c97b08' : '#eee5da'}`,
                    background: isCurrentWeek ? '#fffbf0' : isBest ? '#f0faf4' : '#faf7f3',
                    position: 'relative',
                  }}
                >
                  {isBest && (
                    <span style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      background: '#2a7d4f', color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                    }}>Best</span>
                  )}
                  <small style={{ display: 'block', fontSize: 10, color: '#8a7a6a', marginBottom: 4 }}>
                    {isCurrentWeek ? 'This Week' : `Week ${index + 1}`}
                  </small>
                  <small style={{ display: 'block', fontSize: 10, color: '#b0a090', marginBottom: 8 }}>
                    {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </small>
                  {jobs == null ? (
                    <span style={{ fontSize: 22, color: '#ddd5c8', fontWeight: 700 }}>—</span>
                  ) : (
                    <>
                      <strong style={{ display: 'block', fontSize: 28, color: '#1a1611', lineHeight: 1 }}>{jobs}</strong>
                      <small style={{ fontSize: 11, color: '#8a7a6a' }}>jobs</small>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Help Banner */}
      <div style={{
        background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 12,
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <HelpCircle size={20} strokeWidth={1.5} style={{ color: '#c97b08', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 14, color: '#1a1611' }}>Need help?</strong>
          <span style={{ fontSize: 13, color: '#8a7a6a', marginLeft: 8 }}>
            Contact your Production Manager if you have any questions.
          </span>
        </div>
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <MessageSquare size={13} />
          Send Message
        </button>
      </div>

    </div>
  );
}
