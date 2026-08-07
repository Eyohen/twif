import { useState } from 'react';
import { CheckSquare, Clock, User, Package, ArrowRight, Play, CheckCircle, ChevronDown, ChevronUp, Calendar, Ruler, Image, Scissors, MessageSquare, HelpCircle, Filter } from 'lucide-react';
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

  const statusConfig = {
    in_queue:    { label: 'In Queue',    bg: '#fffbf0', color: '#7a6030', border: '#f0d88a' },
    in_progress: { label: 'In Progress', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    ready:       { label: 'Ready',       bg: '#f0faf4', color: '#2a7d4f', border: '#a7f3d0' },
  };

  const inQueue = assignedJobs.filter(j => getStatus(j) === 'in_queue').length;
  const inProgress = assignedJobs.filter(j => getStatus(j) === 'in_progress').length;
  const ready = assignedJobs.filter(j => getStatus(j) === 'ready').length;

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
        <button type="button" style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
          fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
        }}>
          <Filter size={13} />
          Filter
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0,
                borderBottom: '1px solid #f3ede5', background: '#faf7f3',
              }}>
                {[
                  { icon: Package, label: 'Product', value: order.item || 'Not specified' },
                  { icon: Scissors, label: 'Fabric', value: order.fabric || 'Not specified' },
                  { icon: Ruler, label: 'Measurements', value: order.measurements ? 'Included' : 'Not included' },
                  { icon: Image, label: 'Ref Images', value: `${order.images || 0} Photos` },
                  { icon: User, label: 'Pieces', value: order.pieces || 1 },
                ].map(({ icon: Icon, label, value }, i) => (
                  <div key={label} style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    borderRight: i < 4 ? '1px solid #eee5da' : 'none',
                  }}>
                    <Icon size={13} style={{ color: '#8a7a6a', flexShrink: 0 }} />
                    <div>
                      <small style={{ display: 'block', fontSize: 10, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</small>
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
                      {order.measurementDetails ? (
                        <>
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: '#5a4e42' }}>
                            {Object.entries(order.measurementDetails).slice(0, 6).map(([k, v]) => (
                              <li key={k} style={{ marginBottom: 4 }}>{k}: {v}</li>
                            ))}
                          </ul>
                          <button type="button" style={{
                            marginTop: 6, fontSize: 12, color: '#c97b08', background: 'none',
                            border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline',
                          }}>View all measurements</button>
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#b0a090' }}>
                          {order.measurements ? 'Measurements on file' : 'No measurements attached'}
                        </p>
                      )}
                    </section>
                    <section>
                      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#5a4e42', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference Images ({order.images || 0})</h4>
                      {order.imageUrls?.length ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {order.imageUrls.slice(0, 4).map((url, i) => (
                              <img key={i} src={url} alt={`Ref ${i + 1}`} style={{ width: '100%', borderRadius: 6, aspectRatio: '1', objectFit: 'cover' }} />
                            ))}
                          </div>
                          {order.images > 4 && (
                            <button type="button" style={{
                              marginTop: 6, fontSize: 12, color: '#c97b08', background: 'none',
                              border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline',
                            }}>View all images</button>
                          )}
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#b0a090' }}>No reference images uploaded</p>
                      )}
                    </section>
                  </div>

                  <button type="button" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                    border: '1px solid #ddd5c8', borderRadius: 8, background: '#faf7f3',
                    fontSize: 12, color: '#5a4e42', cursor: 'pointer',
                  }}>
                    <MessageSquare size={13} />
                    Add Note
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex', gap: 10, padding: '12px 18px',
                borderTop: '1px solid #f3ede5', background: '#fff',
              }}>
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={() => canStart && setConfirm({ jobId: order.id, action: 'start', order })}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: canStart ? 'pointer' : 'not-allowed',
                    background: canStart ? '#eff6ff' : '#f5f0e8', color: canStart ? '#1d4ed8' : '#b0a090',
                    border: `1px solid ${canStart ? '#bfdbfe' : '#eee5da'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <Play size={13} />
                  Start Work
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
                  Mark Ready
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
        <button type="button" style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: '#1a1611', color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
        }}>
          <MessageSquare size={13} />
          Send Message
        </button>
      </div>

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
