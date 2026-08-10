import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoment } from '../../utils/oms';

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Administrator',
  store_manager: 'Store Manager',
  accounts: 'Accounts',
  production_manager: 'Production Manager',
  inventory_manager: 'Inventory Manager',
  tailor: 'Tailor',
};

// The comment thread that hangs off a job sheet. Everyone working the job reads
// and writes the same thread, so a question about a garment stays with the
// garment rather than in somebody's phone.
export default function JobCommentThread({ invoiceNumber, currentRole, role, compact = false }) {
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const authorName = currentRole?.name?.split(' (')[0] || ROLE_LABELS[role] || 'Staff';

  const load = useCallback(async () => {
    if (!invoiceNumber) { setLoading(false); return; }
    try {
      const response = await api.get(`/oms/jobs/${encodeURIComponent(invoiceNumber)}/comments`);
      setComments(response.data?.data?.comments || []);
      setError('');
    } catch {
      setError('The thread could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [invoiceNumber]);

  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await api.post(`/oms/jobs/${encodeURIComponent(invoiceNumber)}/comments`, {
        body,
        authorName,
        authorRole: role,
      });
      const saved = response.data?.data?.comment;
      if (saved) setComments((current) => [...current, saved]);
      setDraft('');
      window.requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'nearest' }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'That comment could not be posted.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={`job-comments${compact ? ' job-comments-compact' : ''}`}>
      <header>
        <MessageSquare size={15} />
        <div>
          <strong>Comments</strong>
          <p>{comments.length ? `${comments.length} on this job` : 'Notes between everyone working this job'}</p>
        </div>
      </header>

      <div className="job-comments-list">
        {loading ? (
          <p className="job-comments-empty">Loading…</p>
        ) : comments.length ? (
          comments.map((comment) => (
            <article key={comment.id} className={comment.authorRole === role ? 'is-mine' : ''}>
              <header>
                <strong>{comment.authorName}</strong>
                <small>{ROLE_LABELS[comment.authorRole] || comment.authorRole}</small>
                <time>{formatMoment(comment.createdAt)}</time>
              </header>
              <p>{comment.body}</p>
            </article>
          ))
        ) : (
          <p className="job-comments-empty">No comments yet. Anything noted here is seen by everyone on this job.</p>
        )}
        <span ref={endRef} />
      </div>

      {error ? <p className="job-comments-error">{error}</p> : null}

      <form onSubmit={submit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a note for the others working this job…"
          rows={compact ? 2 : 3}
          maxLength={2000}
          onKeyDown={(event) => {
            // Enter sends; the textarea is for the occasional longer note.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit(event);
            }
          }}
        />
        <button type="submit" disabled={!draft.trim() || sending}>
          <Send size={14} />
          {sending ? 'Posting…' : 'Post comment'}
        </button>
      </form>
    </section>
  );
}
