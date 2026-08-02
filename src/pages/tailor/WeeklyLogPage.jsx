import { Status } from '../../components/oms/Common';

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

  return (
    <div className="tailor-weekly-log">
      <section className="weekly-summary">
        <header><h2>This Week Summary</h2><button>▣ &nbsp; {dateLabel} &nbsp;⌄</button></header>
        <div>
          {[
            ['✓', 'Completed Jobs', completedJobs.length, 'green'],
            ['◷', 'In Progress', activeJobs.length, 'gold'],
            ['▣', 'Avg. Completion Time', `${averageDays.toFixed(1)} days`, 'blue'],
            ['↗', 'On-Time Delivery', `${completedJobs.length ? 100 : 0}%`, 'purple'],
          ].map(([icon, label, value, tone]) => <article className={tone} key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong></span></article>)}
        </div>
      </section>

      <section className="weekly-completed">
        <h2>Jobs Completed This Week</h2>
        {completedJobs.length ? <div className="weekly-table-wrap"><table><thead><tr><th>Job</th><th>Customer</th><th>Invoice No.</th><th>Item</th><th>Completed On</th><th>Status</th></tr></thead><tbody>
          {completedJobs.map((order) => <tr key={order.id}>
            <td><i>{order.customer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i></td>
            <td><strong>{order.customer}</strong></td><td>{order.invoiceNumber}</td><td>{order.item}</td>
            <td>{new Date(order.updatedAt || now).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><Status>Completed</Status></td>
          </tr>)}
        </tbody></table></div> : <div className="invoice-preview-empty">Completed jobs will appear here after you mark assigned work ready.</div>}
        <button className="view-completed">View all completed jobs &nbsp;⌄</button>
      </section>

      <section className="weekly-performance">
        <h2>Weekly Performance</h2>
        <div>{[5, 7, completedJobs.length, null, null].map((jobs, index) => {
          const start = new Date(monday);
          start.setDate(monday.getDate() + ((index - 2) * 7));
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          return <article className={index === 1 ? 'best' : ''} key={index}><header><span>Week {index + 1}<small>{start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></span><i>{jobs == null ? '▣' : '⌁'}</i></header><strong>{jobs == null ? '–' : jobs}</strong><small>jobs</small></article>;
        })}</div>
      </section>

      <section className="tailor-help"><i>☼</i><div><strong>Need help?</strong><span>Contact your Production Manager if you have any questions.</span></div><button>◯ &nbsp; Send Message</button></section>
    </div>
  );
}
