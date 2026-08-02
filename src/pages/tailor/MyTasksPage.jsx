import { useState } from 'react';
import { Status } from '../../components/oms/Common';
import { classNames, money } from '../../utils/oms';

export default function MyTasksPage({ compact = false, currentRole, productionJobs = [], onUpdateJob }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const assignedJobs = productionJobs.filter((order) => order.tailor === tailorName);
  const [expandedId, setExpandedId] = useState(assignedJobs[0]?.id || null);

  return (
    <div className="tailor-task-page">
      <header><h2>{compact ? 'Assigned This Week' : 'My Task Queue'} <span>{assignedJobs.length}</span></h2><button>▽ &nbsp; Filter &nbsp;⌄</button></header>
      <div className="tailor-task-list">
        {assignedJobs.length ? assignedJobs.map((order) => (
          <article className={classNames('tailor-task-card', expandedId === order.id && 'expanded')} key={order.id}>
            <div className="tailor-task-summary">
              <div className="tailor-task-customer"><i>{order.customer.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i><span><strong>{order.customer}</strong><b>{order.item}</b><small>▣ &nbsp; Due: {order.delivery ? new Date(`${order.delivery}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</small></span></div>
              <div className="tailor-task-invoice"><small>Invoice Details</small><strong>{order.invoiceNumber}</strong><span>Date: {order.assignedAt && order.assignedAt !== 'Pending assignment' ? new Date(order.assignedAt).toLocaleDateString('en-GB') : 'Recently'}</span></div>
              <div className="tailor-task-amount"><small>Amount</small><strong>{money.format(order.amount || 0)}</strong><Status>{order.payment || 'Paid'}</Status></div>
              <div className="tailor-task-status"><small>Status</small><Status>{order.status === 'Ready' ? 'Ready' : order.status === 'Order Sheet Confirmed' || order.status === 'Assigned' ? 'Not Started' : 'In Progress'}</Status></div>
              <button className="tailor-expand" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>{expandedId === order.id ? '⌃' : '⌄'}</button>
            </div>
            {expandedId === order.id ? <>
              <section className="tailor-production-note"><i>▤</i><div><strong>Production Instruction</strong><p>{order.productionNote || order.designNotes || order.note || 'Follow the approved style and measurements.'}</p></div><span>From Production<br /><b>{order.updatedAt ? new Date(order.updatedAt).toLocaleString('en-GB') : 'Recently'}</b></span></section>
              <section className="tailor-materials">{[['▧', 'Fabric', order.fabric || 'Not selected'], ['✂', 'Pieces', order.pieces || 1], ['⌁', 'Measurements', order.measurements ? '◉ Included' : 'Not included'], ['▧', 'Reference Images', `${order.images || 0} Photos`]].map(([icon, label, value]) => <div key={label}><i>{icon}</i><span><small>{label}</small><strong>{value}</strong></span></div>)}</section>
              <div className="tailor-task-actions"><button onClick={() => onUpdateJob?.(order.id, { status: 'In Progress' })}>▷ &nbsp; {order.status === 'In Progress' ? 'Continue Work' : 'Start Work'}</button><button className="mark-ready" onClick={() => onUpdateJob?.(order.id, { status: 'Ready' })}>◉ &nbsp; Mark Ready</button></div>
            </> : <section className="tailor-collapsed-materials"><div>▧ <span><small>Fabric</small><strong>{order.fabric || 'Not selected'}</strong></span></div><div>✂ <span><small>Pieces</small><strong>{order.pieces || 1}</strong></span></div><div>⌁ <span><small>Measurements</small><strong>{order.measurements ? '◉ Included' : 'Not included'}</strong></span></div><div>▧ <span><small>Reference Images</small><strong>{order.images || 0} Photos</strong></span></div><button onClick={() => onUpdateJob?.(order.id, { status: 'In Progress' })}>▷ &nbsp; Start Work</button></section>}
            <footer><button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>▣ &nbsp; View Details &nbsp;⌄</button></footer>
          </article>
        )) : <div className="invoice-preview-empty">Assigned jobs will appear here once Production Manager assigns a tailor.</div>}
      </div>
      <section className="tailor-help"><i>☼</i><div><strong>Need help?</strong><span>Contact your Production Manager if you have any questions.</span></div><button>◯ &nbsp; Send Message</button></section>
    </div>
  );
}
