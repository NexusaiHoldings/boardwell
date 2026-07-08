'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import {
  getBidSubmission,
  getExtractionForBid,
  runExtraction,
  acceptField,
  correctField,
  saveManualExtraction,
  EXTRACTION_FIELD_DEFS,
  type BidSubmissionRow,
  type ExtractionRow,
  type ExtractionField,
} from '@/lib/hoa/extract';

interface PageProps {
  params: { id: string; bidId: string };
}

// --- Confidence badge ---
function confidenceConfig(c: number): { bg: string; color: string; label: string } {
  if (c >= 0.8) return { bg: '#d1fae5', color: '#065f46', label: 'High' };
  if (c >= 0.6) return { bg: '#fef3c7', color: '#92400e', label: 'Review' };
  return { bg: '#fee2e2', color: '#991b1b', label: 'Check' };
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const cfg = confidenceConfig(confidence);
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '0.18rem 0.55rem',
        borderRadius: 99,
        background: cfg.bg,
        color: cfg.color,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label} {Math.round(confidence * 100)}%
    </span>
  );
}

// Warn when a date string is within 90 days or past
function ExpiryWarning({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diffDays = Math.ceil((parsed.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) {
    return (
      <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '0.4rem', fontWeight: 600 }}>
        ⚠ Expired
      </span>
    );
  }
  if (diffDays <= 90) {
    return (
      <span style={{ fontSize: '0.75rem', color: '#d97706', marginLeft: '0.4rem', fontWeight: 600 }}>
        ⚠ Expires in {diffDays}d
      </span>
    );
  }
  return null;
}

// --- Left panel: document viewer ---
function BidDocumentViewer({ submission }: { submission: BidSubmissionRow }) {
  let refs: Array<{ name?: string; phone?: string; email?: string }> = [];
  if (submission.references_json) {
    try {
      refs = JSON.parse(submission.references_json);
    } catch {
      refs = [];
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
          Company Profile
        </h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem' }}>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Name</dt>
          <dd style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{submission.company_name}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Email</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.company_email}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Years Operating</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.years_in_business ?? '—'}</dd>
        </dl>
        {submission.company_description && (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#374151', lineHeight: 1.55 }}>
            {submission.company_description}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
          License &amp; Credentials
        </h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem' }}>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>License #</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.cam_license_number ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>State</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.cam_license_state ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Expiry</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>
            {submission.cam_license_expiry ?? '—'}
            <ExpiryWarning dateStr={submission.cam_license_expiry} />
          </dd>
        </dl>
        {submission.cam_license_url && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem' }}>
            <a href={submission.cam_license_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
              View license document ↗
            </a>
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
          Insurance
        </h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem' }}>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>GL Amount</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.general_liability_amount ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>GL Expiry</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>
            {submission.general_liability_expiry ?? '—'}
            <ExpiryWarning dateStr={submission.general_liability_expiry} />
          </dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>E&amp;O Amount</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.errors_omissions_amount ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>E&amp;O Expiry</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>
            {submission.errors_omissions_expiry ?? '—'}
            <ExpiryWarning dateStr={submission.errors_omissions_expiry} />
          </dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Fidelity Bond</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.fidelity_bond_amount ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Carrier</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.insurance_carrier ?? '—'}</dd>
        </dl>
        {submission.insurance_cert_url && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem' }}>
            <a href={submission.insurance_cert_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
              View COI ↗
            </a>
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
          Financial Profile
        </h3>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem' }}>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Annual Revenue</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.annual_revenue ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Portfolio Units</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.portfolio_unit_count ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Base Fee</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.management_fee_base ?? '—'}</dd>
          <dt className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Additional Fees</dt>
          <dd style={{ margin: 0, fontSize: '0.85rem' }}>{submission.management_fee_additional ?? '—'}</dd>
        </dl>
        {submission.financial_statement_url && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem' }}>
            <a href={submission.financial_statement_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
              View financial statement ↗
            </a>
          </p>
        )}
      </div>

      {refs.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            References ({refs.length})
          </h3>
          {refs.map((ref, idx) => (
            <div key={idx} style={{ marginBottom: idx < refs.length - 1 ? '0.6rem' : 0, paddingBottom: idx < refs.length - 1 ? '0.6rem' : 0, borderBottom: idx < refs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ref.name ?? 'Reference'}</div>
              {ref.email && <div className="muted" style={{ fontSize: '0.8rem' }}>{ref.email}</div>}
              {ref.phone && <div className="muted" style={{ fontSize: '0.8rem' }}>{ref.phone}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Field card (right panel) ---
function FieldCard({
  field,
  extractionId,
  onUpdate,
}: {
  field: ExtractionField;
  extractionId: string;
  onUpdate: (updated: ExtractionField) => void;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [correctionValue, setCorrectionValue] = useState(field.extracted_value ?? '');
  const [saving, setSaving] = useState(false);
  const fieldDef = EXTRACTION_FIELD_DEFS.find((d) => d.key === field.field_key);
  const isExpiry = fieldDef?.isExpiry ?? false;
  const cfg = confidenceConfig(field.confidence);
  const isLow = field.confidence < 0.8;

  async function handleAccept() {
    setSaving(true);
    await acceptField(extractionId, field.field_key);
    onUpdate({ ...field, human_reviewed: true, accepted_value: field.extracted_value });
    setSaving(false);
  }

  async function handleSaveCorrection() {
    if (!correctionValue.trim()) return;
    setSaving(true);
    await correctField(extractionId, field.field_key, correctionValue.trim());
    onUpdate({ ...field, human_reviewed: true, accepted_value: correctionValue.trim() });
    setCorrecting(false);
    setSaving(false);
  }

  return (
    <div
      className="field-card card"
      style={{
        marginBottom: '0.75rem',
        borderLeft: `3px solid ${isLow && !field.human_reviewed ? cfg.color : field.human_reviewed ? '#34d399' : '#e2e8f0'}`,
        transition: 'border-color 0.25s, box-shadow 0.2s',
        boxShadow: isLow && !field.human_reviewed ? '0 2px 12px rgba(220,38,38,0.07)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>
          {field.field_label}
        </span>
        {field.human_reviewed ? (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 99, background: '#d1fae5', color: '#065f46' }}>
            ✓ Confirmed
          </span>
        ) : (
          <ConfidenceBadge confidence={field.confidence} />
        )}
      </div>

      {field.human_reviewed ? (
        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
          {field.accepted_value ?? <span className="muted">—</span>}
          {isExpiry && <ExpiryWarning dateStr={field.accepted_value} />}
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.5rem' }}>
            {field.extracted_value ? (
              <>
                {field.extracted_value}
                {isExpiry && <ExpiryWarning dateStr={field.extracted_value} />}
              </>
            ) : (
              <span className="muted">Not found in document</span>
            )}
          </div>

          {!correcting && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleAccept}
                disabled={saving}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.25rem 0.7rem',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  borderRadius: 6,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {saving ? '…' : '✓ Accept'}
              </button>
              <button
                onClick={() => { setCorrectionValue(field.extracted_value ?? ''); setCorrecting(true); }}
                disabled={saving}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.25rem 0.7rem',
                  background: '#f8fafc',
                  color: '#374151',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                ✎ Correct
              </button>
            </div>
          )}

          {correcting && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={correctionValue}
                onChange={(e) => setCorrectionValue(e.target.value)}
                style={{ flex: 1, minWidth: 120, fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCorrection(); if (e.key === 'Escape') setCorrecting(false); }}
              />
              <button
                onClick={handleSaveCorrection}
                disabled={saving || !correctionValue.trim()}
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer' }}
              >
                {saving ? '…' : 'Save'}
              </button>
              <button
                onClick={() => setCorrecting(false)}
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.55rem', background: '#f8fafc', color: '#6b7280', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Progress bar ---
function ExtractionProgress({ fields }: { fields: ExtractionField[] }) {
  const reviewed = fields.filter((f) => f.human_reviewed).length;
  const total = fields.length;
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Review Progress</span>
        <span className="muted" style={{ fontSize: '0.82rem' }}>{reviewed} / {total} fields confirmed</span>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34d399' : '#60a5fa', borderRadius: 99, transition: 'width 0.35s' }} />
      </div>
    </div>
  );
}

// --- Manual entry form ---
function ManualEntryForm({
  bidId,
  rfpId,
  onComplete,
}: {
  bidId: string;
  rfpId: string;
  onComplete: (extractionId: string) => void;
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveManualExtraction(bidId, rfpId, formValues);
    if (result.success && result.extractionId) {
      onComplete(result.extractionId);
    } else {
      setError(result.error ?? 'Failed to save manual entry');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {EXTRACTION_FIELD_DEFS.map((def) => (
          <div key={def.key}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.25rem', color: '#374151' }}>
              {def.label}
            </label>
            <input
              type="text"
              value={formValues[def.key] ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, [def.key]: e.target.value }))}
              placeholder={def.isExpiry ? 'MM/DD/YYYY' : undefined}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.85rem' }}
            />
          </div>
        ))}
      </div>
      {error && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '0.75rem' }}>
          <p style={{ margin: 0, color: '#991b1b', fontSize: '0.85rem' }}>⚠ {error}</p>
        </div>
      )}
      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save Manual Entry'}
      </button>
    </form>
  );
}

// --- Main page ---
export default function ExtractionPage({ params }: PageProps) {
  const { id: rfpId, bidId } = params;

  const [submission, setSubmission] = useState<BidSubmissionRow | null>(null);
  const [extraction, setExtraction] = useState<ExtractionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [extracting, startExtraction] = useTransition();
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [sub, ext] = await Promise.all([
        getBidSubmission(bidId, rfpId),
        getExtractionForBid(bidId),
      ]);
      if (!sub) {
        setLoadError('Bid submission not found.');
        return;
      }
      setSubmission(sub);
      setExtraction(ext);
    } catch {
      setLoadError('Failed to load bid data.');
    }
  }, [bidId, rfpId]);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  function handleRunExtraction() {
    setExtractError(null);
    startExtraction(async () => {
      const result = await runExtraction(bidId, rfpId);
      if (!result.success) {
        setExtractError(result.error ?? 'Extraction failed');
      }
      await reload();
    });
  }

  function handleFieldUpdate(updated: ExtractionField) {
    if (!extraction) return;
    setExtraction((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((f) => (f.field_key === updated.field_key ? updated : f)),
      };
    });
  }

  function handleManualComplete() {
    reload();
    setShowManual(false);
  }

  if (loading) {
    return (
      <main>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="muted">Loading bid data…</p>
        </div>
      </main>
    );
  }

  if (loadError || !submission) {
    return (
      <main>
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ margin: 0, color: '#991b1b' }}>⚠ {loadError ?? 'Bid not found.'}</p>
          <a href={`/rfps/${rfpId}/invitations`} className="btn secondary" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
            ← Back to Invitations
          </a>
        </div>
      </main>
    );
  }

  const allReviewed = extraction?.fields.length
    ? extraction.fields.every((f) => f.human_reviewed)
    : false;

  return (
    <main>
      <style>{`
        .field-card:hover { box-shadow: 0 3px 14px rgba(0,0,0,0.08) !important; }
        @media (max-width: 768px) {
          .extraction-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <a href={`/rfps/${rfpId}/invitations`} style={{ fontSize: '0.82rem', color: '#64748b', textDecoration: 'none' }}>
          ← {submission.rfp_title}
        </a>
        <h1 style={{ margin: '0.3rem 0 0' }}>Bid Document Extraction</h1>
        <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>
          AI-extracted rubric fields from {submission.company_name}&apos;s submission — review and confirm each field.
        </p>
      </div>

      {/* No extraction yet */}
      {!extraction && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Ready to Extract</h2>
          <p className="muted" style={{ maxWidth: '420px', margin: '0 auto 1.25rem', lineHeight: 1.55 }}>
            Run the AI extraction engine to automatically parse and validate all rubric fields from this bid submission, with per-field confidence scores.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleRunExtraction} disabled={extracting} style={{ minWidth: 160 }}>
              {extracting ? 'Extracting…' : 'Run Extraction'}
            </button>
            <button
              onClick={() => setShowManual(true)}
              style={{ background: '#f8fafc', color: '#374151', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer' }}
            >
              Enter Manually
            </button>
          </div>
          {extractError && (
            <p style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.85rem' }}>⚠ {extractError}</p>
          )}
        </div>
      )}

      {/* Extraction failed state */}
      {extraction?.status === 'failed' && !showManual && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: '0 0 0.3rem', fontWeight: 700, color: '#991b1b' }}>Extraction Failed</p>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                {extraction.error_message ?? 'The AI extraction pipeline encountered an error processing this document.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
              <button onClick={handleRunExtraction} disabled={extracting}>
                {extracting ? 'Retrying…' : 'Try Again'}
              </button>
              <button
                onClick={() => setShowManual(true)}
                style={{ background: '#fff', color: '#374151', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Enter Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual entry form */}
      {showManual && !extraction?.status.match(/^complete/) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Manual Field Entry</h2>
            <button
              onClick={() => setShowManual(false)}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </div>
          <ManualEntryForm bidId={bidId} rfpId={rfpId} onComplete={handleManualComplete} />
        </div>
      )}

      {/* All-confirmed banner */}
      {allReviewed && extraction?.status === 'complete' && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p style={{ margin: 0, color: '#065f46', fontWeight: 500 }}>
            ✓ All fields reviewed — this bid is ready for scoring.
          </p>
        </div>
      )}

      {/* Side-by-side extraction review */}
      {extraction?.status === 'complete' && extraction.fields.length > 0 && (
        <div
          className="extraction-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}
        >
          {/* Left: document viewer */}
          <div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#374151', letterSpacing: '0.01em' }}>
              Submitted Document
            </h2>
            <BidDocumentViewer submission={submission} />
          </div>

          {/* Right: extracted fields */}
          <div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#374151', letterSpacing: '0.01em' }}>
              Extracted Fields
            </h2>
            <ExtractionProgress fields={extraction.fields} />
            {extraction.fields.map((field) => (
              <FieldCard
                key={field.field_key}
                field={field}
                extractionId={extraction.id}
                onUpdate={handleFieldUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
