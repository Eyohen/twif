import { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw,
  Package, ArrowLeft, ChevronRight, Info, Filter, Boxes,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Status } from '../../components/oms/Common';

const TABS = ['All', 'Pending', 'Approved', 'Rejected'];

function ChangePill({ fieldKey, value }) {
  const label = fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      background: '#faf7f3', border: '1px solid #eee5da', borderRadius: 6,
      fontSize: 11, marginRight: 4, marginBottom: 4,
    }}>
      <span style={{ color: '#8a7a6a', fontWeight: 500 }}>{label}:</span>
      <span style={{ color: '#1a1611', fontWeight: 700 }}>{String(value)}</span>
    </span>
  );
}

export default function OwnerInventoryApprovalsPage({ currentRole, onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('All');
  const [processing, setProcessing] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/oms/inventory-edit-requests')
      .then((response) => {
        setRequests(response.data?.data?.requests || []);
        setMessage('');
      })
      .catch((error) => {
        setRequests([]);
        setMessageType('error');
        setMessage(error.response?.data?.message || 'The approval queue could not be loaded.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const review = async (request, decision) => {
    setProcessing(request.id + decision);
    setMessage('');
    try {
      await api.patch(`/oms/inventory-edit-requests/${request.id}/review`, {
        decision,
        ownerPhone: currentRole?.phone,
        ownerPin: currentRole?.pin,
      });
      setMessageType('success');
      setMessage(`Request ${decision.toLowerCase()} successfully.`);
      load();
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Unable to process request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = requests.filter((r) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return r.status === 'Pending Owner Approval';
    return r.status.toLowerCase().includes(activeTab.toLowerCase());
  });

  const pending = requests.filter((r) => r.status === 'Pending Owner Approval').length;
  const approved = requests.filter((r) => r.status === 'Approved').length;
  const rejected = requests.filter((r) => r.status === 'Rejected').length;

  return (
    <div className="os-page">

      {/* Breadcrumb */}
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a7a6a' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
              color: '#5a4e42', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} /> Inventory
          </button>
          <ChevronRight size={12} />
          <span>Approvals</span>
        </div>
      )}

      {/* Page Header */}
      <div className="os-page-header">
        <div className="os-page-title">
          <Boxes size={22} strokeWidth={1.5} style={{ color: '#c97b08' }} />
          <div>
            <h2>Inventory Approvals</h2>
            <p>Review and act on changes requested by the Inventory Manager</p>
          </div>
        </div>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            border: '1px solid #ddd5c8', borderRadius: 8, background: '#fff',
            fontSize: 13, color: '#5a4e42', cursor: 'pointer', fontWeight: 500,
          }}
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="os-kpi-row" style={{ gap: 12 }}>
        {[
          { icon: Clock, label: 'Pending Review', value: pending, bg: '#fffbf0', iconBg: '#c97b08' },
          { icon: CheckCircle, label: 'Approved', value: approved, bg: '#f0faf4', iconBg: '#2a7d4f' },
          { icon: XCircle, label: 'Rejected', value: rejected, bg: '#fff5f0', iconBg: '#8a3520' },
          { icon: Package, label: 'Total Requests', value: requests.length, bg: '#e8f0fc', iconBg: '#2a65c7' },
        ].map(({ icon: Icon, label, value, bg, iconBg }) => (
          <div key={label} style={{
            background: bg, borderRadius: 12, padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{
              width: 42, height: 42, borderRadius: 10, background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={18} strokeWidth={1.75} color="#fff" />
            </span>
            <div>
              <strong style={{ display: 'block', fontSize: 22, fontWeight: 700, color: '#1a1611', lineHeight: 1.1 }}>{value}</strong>
              <small style={{ fontSize: 12, color: '#8a7a6a' }}>{label}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Alert */}
      {message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8,
          background: messageType === 'error' ? '#fff5f0' : '#f0faf4',
          border: `1px solid ${messageType === 'error' ? '#f3c5b5' : '#a7f3d0'}`,
          fontSize: 13, color: messageType === 'error' ? '#8a3520' : '#2a7d4f',
        }}>
          {messageType === 'error' ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
          {message}
        </div>
      )}

      {/* Pending Banner */}
      {pending > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          background: '#fffbf0', border: '1px solid #f0d88a', borderRadius: 10,
        }}>
          <AlertTriangle size={16} style={{ color: '#c97b08', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: 14, color: '#7a6030' }}>
              {pending} request{pending > 1 ? 's' : ''} awaiting your approval.
            </strong>
            <small style={{ display: 'block', fontSize: 12, color: '#8a7a6a' }}>
              Review them below to keep inventory accurate.
            </small>
          </div>
        </div>
      )}

      {/* Requests Panel */}
      <div className="os-card">
        {/* Tabs */}
        <div style={{ padding: '0 18px', borderBottom: '1px solid #eee5da', display: 'flex', gap: 4 }}>
          {TABS.map((tab) => {
            const count = tab === 'All' ? requests.length
              : tab === 'Pending' ? pending
              : tab === 'Approved' ? approved
              : rejected;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px',
                  border: 'none', borderBottom: activeTab === tab ? '2px solid #c97b08' : '2px solid transparent',
                  background: 'none', cursor: 'pointer', fontSize: 13,
                  color: activeTab === tab ? '#1a1611' : '#8a7a6a',
                  fontWeight: activeTab === tab ? 700 : 400,
                  marginBottom: -1,
                }}
              >
                {tab}
                <span style={{
                  background: activeTab === tab ? '#1a1611' : '#eee5da',
                  color: activeTab === tab ? '#fff' : '#8a7a6a',
                  borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8a7a6a' }}>
            <div style={{
              width: 32, height: 32, border: '3px solid #eee5da', borderTopColor: '#c97b08',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Package size={36} strokeWidth={1.5} style={{ color: '#ddd5c8', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#1a1611' }}>No requests found</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#8a7a6a' }}>
              {activeTab !== 'All' ? 'Try changing the tab filter.' : 'No inventory edit requests have been submitted yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div style={{ overflowX: 'auto' }} className="um-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Item', 'Requested By', 'Proposed Changes', 'Reason', 'Status', 'Submitted', 'Actions'].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '11px 14px', fontSize: 11,
                        color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: '#faf7f3', borderBottom: '1px solid #eee5da',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((request) => (
                    <tr
                      key={request.id}
                      style={{
                        borderBottom: '1px solid #f3ede5',
                        background: request.status === 'Pending Owner Approval' ? '#fffdf8' : '',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#faf7f3'}
                      onMouseLeave={e => e.currentTarget.style.background = request.status === 'Pending Owner Approval' ? '#fffdf8' : ''}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: 8, background: '#fff0df',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Package size={14} style={{ color: '#c97b08' }} />
                          </span>
                          <strong style={{ fontSize: 13, color: '#1a1611' }}>{request.fabric?.name || 'Inventory Item'}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#8a7a6a' }}>{request.requestedBy}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                          {Object.entries(request.proposedChanges || {}).map(([key, value]) => (
                            <ChangePill key={key} fieldKey={key} value={value} />
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#5a4e42', maxWidth: 220 }}>{request.reason}</td>
                      <td style={{ padding: '12px 14px' }}><Status>{request.status}</Status></td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'block', fontSize: 13, color: '#5a4e42' }}>
                          {new Date(request.createdAt).toLocaleDateString('en-GB')}
                        </span>
                        <small style={{ fontSize: 11, color: '#8a7a6a' }}>
                          {new Date(request.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {request.status === 'Pending Owner Approval' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                                background: '#f0faf4', color: '#2a7d4f', border: '1px solid #a7f3d0',
                                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: !!processing ? 'not-allowed' : 'pointer',
                              }}
                              onClick={() => review(request, 'Approved')}
                              disabled={!!processing}
                            >
                              <CheckCircle size={12} />
                              {processing === request.id + 'Approved' ? 'Approving…' : 'Approve'}
                            </button>
                            <button
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                                background: '#fff5f0', color: '#8a3520', border: '1px solid #f3c5b5',
                                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: !!processing ? 'not-allowed' : 'pointer',
                              }}
                              onClick={() => review(request, 'Rejected')}
                              disabled={!!processing}
                            >
                              <XCircle size={12} />
                              {processing === request.id + 'Rejected' ? 'Rejecting…' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: '#8a7a6a',
                          }}>
                            <Info size={12} /> Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="um-cards-mobile" style={{ display: 'none' }}>
              {filtered.map((request) => (
                <div
                  key={request.id}
                  style={{
                    padding: '16px 18px', borderBottom: '1px solid #f3ede5',
                    background: request.status === 'Pending Owner Approval' ? '#fffdf8' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: 8, background: '#fff0df',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Package size={14} style={{ color: '#c97b08' }} />
                      </span>
                      <strong style={{ fontSize: 14, color: '#1a1611' }}>{request.fabric?.name || 'Inventory Item'}</strong>
                    </div>
                    <Status>{request.status}</Status>
                  </div>
                  <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap' }}>
                    {Object.entries(request.proposedChanges || {}).map(([key, value]) => (
                      <ChangePill key={key} fieldKey={key} value={value} />
                    ))}
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: '#5a4e42', lineHeight: 1.4 }}>{request.reason}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#8a7a6a' }}>
                      {new Date(request.createdAt).toLocaleDateString('en-GB')}
                    </span>
                    {request.status === 'Pending Owner Approval' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                            background: '#f0faf4', color: '#2a7d4f', border: '1px solid #a7f3d0',
                            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                          onClick={() => review(request, 'Approved')}
                          disabled={!!processing}
                        >
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                            background: '#fff5f0', color: '#8a3520', border: '1px solid #f3c5b5',
                            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                          onClick={() => review(request, 'Rejected')}
                          disabled={!!processing}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid #eee5da', fontSize: 12, color: '#8a7a6a' }}>
              Showing <strong style={{ color: '#1a1611' }}>{filtered.length}</strong> of <strong style={{ color: '#1a1611' }}>{requests.length}</strong> requests
            </div>
          </>
        )}
      </div>
    </div>
  );
}
