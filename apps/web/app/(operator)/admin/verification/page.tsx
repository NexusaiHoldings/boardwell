'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface QueueItem {
  submission_id: string;
  rfp_id: string;
  org_id: string;
  company_name: string;
  company_email: string;
  rfp_title: string;
  submitted_at: string;
  cam_license_number: string | null;
  cam_license_state: string | null;
  cam_license_expiry: string | null;
  cam_license_url: string | null;
  general_liability_expiry: string | null;
  errors_omissions_expiry: string | null;
  insurance_cert_url: string | null;
  extraction_status: string | null;
  low_confidence_fields: number;
  priority: 'critical' | 'high' | 'normal';
  severity_reason: string;
  already_reviewed: boolean;
  review_action: string | null;
}

const PILL: Record<string, React.CSSProperties> = {
  critical: { background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' },
  high: { background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' },
  normal: { background: '#dbeafe', color: '#1e40af', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' },
  approve: { background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' },
  reject: { background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' },
};

function fmt(ts: string | null | undefined): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return String(ts); }
}

interface CardProps {
  item: QueueItem;
  busy: boolean;
  flash: 'approve' | 'reject' | null;
  onAction: (item: QueueItem, action: 'approve' | 'reject', notes: string) => void;
}

function ReviewedCard({ item }: { item: QueueItem }) {
  return (
    <div
      className="card"
      style={{ marginBottom: '0.5rem', opacity: 0.65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.company_name}
        </span>
        <span className="muted" style={{ fontSize: '0.8rem', flexShrink: 0 }}>{item.rfp_title}</span>
      </div>
      <span style={(PILL[item.review_action ?? ''] ?? PILL.normal) as React.CSSProperties}>
        {item.review_action ?? 'reviewed'}
      </span>
    </div>
  );
}

function QueueCard({ item, busy, flash, onAction }: CardProps) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (busy) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return;
    if (e.key === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onAction(item, 'approve', notes);
    } else if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onAction(item, 'reject', notes);
    }
  }, [busy, item, notes, onAction]);

  const flashBg = flash === 'approve' ? '#f0fdf4' : flash === 'reject' ? '#fef2f2' : undefined;

  return (
    <div
      ref={cardRef}
      className="card"
      tabIndex={0}
      role="article"
      aria-label={`Verification request for ${item.company_name}`}
      onKeyDown={handleKeyDown}
      style={{ marginBottom: '1rem', transition: 'background 0.35s ease', background: flashBg, outline: 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.company_name}</span>
            <span style={PILL[item.priority] as React.CSSProperties}>{item.priority}</span>
          </div>
          <div className="muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>{item.rfp_title}</div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{item.company_email}</div>
        </div>
        <div className="muted" style={{ fontSize: '0.8rem', flexShrink: 0, textAlign: 'right' }}>
          Submitted {fmt(item.submitted_at)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
        {item.cam_license_number ? (
          <span>
            <span className="muted">CAM: </span>
            {item.cam_license_number}
            {item.cam_license_state ? ` (${item.cam_license_state})` : ''}
            {item.cam_license_expiry ? <span className="muted"> · exp {item.cam_license_expiry}</span> : ''}
          </span>
        ) : (
          <span style={{ color: '#b45309' }}>No CAM license on file</span>
        )}
        {item.general_liability_expiry && (
          <span><span className="muted">GL exp: </span>{item.general_liability_expiry}</span>
        )}
        {item.errors_omissions_expiry && (
          <span><span className="muted">E&amp;O exp: </span>{item.errors_omissions_expiry}</span>
        )}
        {item.low_confidence_fields > 0 && (
          <span style={{ color: '#92400e' }}>
            {item.low_confidence_fields} low-confidence field{item.low_confidence_fields !== 1 ? 's' : ''}
          </span>
        )}
        {item.extraction_status && item.extraction_status !== 'complete' && (
          <span style={{ color: '#6b7280' }}>
            Extraction: {item.extraction_status}
          </span>
        )}
      </div>

      {item.severity_reason !== 'Standard credential verification' && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '0.4rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#78350f' }}>
          ⚠ {item.severity_reason}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {item.insurance_cert_url && (
          <a href={item.insurance_cert_url} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
            Insurance Cert ↗
          </a>
        )}
        {item.cam_license_url && (
          <a href={item.cam_license_url} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
            CAM License ↗
          </a>
        )}
        <button
          onClick={() => setShowNotes((v) => !v)}
          style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
        >
          {showNotes ? 'Hide notes' : 'Add notes'}
        </button>
      </div>

      {showNotes && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this review…"
          rows={2}
          style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
        />
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          disabled={busy}
          onClick={() => onAction(item, 'approve', notes)}
          aria-label="Approve verification (press A when card is focused)"
          style={{ padding: '0.45rem 1.2rem', borderRadius: 8, border: 'none', background: busy ? '#bbf7d0' : '#16a34a', color: '#fff', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'background 0.2s, transform 0.1s', transform: busy ? 'scale(0.97)' : 'scale(1)' }}
        >
          {busy ? '…' : '✓ Approve'}
        </button>
        <button
          disabled={busy}
          onClick={() => onAction(item, 'reject', notes)}
          aria-label="Reject verification (press R when card is focused)"
          style={{ padding: '0.45rem 1.2rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#b91c1c', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'background 0.2s' }}
        >
          {busy ? '…' : '✗ Reject'}
        </button>
        <span className="muted" style={{ fontSize: '0.72rem' }}>Focus card and press A / R</span>
      </div>
    </div>
  );
}

function CelebratoryEmptyState() {
  return (
    <div className="empty" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: '1rem' }}>🎉</div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
        Queue is clear!
      </h2>
      <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
        Every submission has been reviewed. Verified badges are current and COI coverage is up to date. Check back after new bids are submitted.
      </p>
    </div>
  );
}

export default function VerificationPage(): JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, 'approve' | 'reject'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/verification', { cache: 'no-store' });
      if (res.status === 403) {
        router.replace('/login');
        return;
      }
      const data = await res.json();
      setItems(data.queue ?? []);
      if (data.error) setError(data.error);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleAction = useCallback(async (
    item: QueueItem,
    action: 'approve' | 'reject',
    notes: string,
  ) => {
    setBusy(item.submission_id);
    try {
      const res = await fetch('/admin/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: item.submission_id,
          rfp_id: item.rfp_id,
          action,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFlash((prev) => ({ ...prev, [item.submission_id]: action }));
        setTimeout(() => {
          setFlash((prev) => {
            const next = { ...prev };
            delete next[item.submission_id];
            return next;
          });
          load();
        }, 900);
      } else {
        setError(data.error ?? 'Review submission failed');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }, [load]);

  const pending = items.filter((i) => !i.already_reviewed);
  const reviewed = items.filter((i) => i.already_reviewed);

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Verification Queue</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>
            Review credential and insurance data before issuing verified status badges to boards.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          {!loading && (
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {pending.length} pending · {reviewed.length} reviewed
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh queue"
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: loading ? 'not-allowed' : 'pointer', color: '#374151' }}
          >
            {loading ? '…' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty">
          <p className="muted">Loading verification queue…</p>
        </div>
      ) : pending.length === 0 ? (
        <CelebratoryEmptyState />
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          {pending.map((item) => (
            <QueueCard
              key={item.submission_id}
              item={item}
              busy={busy === item.submission_id}
              flash={flash[item.submission_id] ?? null}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Reviewed ({reviewed.length})
          </h2>
          {reviewed.map((item) => (
            <ReviewedCard key={item.submission_id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
