import { useState } from 'react';
import { CheckSquare, Clock, User, Package, ArrowRight, Play, CheckCircle, ChevronDown, ChevronUp, Calendar, Ruler, Image, Scissors, Filter } from 'lucide-react';
import JobCommentThread from '../../components/oms/JobCommentThread';

export default function MyTasksPage({ compact = false, currentRole, productionJobs = [], onUpdateJob }) {
  const tailorName = currentRole?.name?.split(' (')[0] || '';
  const allAssigned = productionJobs.filter((order) => order.tailor === tailorName);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('All tasks');
  const [viewingImage, setViewingImage] = useState(null);
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

  const statusConfig = {
    in_queue:    { label: 'In Queue',    bg: '#fffbf0', color: '#7a6030', border: '#f0d88a' },
    in_progress: { label: 'In Progress', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    ready:       { label: 'Ready',       bg: '#f0faf4', color: '#2a7d4f', border: '#a7f3d0' },
  };

  const inQueue = allAssigned.filter(j => getStatus(j) === 'in_queue').length;
  const inProgress = allAssigned.filter(j => getStatus(j) === 'in_progress').length;
  const ready = allAssigned.filter(j => getStatus(j) === 'ready').length;

  const FILTER_STATUS = { 'In Queue': 'in_queue', 'In Progress': 'in_progress', Ready: 'ready' };
  const assignedJobs = filter === 'All tasks'
    ? allAssigned
    : allAssigned.filter((order) => getStatus(order) === FILTER_STATUS[filter]);

  return (
    <div className="os-page">

      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <CheckSquare size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>{compact ? 'Assigned This Week' : 'My Task Queue'}</h2>
            <p>Your assigned production jobs and their current status</p>
          </div>
        </div>
        <label className="os-field tailor-filter">
          <Filter size={13} strokeWidth={1.8} />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter tasks">
            {['All tasks', 'In Queue', 'In Progress', 'Ready'].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>

      {/* KPI Row */}
      <div className="os-kpi-row os-kpi-row-3" style={{ gap: 12 }}>
        {[
          { label: 'In Queue', value: inQueue, bg: '#fffbf0', color: '#7a6030', icon: Clock },
          { label: 'In Progress', value: inProgress, bg: '#eff6ff', color: '#1d4ed8', icon: ArrowRight },
          { label: 'Completed', value: ready, bg: '#f0faf4', color: '#2a7d4f', icon: CheckCircle },
        ].map(({ label, value, bg, color, icon: Icon }) => (
          <div key={label} style={{
            background: bg, borderRadius: 12, padding: '14px 18px',
            border: '1px solid #eee5da', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Icon size={18} strokeWidth={1.75} style={{ color }} />
            <div>
              <strong style={{ display: 'block', fontSize: 22, fontWeight: 700, color: '#1a1611', lineHeight: 1.1 }}>{value}</strong>
              <small style={{ fontSize: 12, color: '#8a7a6a' }}>{label}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {assignedJobs.length ? assignedJobs.map((order) => {
          const status = getStatus(order);
          const isExpanded = expandedId === order.id;
          const canStart = status === 'in_queue';
          const canReady = status === 'in_progress';
          const { label, bg, color, border } = statusConfig[status];
          const initials = order.customer.split(' ').map(p => p[0]).join('').slice(0, 2);
          const styleImages = Array.isArray(order.styleImages) ? order.styleImages : [];

          return (
            <div
              key={order.id}
              style={{
                background: '#fff', border: `1px solid ${isExpanded ? '#c97b08' : '#eee5da'}`,
                borderRadius: 12, overflow: 'hidden',
                boxShadow: isExpanded ? '0 0 0 3px #fdf3e0' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              {/* Card Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', cursor: 'pointer',
                borderBottom: isExpanded ? '1px solid #eee5da' : 'none',
              }}
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <span style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#e8f0fc',
                  color: '#2a65c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>{initials}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14, color: '#1a1611' }}>{order.customer}</strong>
                    <span style={{ fontSize: 12, color: '#8a7a6a' }}>·</span>
                    <span style={{ fontSize: 13, color: '#5a4e42' }}>{order.item}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Calendar size={11} style={{ color: '#8a7a6a' }} />
                    <span style={{ fontSize: 12, color: '#8a7a6a' }}>
                      Due: {order.delivery ? new Date(`${order.delivery}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: bg, color, border: `1px solid ${border}`, flexShrink: 0,
                }}>{label}</span>

                <button
                  type="button"
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #ddd5c8', borderRadius: 6, background: '#faf7f3',
                    cursor: 'pointer', color: '#5a4e42', flexShrink: 0,
                  }}
                  onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : order.id); }}
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Info Grid */}
              <div className="os-info-grid" style={{ borderBottom: '1px solid #f3ede5', background: '#faf7f3' }}>
                {[
                  { icon: Package, label: 'Product', value: order.item || 'Not specified' },
                  { icon: Scissors, label: 'Fabric', value: order.fabric || 'Not specified' },
                  { icon: Ruler, label: 'Measurements', value: order.measurements ? 'Included' : 'Not taken' },
                  { icon: Image, label: 'Ref Images', value: `${styleImages.length} ${styleImages.length === 1 ? 'Photo' : 'Photos'}` },
                  { icon: User, label: 'Pieces', value: order.pieces || 1 },
                ].map(({ icon: Icon, label, value }, i) => (
                  <div key={label} style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    borderRight: i < 4 ? '1px solid #eee5da' : 'none',
                  }}>
                    <Icon size={13} style={{ color: '#8a7a6a', flexShrink: 0 }} />
                    <div>
                      <small style={{ display: 'block', fontSize: 11, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</small>
                      <strong style={{
                        display: 'block', fontSize: 12, color: order.measurements === false && label === 'Measurements' ? '#8a3520' : '#1a1611',
                      }}>{String(value)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ padding: '16px 18px' }}>
                  {/* Orders that cover several garments list each one, so the
                      tailor sees the whole job rather than only the first item. */}
                  {order.items?.length > 1 ? (
                    <div className="job-item-list" style={{ marginBottom: 16 }}>
                      <div className="job-item-list-label">{order.items.length} items on this order</div>
                      {order.items.map((line, lineIndex) => (
                        <div key={`${line.item}-${lineIndex}`} className="job-item-row">
                          <span className="job-item-index">{lineIndex + 1}</span>
                          <div>
                            <strong>{line.item || 'Unnamed item'}</strong>
                            <small>
                              {Number(line.pieces) || 1} {(Number(line.pieces) || 1) === 1 ? 'piece' : 'pieces'}
                              {line.fabric ? ` · ${line.fabric}` : ''}
                            </small>
                            {line.measurements ? <small className="job-item-note">Measurements: {line.measurements}</small> : null}
                            {line.designNotes ? <small className="job-item-note">{line.designNotes}</small> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                    <section>
                      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#5a4e42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Details</h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: '#5a4e42' }}>
                        {order.item && <li style={{ marginBottom: 4 }}>Style: {order.item}</li>}
                        {order.designNotes && <li style={{ marginBottom: 4 }}>{order.designNotes}</li>}
                        {order.productionNote && <li style={{ marginBottom: 4 }}>{order.productionNote}</li>}
                        {order.note && <li style={{ marginBottom: 4 }}>Customer Note: {order.note}</li>}
                        {!order.item && !order.designNotes && !order.productionNote && <li style={{ color: '#b0a090' }}>No additional details</li>}
                      </ul>
                    </section>
                    <section>
                      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#5a4e42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fabric</h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: '#5a4e42' }}>
                        <li style={{ marginBottom: 4 }}>Fabric: {order.fabric || 'Not specified'}</li>
                        {order.fabricQuality && <li style={{ marginBottom: 4 }}>Quality: {order.fabricQuality}</li>}
                        {order.fabricColour && <li style={{ marginBottom: 4 }}>Colour: {order.fabricColour}</li>}
                        {order.fabricNote && <li style={{ marginBottom: 4 }}>{order.fabricNote}</li>}
                      </ul>
                    </section>
                    <section>
                      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#5a4e42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Measurements</h4>
                      {/* The figures themselves, not a note saying they exist.
                          A tailor cannot cut to "Measurements on file". */}
                      {order.measurementDetails || order.measurements ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: '#5a4e42' }}>
                          {order.measurementDetails
                            ? Object.entries(order.measurementDetails).map(([key, value]) => (
                              <li key={key} style={{ marginBottom: 4 }}><strong style={{ fontWeight: 600 }}>{key}:</strong> {value}</li>
                            ))
                            : String(order.measurements).split(/[\n,]/).map((line) => line.trim()).filter(Boolean).map((line, index) => (
                              <li key={`${line}-${index}`} style={{ marginBottom: 4 }}>{line}</li>
                            ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#b0a090' }}>No measurements attached</p>
                      )}
                    </section>
                    <section>
                      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#5a4e42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference Images ({order.images || 0})</h4>
                      {styleImages.length ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {styleImages.map((image, index) => (
                            image.dataUrl ? (
                              <button
                                key={`${image.label}-${index}`}
                                type="button"
                                className="tailor-style-image"
                                onClick={() => setViewingImage(image)}
                                title={image.label}
                              >
                                <img src={image.dataUrl} alt={image.label || `Reference ${index + 1}`} />
                                <span>{image.label || `Image ${index + 1}`}</span>
                              </button>
                            ) : (
                              // Older order sheets recorded a filename rather
                              // than an upload; naming it still helps.
                              <span key={`${image.label}-${index}`} className="tailor-style-ref">
                                <strong>{image.label || `Image ${index + 1}`}</strong>
                                <small>{image.name}</small>
                              </span>
                            )
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#b0a090' }}>No reference images uploaded</p>
                      )}
                    </section>
                  </div>

                  {/* The same thread the Production Manager reads, so a query
                      about a garment is answered against the job. */}
                  <JobCommentThread
                    invoiceNumber={order.invoiceNumber}
                    currentRole={currentRole}
                    role="tailor"
                    compact
                  />

                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex', gap: 10, padding: '12px 18px',
                borderTop: '1px solid #f3ede5', background: '#fff',
              }}>
                {/* Once work has started the button says so, rather than
                    still reading "Start Work" while greyed out. */}
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={() => canStart && setConfirm({ jobId: order.id, action: 'start', order })}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: canStart ? 'pointer' : 'default',
                    background: canStart ? '#eff6ff' : status === 'in_queue' ? '#f5f0e8' : '#eef4ff',
                    color: canStart ? '#1d4ed8' : status === 'in_queue' ? '#b0a090' : '#4a6fb5',
                    border: `1px solid ${canStart ? '#bfdbfe' : status === 'in_queue' ? '#eee5da' : '#d5e3fb'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {canStart ? <><Play size={13} /> Start Work</>
                    : status === 'in_progress' ? <><Clock size={13} /> Work in progress</>
                    : <><CheckCircle size={13} /> Work completed</>}
                </button>
                <button
                  type="button"
                  disabled={!canReady}
                  onClick={() => canReady && setConfirm({ jobId: order.id, action: 'ready', order })}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: canReady ? 'pointer' : 'not-allowed',
                    background: canReady ? '#f0faf4' : '#f5f0e8', color: canReady ? '#2a7d4f' : '#b0a090',
                    border: `1px solid ${canReady ? '#a7f3d0' : '#eee5da'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <CheckCircle size={13} />
                  {status === 'ready' ? 'Marked ready' : 'Mark Ready'}
                </button>
              </div>
            </div>
          );
        }) : (
          <div style={{
            background: '#fff', border: '1px solid #eee5da', borderRadius: 12,
            padding: '48px 24px', textAlign: 'center',
          }}>
            <CheckSquare size={36} strokeWidth={1.5} style={{ color: '#ddd5c8', marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14, color: '#8a7a6a' }}>
              Assigned jobs will appear here once Production Manager assigns a tailor.
            </p>
          </div>
        )}
      </div>

      {viewingImage?.dataUrl ? (
        <div
          className="review-evidence-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={viewingImage.label || 'Style reference'}
          onClick={() => setViewingImage(null)}
        >
          <button type="button" className="review-evidence-close" onClick={() => setViewingImage(null)} aria-label="Close">×</button>
          <img src={viewingImage.dataUrl} alt={viewingImage.label || 'Style reference'} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}

      {/* Confirm Modal */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
              background: confirm.action === 'start' ? '#eff6ff' : '#f0faf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {confirm.action === 'start'
                ? <Play size={22} style={{ color: '#1d4ed8' }} />
                : <CheckCircle size={22} style={{ color: '#2a7d4f' }} />}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: '#1a1611' }}>
              {confirm.action === 'start' ? 'Start Work?' : 'Mark as Ready?'}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5a4e42', lineHeight: 1.5 }}>
              {confirm.action === 'start'
                ? `Are you ready to start working on ${confirm.order.customer}'s ${confirm.order.item || 'order'}?`
                : `Confirm that ${confirm.order.customer}'s ${confirm.order.item || 'order'} is completed and ready for collection?`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                style={{
                  flex: 1, padding: '10px 16px', border: '1px solid #ddd5c8', borderRadius: 8,
                  background: '#fff', fontSize: 14, color: '#5a4e42', cursor: 'pointer', fontWeight: 600,
                }}
              >Cancel</button>
              <button
                type="button"
                onClick={confirmAction}
                style={{
                  flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8,
                  background: confirm.action === 'start' ? '#2563eb' : '#2a7d4f',
                  color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {confirm.action === 'start'
                  ? <><Play size={13} /> Yes, Start Work</>
                  : <><CheckCircle size={13} /> Yes, Mark Ready</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
