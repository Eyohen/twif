import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Status } from '../../components/oms/Common';

export default function OwnerInventoryApprovalsPage({ currentRole, onBack }) {
  const [requests, setRequests] = useState([]); const [message, setMessage] = useState('');
  const load = () => api.get('/oms/inventory-edit-requests').then((response) => setRequests(response.data?.data?.requests || [])).catch(() => setRequests([]));
  useEffect(load, []);
  const review = async (request, decision) => { try { await api.patch(`/oms/inventory-edit-requests/${request.id}/review`, { decision, ownerPhone: currentRole?.phone, ownerPin: currentRole?.pin }); setMessage(`Request ${decision.toLowerCase()}.`); load(); } catch (error) { setMessage(error.response?.data?.message || 'Unable to review request.'); } };
  return <div className="owner-inventory-approvals"><header>{onBack ? <button type="button" onClick={onBack}>← Back to Inventory</button> : null}<p>Owner &nbsp;›&nbsp; Inventory</p><h2>Inventory Edit Approvals</h2><span>Review changes requested by the Inventory Manager.</span></header>{message && <div className="invoice-message">{message}</div>}<section><table><thead><tr><th>Item</th><th>Requested By</th><th>Proposed Changes</th><th>Reason</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{requests.map((request)=><tr key={request.id}><td><strong>{request.fabric?.name || 'Inventory Item'}</strong></td><td>{request.requestedBy}</td><td>{Object.entries(request.proposedChanges || {}).map(([key,value])=><span key={key}><b>{key.replaceAll(/([A-Z])/g,' $1')}:</b> {String(value)}</span>)}</td><td>{request.reason}</td><td><Status>{request.status}</Status></td><td>{new Date(request.createdAt).toLocaleString('en-GB')}</td><td>{request.status === 'Pending Owner Approval' ? <div><button onClick={()=>review(request,'Approved')}>Approve</button><button onClick={()=>review(request,'Rejected')}>Reject</button></div> : 'Reviewed'}</td></tr>)}</tbody></table>{!requests.length && <div className="accounts-empty">No inventory edit requests yet.</div>}</section></div>;
}
