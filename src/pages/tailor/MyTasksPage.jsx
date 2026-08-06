import { useState } from 'react';
import { classNames } from '../../utils/oms';

export default function MyTasksPage({ compact = false, currentRole, productionJobs = [], onUpdateJob }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const assignedJobs = productionJobs.filter((order) => order.tailor === tailorName);
  const [expandedId, setExpandedId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const getStatus = (order) => {
    if (order.status === 'Ready') return 'ready';
    if (order.status === 'In Progress') return 'in_progress';
    return 'in_queue';
  };

  const confirmAction = () => {
    if (!confirm) return;
    onUpdateJob?.(confirm.jobId, { status: confirm.action === 'start' ? 'In Progress' : 'Ready' });
    setConfirm(null);
  };

  return (
    <div className="tailor-task-page">
      <header>
        <h2>{compact ? 'Assigned This Week' : 'My Task Queue'} <span>{assignedJobs.length}</span></h2>
        <button type="button">▽ &nbsp; Filter &nbsp;⌄</button>
      </header>

      <div className="tailor-task-list">
        {assignedJobs.length ? assignedJobs.map((order) => {
          const status = getStatus(order);
          const isExpanded = expandedId === order.id;
          const canStart = status === 'in_queue';
          const canReady = status === 'in_progress';

          return (
            <article className={classNames('tailor-task-card', isExpanded && 'expanded', `task-${status}`)} key={order.id}>
              <div className="tailor-task-header">
                <div className="tailor-task-customer">
                  <i className="task-avatar">{order.customer.split(' ').map(p => p[0]).join('').slice(0, 2)}</i>
                  <div className="task-customer-info">
                    <strong>{order.customer}</strong>
                    <span>{order.item}</span>
                    <small>▣ &nbsp; Due: {order.delivery ? new Date(`${order.delivery}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</small>
                  </div>
                </div>
                <div className="task-header-right">
                  <span className={`task-status-badge task-badge-${status}`}>
                    {status === 'in_progress' ? 'In Progress' : status === 'ready' ? 'Ready' : 'In Queue'}
                  </span>
                  <button type="button" className="tailor-expand" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    {isExpanded ? '⌃' : '⌄'}
                  </button>
                </div>
              </div>

              <div className="tailor-info-grid">
                <div className="tailor-info-cell">
                  <i>▤</i>
                  <span><small>Product Details</small><strong>{order.item || 'Not specified'}</strong></span>
                </div>
                <div className="tailor-info-cell">
                  <i>▧</i>
                  <span><small>Fabric</small><strong>{order.fabric || 'Not specified'}</strong></span>
                </div>
                <div className="tailor-info-cell">
                  <i>⌁</i>
                  <span><small>Measurements</small><strong className={order.measurements ? 'measure-saved' : ''}>{order.measurements ? '✓ Included' : 'Not included'}</strong></span>
                </div>
                <div className="tailor-info-cell">
                  <i>▣</i>
                  <span><small>Reference Images</small><strong>{order.images || 0} Photos</strong></span>
                </div>
                <div className="tailor-info-cell">
                  <i>✂</i>
                  <span><small>Pieces</small><strong>{order.pieces || 1}</strong></span>
                </div>
              </div>

              {isExpanded && (
                <div className="tailor-task-details">
                  <div className="tailor-detail-grid">
                    <section className="tailor-detail-section">
                      <h4>Product Details</h4>
                      <ul>
                        {order.item && <li>Style: {order.item}</li>}
                        {order.designNotes && <li>{order.designNotes}</li>}
                        {order.productionNote && <li>{order.productionNote}</li>}
                        {order.note && <li>Customer Note: {order.note}</li>}
                        {!order.item && !order.designNotes && !order.productionNote && <li>No additional details</li>}
                      </ul>
                    </section>
                    <section className="tailor-detail-section">
                      <h4>Fabric</h4>
                      <ul>
                        <li>Fabric: {order.fabric || 'Not specified'}</li>
                        {order.fabricQuality && <li>Quality: {order.fabricQuality}</li>}
                        {order.fabricColour && <li>Colour: {order.fabricColour}</li>}
                        {order.fabricNote && <li>{order.fabricNote}</li>}
                      </ul>
                    </section>
                    <section className="tailor-detail-section">
                      <h4>Measurements</h4>
                      {order.measurementDetails ? (
                        <>
                          <ul>{Object.entries(order.measurementDetails).slice(0, 6).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
                          <button type="button" className="tailor-link-btn">View all measurements</button>
                        </>
                      ) : <p className="tailor-empty-note">{order.measurements ? 'Measurements on file' : 'No measurements attached'}</p>}
                    </section>
                    <section className="tailor-detail-section">
                      <h4>Reference Images ({order.images || 0})</h4>
                      {order.imageUrls?.length ? (
                        <>
                          <div className="tailor-images-grid">{order.imageUrls.slice(0, 4).map((url, i) => <img key={i} src={url} alt={`Ref ${i + 1}`} />)}</div>
                          {order.images > 4 && <button type="button" className="tailor-link-btn">View all images</button>}
                        </>
                      ) : <p className="tailor-empty-note">No reference images uploaded</p>}
                    </section>
                  </div>
                  <button type="button" className="tailor-add-note-btn">◯ &nbsp; Add Note</button>
                </div>
              )}

              <div className="tailor-task-actions">
                <button
                  type="button"
                  className={classNames('tailor-start-btn', !canStart && 'btn-disabled')}
                  disabled={!canStart}
                  onClick={() => canStart && setConfirm({ jobId: order.id, action: 'start', order })}
                >
                  ▷ &nbsp; Start Work
                </button>
                <button
                  type="button"
                  className={classNames('tailor-ready-btn', !canReady && 'btn-disabled')}
                  disabled={!canReady}
                  onClick={() => canReady && setConfirm({ jobId: order.id, action: 'ready', order })}
                >
                  ◉ &nbsp; Mark Ready
                </button>
              </div>
            </article>
          );
        }) : (
          <div className="invoice-preview-empty">Assigned jobs will appear here once Production Manager assigns a tailor.</div>
        )}
      </div>

      <section className="tailor-help">
        <i>☼</i>
        <div><strong>Need help?</strong><span>Contact your Production Manager if you have any questions.</span></div>
        <button type="button">◯ &nbsp; Send Message</button>
      </section>

      {confirm && (
        <div className="task-confirm-backdrop">
          <div className="task-confirm-modal">
            <h3>{confirm.action === 'start' ? 'Start Work?' : 'Mark as Ready?'}</h3>
            <p>
              {confirm.action === 'start'
                ? `Are you ready to start working on ${confirm.order.customer}'s ${confirm.order.item || 'order'}?`
                : `Confirm that ${confirm.order.customer}'s ${confirm.order.item || 'order'} is completed and ready for collection?`}
            </p>
            <div className="task-confirm-actions">
              <button type="button" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className={confirm.action === 'start' ? 'primary-action' : 'mark-ready-confirm'} onClick={confirmAction}>
                {confirm.action === 'start' ? '▷ Yes, Start Work' : '◉ Yes, Mark Ready'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
