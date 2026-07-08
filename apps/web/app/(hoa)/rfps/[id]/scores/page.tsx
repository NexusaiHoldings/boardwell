'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import {
  getScoringDashboardData,
  updateRubricWeights,
  saveScoreOverride,
  removeScoreOverride,
  type ScoringRubric,
  type BidScoringData,
  type ScoreOverrideRow,
  type ScoringWeights,
} from '@/lib/hoa/scoring';

// ── Types ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string };
}

type Dimension = 'price' | 'cam_license' | 'portfolio_size' | 'insurance' | 'references';

interface DimensionScore {
  raw: number;
  weighted: number;
  is_override: boolean;
  override_note: string | null;
  verified: boolean;
}

interface BidScoreResult {
  bid: BidScoringData;
  scores: Record<Dimension, DimensionScore>;
  composite: number;
}

// ── Pure scoring utilities ─────────────────────────────────────────────────

function parseDollarAmount(s: string | null | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getField(bid: BidScoringData, key: string): string | null {
  const f = bid.fields[key];
  if (f?.accepted_value) return f.accepted_value;
  if (f?.value) return f.value;
  return null;
}

function isFieldVerified(bid: BidScoringData, key: string): boolean {
  return bid.fields[key]?.human_reviewed === true;
}

function scoreCamLicense(bid: BidScoringData): { score: number; verified: boolean } {
  let score = 0;
  const licNum = getField(bid, 'cam_license_number') ?? bid.cam_license_number;
  if (licNum) score += 40;

  const expiry = parseDate(getField(bid, 'cam_license_expiry') ?? bid.cam_license_expiry);
  if (expiry && expiry > new Date()) score += 40;

  const state = getField(bid, 'cam_license_state') ?? bid.cam_license_state;
  if (state) score += 20;

  const verified =
    isFieldVerified(bid, 'cam_license_number') ||
    isFieldVerified(bid, 'cam_license_expiry');

  return { score: Math.min(score, 100), verified };
}

function scorePortfolioSize(bid: BidScoringData): { score: number; verified: boolean } {
  const raw = getField(bid, 'portfolio_unit_count');
  const countStr = raw ?? (bid.portfolio_unit_count != null ? String(bid.portfolio_unit_count) : null);
  const count = countStr ? parseInt(countStr, 10) : 0;

  let score = 0;
  if (count >= 5000) score = 100;
  else if (count >= 2500) score = 90;
  else if (count >= 1000) score = 75;
  else if (count >= 500) score = 60;
  else if (count >= 100) score = 40;
  else if (count > 0) score = 20;

  return { score, verified: isFieldVerified(bid, 'portfolio_unit_count') };
}

function scoreInsurance(bid: BidScoringData): { score: number; verified: boolean } {
  let score = 0;
  const now = new Date();

  const glAmt = parseDollarAmount(getField(bid, 'general_liability_amount') ?? bid.general_liability_amount);
  if (glAmt >= 1_000_000) score += 35;
  else if (glAmt >= 500_000) score += 20;

  const glExp = parseDate(getField(bid, 'general_liability_expiry') ?? bid.general_liability_expiry);
  if (glExp && glExp > now) score += 20;

  const eoAmt = parseDollarAmount(getField(bid, 'errors_omissions_amount') ?? bid.errors_omissions_amount);
  if (eoAmt >= 500_000) score += 25;
  else if (eoAmt >= 250_000) score += 15;

  const fbAmt = parseDollarAmount(getField(bid, 'fidelity_bond_amount') ?? bid.fidelity_bond_amount);
  if (fbAmt > 0) score += 20;

  const verified =
    isFieldVerified(bid, 'general_liability_amount') ||
    isFieldVerified(bid, 'general_liability_expiry');

  return { score: Math.min(score, 100), verified };
}

function scoreReferences(bid: BidScoringData): { score: number; verified: boolean } {
  let refs: unknown[] = [];
  if (bid.references_json) {
    try { refs = JSON.parse(bid.references_json); } catch { refs = []; }
  }
  const count = Array.isArray(refs) ? refs.length : 0;
  let score = 0;
  if (count >= 5) score = 100;
  else if (count >= 3) score = 80;
  else if (count >= 2) score = 60;
  else if (count >= 1) score = 35;

  return { score, verified: false };
}

function computeBidScores(
  bids: BidScoringData[],
  weights: ScoringWeights,
  overrides: ScoreOverrideRow[],
): BidScoreResult[] {
  // Price scoring: relative within set (lowest fee = 100, highest = 0)
  const fees = bids.map((b) => {
    const feeStr = getField(b, 'management_fee_base') ?? b.management_fee_base;
    return parseDollarAmount(feeStr);
  });
  const validFees = fees.filter((f) => f > 0);
  const minFee = validFees.length ? Math.min(...validFees) : 0;
  const maxFee = validFees.length ? Math.max(...validFees) : 0;

  return bids.map((bid, idx) => {
    const overrideMap: Partial<Record<Dimension, ScoreOverrideRow>> = {};
    for (const ov of overrides) {
      if (ov.bid_submission_id === bid.submission_id) {
        overrideMap[ov.dimension as Dimension] = ov;
      }
    }

    const getDimScore = (
      dim: Dimension,
      rawScore: number,
      verified: boolean,
    ): DimensionScore => {
      const ov = overrideMap[dim];
      const finalRaw = ov ? ov.override_score : rawScore;
      const weight = weights[dim];
      return {
        raw: Math.round(finalRaw),
        weighted: Math.round(finalRaw * weight),
        is_override: !!ov,
        override_note: ov?.override_note ?? null,
        verified,
      };
    };

    let priceRaw = 0;
    const fee = fees[idx];
    if (fee > 0 && maxFee > minFee) {
      priceRaw = Math.round(100 - ((fee - minFee) / (maxFee - minFee)) * 100);
    } else if (fee > 0 && minFee === maxFee) {
      priceRaw = 75;
    }
    const priceVerified = isFieldVerified(bid, 'management_fee_base');

    const cam = scoreCamLicense(bid);
    const port = scorePortfolioSize(bid);
    const ins = scoreInsurance(bid);
    const refs = scoreReferences(bid);

    const scores: Record<Dimension, DimensionScore> = {
      price: getDimScore('price', priceRaw, priceVerified),
      cam_license: getDimScore('cam_license', cam.score, cam.verified),
      portfolio_size: getDimScore('portfolio_size', port.score, port.verified),
      insurance: getDimScore('insurance', ins.score, ins.verified),
      references: getDimScore('references', refs.score, refs.verified),
    };

    const composite =
      scores.price.raw * weights.price +
      scores.cam_license.raw * weights.cam_license +
      scores.portfolio_size.raw * weights.portfolio_size +
      scores.insurance.raw * weights.insurance +
      scores.references.raw * weights.references;

    return { bid, scores, composite: Math.round(composite) };
  });
}

// ── Small UI components ────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        fontSize: '0.68rem',
        fontWeight: 700,
        padding: '0.15rem 0.45rem',
        borderRadius: 99,
        background: '#d1fae5',
        color: '#065f46',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      ✓ Verified
    </span>
  );
}

function ScoreBar({ value, dim }: { value: number; dim: Dimension }) {
  const palette: Record<Dimension, string> = {
    price: '#2563eb',
    cam_license: '#7c3aed',
    portfolio_size: '#0891b2',
    insurance: '#059669',
    references: '#d97706',
  };
  return (
    <div
      style={{
        width: '100%',
        height: 6,
        background: '#e5e7eb',
        borderRadius: 99,
        overflow: 'hidden',
        marginTop: '0.25rem',
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          background: palette[dim],
          borderRadius: 99,
          transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}

const DIM_LABELS: Record<Dimension, string> = {
  price: 'Management Fee',
  cam_license: 'CAM License',
  portfolio_size: 'Portfolio Size',
  insurance: 'Insurance',
  references: 'References',
};

const DIMENSIONS: Dimension[] = [
  'price',
  'cam_license',
  'portfolio_size',
  'insurance',
  'references',
];

// ── Override modal ──────────────────────────────────────────────────────────

interface OverrideModalProps {
  rfpId: string;
  bid: BidScoringData;
  dimension: Dimension;
  currentScore: number;
  currentNote: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function OverrideModal({
  rfpId, bid, dimension, currentScore, currentNote, onClose, onSaved,
}: OverrideModalProps) {
  const [score, setScore] = useState(currentScore);
  const [note, setNote] = useState(currentNote ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await saveScoreOverride(rfpId, bid.submission_id, dimension, score, note);
    if (result.success) {
      onSaved();
      onClose();
    } else {
      setError(result.error ?? 'Failed to save override');
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    const result = await removeScoreOverride(rfpId, bid.submission_id, dimension);
    if (result.success) {
      onSaved();
      onClose();
    } else {
      setError(result.error ?? 'Failed to remove override');
    }
    setSaving(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Score override"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '1.75rem',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
          Override: {DIM_LABELS[dimension]}
        </h2>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
          {bid.company_name}
        </p>

        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
          Score (0–100): <span style={{ color: '#2563eb', fontWeight: 700 }}>{score}</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          style={{ width: '100%', marginBottom: '1rem', accentColor: '#2563eb' }}
        />

        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Reason for override..."
          style={{
            width: '100%',
            padding: '0.6rem 0.75rem',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: '0.9rem',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          {currentNote !== null && (
            <button
              onClick={handleRemove}
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid #fca5a5',
                background: '#fff',
                color: '#dc2626',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ScoresDashboardPage({ params }: PageProps) {
  const rfpId = params.id;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rubric, setRubric] = useState<ScoringRubric | null>(null);
  const [bids, setBids] = useState<BidScoringData[]>([]);
  const [overrides, setOverrides] = useState<ScoreOverrideRow[]>([]);

  // Weights live state (0-100 scale for sliders, normalised to 0-1 for math)
  const [sliderWeights, setSliderWeights] = useState<Record<Dimension, number>>({
    price: 25,
    cam_license: 20,
    portfolio_size: 20,
    insurance: 20,
    references: 15,
  });

  const [saveWeightsPending, startSaveWeights] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [overrideModal, setOverrideModal] = useState<{
    bid: BidScoringData;
    dimension: Dimension;
    currentScore: number;
    currentNote: string | null;
  } | null>(null);

  // Org id from header (read server-side; here we use a query param fallback)
  const orgIdRef = useRef<string>('default-org');

  const reload = useCallback(async (oId: string) => {
    setLoadError(null);
    const result = await getScoringDashboardData(rfpId, oId);
    if (!result.success || !result.data) {
      setLoadError(result.error ?? 'Failed to load scoring data');
      return;
    }
    const { rubric: r, bids: b, overrides: ov } = result.data;
    setRubric(r);
    setBids(b);
    setOverrides(ov);
    setSliderWeights({
      price: Math.round(r.weight_price * 100),
      cam_license: Math.round(r.weight_cam_license * 100),
      portfolio_size: Math.round(r.weight_portfolio_size * 100),
      insurance: Math.round(r.weight_insurance * 100),
      references: Math.round(r.weight_references * 100),
    });
  }, [rfpId]);

  useEffect(() => {
    setLoading(true);
    // Derive org from document meta injected by substrate middleware
    const orgId =
      (typeof document !== 'undefined'
        ? document.cookie.match(/x-org-id=([^;]+)/)?.[1]
        : null) ?? 'default-org';
    orgIdRef.current = orgId;
    reload(orgId).finally(() => setLoading(false));
  }, [reload]);

  // Normalise slider weights to 0-1
  const normWeights: ScoringWeights = (() => {
    const total = DIMENSIONS.reduce((s, d) => s + sliderWeights[d], 0) || 1;
    const norm: Partial<ScoringWeights> = {};
    for (const d of DIMENSIONS) norm[d] = sliderWeights[d] / total;
    return norm as ScoringWeights;
  })();

  const results = computeBidScores(bids, normWeights, overrides);
  // Sort by composite descending for ranking
  const ranked = [...results].sort((a, b) => b.composite - a.composite);

  const handleSaveWeights = () => {
    setSaveError(null);
    setSaveSuccess(false);
    startSaveWeights(async () => {
      const result = await updateRubricWeights(rfpId, normWeights);
      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error ?? 'Failed to save weights');
      }
    });
  };

  const hasConfirmedExtractions = bids.some(
    (b) => b.extraction_status === 'complete' &&
      Object.values(b.fields).some((f) => f.human_reviewed),
  );

  if (loading) {
    return (
      <main>
        <h1>Scoring Dashboard</h1>
        <p style={{ color: '#6b7280' }}>Loading bid scores…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main>
        <h1>Scoring Dashboard</h1>
        <div role="alert" style={{ color: '#dc2626', background: '#fef2f2', padding: '1rem', borderRadius: 8 }}>
          {loadError}
        </div>
      </main>
    );
  }

  if (bids.length === 0) {
    return (
      <main>
        <h1>Scoring Dashboard</h1>
        <p>Compare and rank vendor bids using weighted criteria set by the board.</p>
        <div className="empty">
          <p style={{ fontWeight: 600 }}>No bids submitted yet</p>
          <p className="muted">Invite management companies to submit proposals, then return here to score them.</p>
          <a href={`/rfps/${rfpId}/invitations`} className="btn">
            Manage Invitations
          </a>
        </div>
      </main>
    );
  }

  if (!hasConfirmedExtractions && bids.length > 0) {
    return (
      <main>
        <h1>Scoring Dashboard</h1>
        <p>Compare and rank vendor bids using weighted criteria set by the board.</p>
        <div className="empty">
          <p style={{ fontWeight: 600 }}>Extractions not yet confirmed</p>
          <p className="muted">
            Review and confirm the extracted fields from each bid before scoring. The engine uses confirmed
            data to populate rubric dimensions automatically.
          </p>
          {bids.map((b) => (
            <a
              key={b.submission_id}
              href={`/rfps/${rfpId}/bids/${b.submission_id}/extraction`}
              className="btn secondary"
              style={{ marginTop: '0.5rem', display: 'inline-block', marginRight: '0.5rem' }}
            >
              Review: {b.company_name}
            </a>
          ))}
        </div>
      </main>
    );
  }

  const totalWeight = DIMENSIONS.reduce((s, d) => s + sliderWeights[d], 0);

  return (
    <main>
      <style>{`
        @media (max-width: 900px) {
          .scores-layout { flex-direction: column !important; }
          .scores-table-wrap { overflow-x: auto; }
        }
        .dim-cell:hover .override-btn { opacity: 1 !important; }
      `}</style>

      <h1>Scoring Dashboard</h1>
      <p>
        Weighted comparison of {bids.length} bid{bids.length !== 1 ? 's' : ''}.
        Adjust weights and the ranking updates live. No recommendation is made — the board decides.
      </p>

      <div
        className="scores-layout"
        style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}
      >
        {/* ── Weight panel ─────────────────────────────────── */}
        <aside
          className="card"
          style={{ minWidth: 240, maxWidth: 280, flexShrink: 0 }}
        >
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
            Rubric Weights
          </h2>
          <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
            Drag sliders to reweight criteria. Scores update instantly. Save to persist.
          </p>

          {DIMENSIONS.map((dim) => (
            <div key={dim} style={{ marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{DIM_LABELS[dim]}</span>
                <span style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 700 }}>
                  {totalWeight > 0 ? Math.round((sliderWeights[dim] / totalWeight) * 100) : 0}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={sliderWeights[dim]}
                onChange={(e) => {
                  setSliderWeights((prev) => ({ ...prev, [dim]: Number(e.target.value) }));
                  setSaveSuccess(false);
                }}
                style={{ width: '100%', accentColor: '#2563eb' }}
                aria-label={`${DIM_LABELS[dim]} weight`}
              />
            </div>
          ))}

          {saveError && (
            <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{saveError}</p>
          )}
          {saveSuccess && (
            <p style={{ color: '#065f46', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Weights saved!</p>
          )}

          <button
            onClick={handleSaveWeights}
            disabled={saveWeightsPending}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 700,
              cursor: saveWeightsPending ? 'not-allowed' : 'pointer',
              opacity: saveWeightsPending ? 0.7 : 1,
              fontSize: '0.9rem',
            }}
          >
            {saveWeightsPending ? 'Saving…' : 'Save Weights'}
          </button>

          {rubric && (
            <p className="muted" style={{ fontSize: '0.72rem', marginTop: '0.75rem' }}>
              Last updated: {rubric.updated_at
                ? new Date(rubric.updated_at).toLocaleDateString()
                : new Date(rubric.created_at).toLocaleDateString()}
            </p>
          )}
        </aside>

        {/* ── Comparison matrix ────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="scores-table-wrap">
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: 160 }} />
                {ranked.map((r) => (
                  <col key={r.bid.submission_id} style={{ minWidth: 150 }} />
                ))}
              </colgroup>

              {/* Sticky column headers */}
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      background: '#f9fafb',
                      borderBottom: '2px solid #e5e7eb',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Criterion
                  </th>
                  {ranked.map((r, rankIdx) => (
                    <th
                      key={r.bid.submission_id}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        textAlign: 'center',
                        borderLeft: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>
                        {rankIdx === 0 && (
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#fef3c7',
                              color: '#92400e',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: 99,
                              marginBottom: '0.2rem',
                            }}
                          >
                            #1 Ranked
                          </span>
                        )}
                        {rankIdx > 0 && (
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#f3f4f6',
                              color: '#6b7280',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.4rem',
                              borderRadius: 99,
                              marginBottom: '0.2rem',
                            }}
                          >
                            #{rankIdx + 1}
                          </span>
                        )}
                        <div>{r.bid.company_name}</div>
                      </div>
                      <div className="muted" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                        Submitted {new Date(r.bid.submitted_at).toLocaleDateString()}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Composite score row — focal element */}
                <tr style={{ background: '#eff6ff' }}>
                  <td
                    style={{
                      padding: '1rem 1rem',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: '#1e3a8a',
                      borderBottom: '2px solid #bfdbfe',
                    }}
                  >
                    Composite Score
                  </td>
                  {ranked.map((r) => (
                    <td
                      key={r.bid.submission_id}
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        borderLeft: '1px solid #bfdbfe',
                        borderBottom: '2px solid #bfdbfe',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '2rem',
                          fontWeight: 800,
                          color: '#1e3a8a',
                          lineHeight: 1,
                        }}
                      >
                        {r.composite}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: '0.2rem' }}>
                        out of 100
                      </div>
                      <ScoreBar value={r.composite} dim="price" />
                    </td>
                  ))}
                </tr>
              </thead>

              {/* Dimension rows */}
              <tbody>
                {DIMENSIONS.map((dim, dimIdx) => {
                  const weight = totalWeight > 0 ? Math.round((sliderWeights[dim] / totalWeight) * 100) : 0;
                  return (
                    <tr
                      key={dim}
                      style={{ background: dimIdx % 2 === 0 ? '#fff' : '#f9fafb' }}
                    >
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          borderBottom: '1px solid #e5e7eb',
                          verticalAlign: 'top',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#374151' }}>
                          {DIM_LABELS[dim]}
                        </div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>
                          Weight: {weight}%
                        </div>
                      </td>

                      {ranked.map((r) => {
                        const dimScore = r.scores[dim];
                        const ovEntry = overrides.find(
                          (o) => o.bid_submission_id === r.bid.submission_id && o.dimension === dim,
                        );
                        return (
                          <td
                            key={r.bid.submission_id}
                            className="dim-cell"
                            style={{
                              padding: '0.85rem 1rem',
                              borderLeft: '1px solid #e5e7eb',
                              borderBottom: '1px solid #e5e7eb',
                              verticalAlign: 'top',
                              textAlign: 'center',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '1.4rem',
                                fontWeight: 700,
                                color: dimScore.raw >= 70
                                  ? '#065f46'
                                  : dimScore.raw >= 40
                                  ? '#92400e'
                                  : '#991b1b',
                              }}
                            >
                              {dimScore.raw}
                            </div>
                            <ScoreBar value={dimScore.raw} dim={dim} />
                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: '#6b7280',
                                marginTop: '0.3rem',
                              }}
                            >
                              Weighted: {dimScore.weighted}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.25rem',
                                justifyContent: 'center',
                                marginTop: '0.35rem',
                              }}
                            >
                              {dimScore.verified && <VerifiedBadge />}
                              {dimScore.is_override && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    padding: '0.12rem 0.4rem',
                                    borderRadius: 99,
                                    background: '#fef3c7',
                                    color: '#92400e',
                                  }}
                                >
                                  Override
                                </span>
                              )}
                            </div>

                            {dimScore.override_note && (
                              <div
                                title={dimScore.override_note}
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#9ca3af',
                                  marginTop: '0.2rem',
                                  maxWidth: 120,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  margin: '0.2rem auto 0',
                                }}
                              >
                                {dimScore.override_note}
                              </div>
                            )}

                            <button
                              className="override-btn"
                              onClick={() =>
                                setOverrideModal({
                                  bid: r.bid,
                                  dimension: dim,
                                  currentScore: dimScore.raw,
                                  currentNote: ovEntry?.override_note ?? null,
                                })
                              }
                              style={{
                                position: 'absolute',
                                top: '0.4rem',
                                right: '0.4rem',
                                padding: '0.15rem 0.45rem',
                                fontSize: '0.65rem',
                                border: '1px solid #d1d5db',
                                borderRadius: 6,
                                background: '#fff',
                                cursor: 'pointer',
                                opacity: 0,
                                transition: 'opacity 0.15s',
                                fontWeight: 600,
                                color: '#374151',
                              }}
                              aria-label={`Override score for ${r.bid.company_name} ${DIM_LABELS[dim]}`}
                            >
                              Edit
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p
            className="muted"
            style={{ fontSize: '0.78rem', marginTop: '1rem', textAlign: 'right' }}
          >
            Hover a score cell to override it manually. All overrides are audit-logged.
          </p>
        </div>
      </div>

      {overrideModal && (
        <OverrideModal
          rfpId={rfpId}
          bid={overrideModal.bid}
          dimension={overrideModal.dimension}
          currentScore={overrideModal.currentScore}
          currentNote={overrideModal.currentNote}
          onClose={() => setOverrideModal(null)}
          onSaved={() => reload(orgIdRef.current)}
        />
      )}
    </main>
  );
}
