'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  generateDecisionReport,
  getDecisionReports,
  emailReportToBoard,
  type DecisionReport,
  type BidSnapshot,
  type Dimension,
} from '@/lib/hoa/report';

// ── Constants ───────────────────────────────────────────────────────────────

const PROGRESS_MESSAGES = [
  'Fetching scoring data…',
  'Computing weighted scores…',
  'Applying manual overrides…',
  'Verifying credential badges…',
  'Assembling immutable snapshot…',
  'Saving report record…',
];

const DIM_LABELS: Record<Dimension, string> = {
  price: 'Management Fee',
  cam_license: 'CAM License',
  portfolio_size: 'Portfolio Size',
  insurance: 'Insurance',
  references: 'References',
};

const DIM_COLORS: Record<Dimension, string> = {
  price: '#2563eb',
  cam_license: '#7c3aed',
  portfolio_size: '#0891b2',
  insurance: '#059669',
  references: '#d97706',
};

const DIMENSIONS: Dimension[] = [
  'price',
  'cam_license',
  'portfolio_size',
  'insurance',
  'references',
];

// ── Stacked score bar ───────────────────────────────────────────────────────

function StackedScoreBar({ bid }: { bid: BidSnapshot }) {
  const segments = DIMENSIONS.map((dim) => ({
    dim,
    value: bid.scores[dim]?.weighted ?? 0,
    color: DIM_COLORS[dim],
    label: DIM_LABELS[dim],
  })).filter((s) => s.value > 0);

  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}
      >
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Score composition</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e3a8a' }}>
          {bid.composite_score}/100
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 18,
          background: '#e5e7eb',
          borderRadius: 9,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div style={{ width: `${bid.composite_score}%`, display: 'flex', height: '100%' }}>
          {segments.map((s) => (
            <div
              key={s.dim}
              title={`${s.label}: ${s.value} pts`}
              style={{
                width: `${(s.value / total) * 100}%`,
                background: s.color,
                height: '100%',
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}
      >
        {segments.map((s) => (
          <div
            key={s.dim}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.68rem',
              color: '#6b7280',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            {s.label}: {s.value}pt
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bid card ────────────────────────────────────────────────────────────────

function BidCard({ bid, isTop }: { bid: BidSnapshot; isTop: boolean }) {
  return (
    <div
      className="card print-section"
      style={{
        marginBottom: '1.25rem',
        border: isTop ? '2px solid #2563eb' : '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.3rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                background: isTop ? '#dbeafe' : '#f3f4f6',
                color: isTop ? '#1e40af' : '#6b7280',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 99,
              }}
            >
              #{bid.rank}{isTop ? ' — Top Ranked' : ''}
            </span>
            {bid.verification_badge && (
              <span
                style={{
                  display: 'inline-block',
                  background: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.45rem',
                  borderRadius: 99,
                }}
              >
                ✓ Verified
              </span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{bid.company_name}</h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            Submitted {new Date(bid.submitted_at).toLocaleDateString()}
            {bid.years_in_business
              ? ` · ${bid.years_in_business} yrs in business`
              : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#1e3a8a',
              lineHeight: 1,
            }}
          >
            {bid.composite_score}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>composite score</div>
        </div>
      </div>

      <StackedScoreBar bid={bid} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '0.5rem',
          marginTop: '1rem',
        }}
      >
        {DIMENSIONS.map((dim) => {
          const ds = bid.scores[dim];
          if (!ds) return null;
          return (
            <div
              key={dim}
              style={{ background: '#f9fafb', borderRadius: 6, padding: '0.5rem 0.75rem' }}
            >
              <div style={{ fontSize: '0.68rem', color: '#6b7280', marginBottom: '0.2rem' }}>
                {DIM_LABELS[dim]}
              </div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color:
                    ds.raw >= 70 ? '#065f46' : ds.raw >= 40 ? '#92400e' : '#991b1b',
                }}
              >
                {ds.raw}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                {ds.is_override
                  ? 'Override'
                  : ds.verified
                  ? 'Verified'
                  : 'Self-reported'}
              </div>
            </div>
          );
        })}
      </div>

      {(bid.management_fee || bid.cam_license_number) && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: '#374151' }}>
          {bid.management_fee && (
            <>
              Management fee: <strong>{bid.management_fee}</strong>
            </>
          )}
          {bid.cam_license_number && (
            <>
              {bid.management_fee ? ' · ' : ''}
              CAM #{bid.cam_license_number}
              {bid.cam_license_state ? ` (${bid.cam_license_state})` : ''}
            </>
          )}
        </p>
      )}
    </div>
  );
}

// ── Email panel ─────────────────────────────────────────────────────────────

function EmailPanel({ report }: { report: DecisionReport }) {
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>(report.email_recipients ?? []);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleAdd = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    if (!emailList.includes(trimmed)) setEmailList([...emailList, trimmed]);
    setEmailInput('');
  };

  const handleSend = async () => {
    if (!emailList.length) {
      setSendMsg({ ok: false, text: 'Add at least one recipient.' });
      return;
    }
    setSending(true);
    setSendMsg(null);
    const result = await emailReportToBoard(report.id, emailList);
    setSendMsg(
      result.success
        ? {
            ok: true,
            text: `Report emailed to ${emailList.length} recipient${emailList.length !== 1 ? 's' : ''}.`,
          }
        : { ok: false, text: result.error ?? 'Send failed.' },
    );
    setSending(false);
  };

  return (
    <div
      className="no-print"
      style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}
    >
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
        Distribute to Your Board
      </h2>
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
        Send this ranked report summary by email. Each recipient receives the full ranked
        table with the liability disclaimer embedded.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="board.member@example.com"
          style={{
            flex: 1,
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: '0.9rem',
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: '#374151',
          }}
        >
          Add
        </button>
      </div>

      {emailList.length > 0 && (
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}
        >
          {emailList.map((addr) => (
            <span
              key={addr}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: '#eff6ff',
                color: '#1e40af',
                fontSize: '0.8rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 99,
                fontWeight: 500,
              }}
            >
              {addr}
              <button
                type="button"
                onClick={() => setEmailList(emailList.filter((a) => a !== addr))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#3b82f6',
                  fontWeight: 700,
                  padding: 0,
                  lineHeight: 1,
                  fontSize: '1rem',
                }}
                aria-label={`Remove ${addr}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {sendMsg && (
        <div
          role="alert"
          style={{
            padding: '0.6rem 1rem',
            borderRadius: 8,
            marginBottom: '0.75rem',
            background: sendMsg.ok ? '#f0fdf4' : '#fef2f2',
            color: sendMsg.ok ? '#166534' : '#dc2626',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {sendMsg.text}
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={sending || emailList.length === 0}
        style={{
          padding: '0.65rem 1.5rem',
          borderRadius: 8,
          border: 'none',
          background: '#2563eb',
          color: '#fff',
          fontWeight: 700,
          cursor: sending || emailList.length === 0 ? 'not-allowed' : 'pointer',
          opacity: sending || emailList.length === 0 ? 0.6 : 1,
          fontSize: '0.9rem',
        }}
      >
        {sending
          ? 'Sending…'
          : `Email to ${emailList.length || 0} Recipient${emailList.length !== 1 ? 's' : ''}`}
      </button>

      {report.emailed_at && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
          Last sent {new Date(report.emailed_at).toLocaleString()}
          {report.email_recipients?.length
            ? ` to ${report.email_recipients.length} recipient${report.email_recipients.length !== 1 ? 's' : ''}`
            : ''}
        </p>
      )}
    </div>
  );
}

// ── Report preview ──────────────────────────────────────────────────────────

function ReportPreview({ report }: { report: DecisionReport }) {
  const snap = report.snapshot_json;

  return (
    <div>
      {/* Cover page */}
      <div
        style={{
          background: '#1e3a8a',
          color: '#fff',
          padding: '2.5rem 2rem',
          borderRadius: '10px 10px 0 0',
        }}
      >
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.75rem',
            opacity: 0.7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Board Decision Report
        </p>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem', fontWeight: 800 }}>
          {snap.rfp_title}
        </h2>
        {snap.community_name && (
          <p style={{ margin: '0 0 0.25rem', opacity: 0.85, fontSize: '1rem' }}>
            {snap.community_name}
          </p>
        )}
        <p style={{ margin: '0.75rem 0 0', opacity: 0.65, fontSize: '0.8rem' }}>
          Generated {new Date(snap.generated_at).toLocaleString()}
          {' · '}
          {snap.bids.length} bid{snap.bids.length !== 1 ? 's' : ''} evaluated
        </p>
      </div>

      {/* Liability disclaimer — required on cover */}
      <div
        style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderTop: 'none',
          padding: '1rem 1.5rem',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.82rem',
            color: '#92400e',
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          {snap.disclaimer}
        </p>
      </div>

      {/* Ranking section */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '2rem',
          background: '#fff',
        }}
      >
        <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem', fontWeight: 700 }}>
          How Each Bid Was Scored
        </h2>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
          Ranked by weighted composite score. Bars show the contribution of each criterion.
          Final selection decisions are solely the responsibility of the board.
        </p>

        {/* Weight legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            background: '#f9fafb',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
          }}
        >
          {DIMENSIONS.map((dim) => (
            <div
              key={dim}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: DIM_COLORS[dim],
                  flexShrink: 0,
                }}
              />
              <span style={{ color: '#374151', fontWeight: 600 }}>{DIM_LABELS[dim]}</span>
              <span style={{ color: '#9ca3af' }}>
                {Math.round(snap.weights[dim] * 100)}%
              </span>
            </div>
          ))}
        </div>

        {snap.bids.map((bid) => (
          <BidCard key={bid.submission_id} bid={bid} isTop={bid.rank === 1} />
        ))}

        <EmailPanel report={report} />
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string };
}

export default function ReportPage({ params }: PageProps) {
  const rfpId = params.id;

  const [reports, setReports] = useState<DecisionReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);

  const selectedReport =
    reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;

  const loadReports = useCallback(async () => {
    setLoadError(null);
    const result = await getDecisionReports(rfpId);
    if (!result.success) {
      setLoadError(result.error ?? 'Failed to load reports');
      return;
    }
    const loaded = result.reports ?? [];
    setReports(loaded);
    if (loaded.length) setSelectedId(loaded[0].id);
  }, [rfpId]);

  useEffect(() => {
    setLoading(true);
    loadReports().finally(() => setLoading(false));
  }, [loadReports]);

  // Animate progress messages while generating
  useEffect(() => {
    if (!generating) return;
    setProgressIdx(0);
    const iv = setInterval(() => {
      setProgressIdx((prev) => {
        if (prev < PROGRESS_MESSAGES.length - 1) return prev + 1;
        clearInterval(iv);
        return prev;
      });
    }, 900);
    return () => clearInterval(iv);
  }, [generating]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    const result = await generateDecisionReport(rfpId);
    setGenerating(false);
    if (!result.success || !result.report) {
      setGenError(result.error ?? 'Failed to generate report');
      return;
    }
    const newReport = result.report;
    setReports((prev) => [newReport, ...prev]);
    setSelectedId(newReport.id);
  };

  if (loading) {
    return (
      <main>
        <h1>Board Decision Report</h1>
        <p style={{ color: '#6b7280' }}>Loading report history…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main>
        <h1>Board Decision Report</h1>
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: 8,
          }}
        >
          {loadError}
        </div>
      </main>
    );
  }

  return (
    <main>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          .print-section { break-inside: avoid; }
        }
        @media (max-width: 800px) {
          .report-layout { flex-direction: column !important; }
        }
      `}</style>

      <h1>Board Decision Report</h1>
      <p>
        Generate an immutable scoring snapshot for board meeting distribution. Once created,
        the report preserves all scores and rankings exactly as they stood — protecting the
        board&#39;s record against later data changes.
      </p>

      {/* Generate action row */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: '0.7rem 1.5rem',
            borderRadius: 8,
            border: 'none',
            background: generating ? '#6b7280' : '#1e3a8a',
            color: '#fff',
            fontWeight: 700,
            cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
          }}
        >
          {generating ? 'Generating…' : '+ Generate New Report'}
        </button>

        {generating && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#2563eb',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '2px solid #bfdbfe',
                borderTopColor: '#2563eb',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            {PROGRESS_MESSAGES[progressIdx]}
          </div>
        )}

        {genError && (
          <span role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
            {genError}
          </span>
        )}
      </div>

      {reports.length === 0 && !generating ? (
        <div className="empty">
          <p style={{ fontWeight: 600 }}>No reports generated yet</p>
          <p className="muted">
            Generate your first board decision report to capture the current scoring snapshot.
            Reports are immutable — the record is preserved even if bid data is later updated.
          </p>
        </div>
      ) : (
        <div
          className="report-layout"
          style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}
        >
          {/* History sidebar */}
          {reports.length > 0 && (
            <aside
              className="no-print"
              style={{ minWidth: 210, maxWidth: 250, flexShrink: 0 }}
            >
              <h2
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#374151',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Report History
              </h2>
              {reports.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedId(rep.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.65rem 0.75rem',
                    marginBottom: '0.4rem',
                    borderRadius: 8,
                    border:
                      rep.id === selectedId
                        ? '2px solid #2563eb'
                        : '1px solid #e5e7eb',
                    background: rep.id === selectedId ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: '0.15rem',
                    }}
                  >
                    {new Date(rep.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                    {rep.snapshot_json.bids.length} bid
                    {rep.snapshot_json.bids.length !== 1 ? 's' : ''}{' '}
                    ·{' '}
                    {new Date(rep.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {rep.emailed_at && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#059669',
                        marginTop: '0.15rem',
                        fontWeight: 500,
                      }}
                    >
                      ✓ Emailed
                    </div>
                  )}
                </button>
              ))}
            </aside>
          )}

          {/* Report preview */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedReport ? (
              <>
                <div
                  className="no-print"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: '1rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Print / Save as PDF
                  </button>
                </div>
                <ReportPreview report={selectedReport} />
              </>
            ) : generating ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.05rem' }}>
                  Generating report…
                </p>
                <p className="muted">{PROGRESS_MESSAGES[progressIdx]}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
