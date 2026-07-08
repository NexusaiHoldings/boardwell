'use client';

import React, { useEffect, useState, useTransition, useCallback } from 'react';
import {
  getRfpWithSections,
  triggerRfpGeneration,
  updateRfpSection,
  finalizeRfp,
  getCurrentUser,
  RfpRow,
  RfpSection,
} from '@/lib/hoa/rfp-generator';

interface PageProps {
  params: { id: string };
}

function SkeletonSection() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          height: 20,
          width: '40%',
          borderRadius: 4,
          background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          marginBottom: '1rem',
        }}
      />
      {[90, 75, 60, 80].map((w, i) => (
        <div
          key={i}
          style={{
            height: 14,
            width: `${w}%`,
            borderRadius: 3,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            marginBottom: '0.5rem',
          }}
        />
      ))}
    </div>
  );
}

function SectionCard({
  section,
  onSave,
  disabled,
}: {
  section: RfpSection;
  onSave: (key: string, content: string) => Promise<void>;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(section.content);
  }, [section.content]);

  async function handleSave() {
    setSaving(true);
    await onSave(section.section_key, draft);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleCancel() {
    setDraft(section.content);
    setEditing(false);
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '1.5rem 1.75rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          {section.title}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {saved && <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 500 }}>Saved ✓</span>}
          {section.edited_by && !editing && (
            <span className="muted" style={{ fontSize: '0.75rem' }}>Edited</span>
          )}
          {!editing && !disabled && (
            <button
              className="btn secondary"
              onClick={() => setEditing(true)}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6 }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn secondary" onClick={handleCancel} disabled={saving} style={{ fontSize: '0.85rem' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ fontSize: '0.85rem' }}>
              {saving ? 'Saving…' : 'Save Section'}
            </button>
          </div>
        </>
      ) : (
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: '0.9rem',
            lineHeight: 1.7,
            color: '#334155',
          }}
        >
          {section.content}
        </div>
      )}
    </div>
  );
}

function PrintView({ rfp, sections }: { rfp: RfpRow; sections: RfpSection[] }) {
  return (
    <div id="rfp-print" style={{ display: 'none' }}>
      <h1>{rfp.title}</h1>
      {sections.map((s) => (
        <div key={s.section_key} style={{ marginBottom: '2rem', pageBreakInside: 'avoid' }}>
          <h2>{s.title}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{s.content}</pre>
        </div>
      ))}
    </div>
  );
}

export default function RfpDetailPage({ params }: PageProps) {
  const { id } = params;
  const [rfp, setRfp] = useState<RfpRow | null>(null);
  const [sections, setSections] = useState<RfpSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('anonymous');
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const result = await getRfpWithSections(id);
    if (!result) {
      setError('RFP not found.');
      setLoading(false);
      return;
    }
    setRfp(result.rfp);
    setSections(result.sections);
    setLoading(false);

    if (result.rfp.status === 'generating' && result.sections.length === 0) {
      setGenerating(true);
    }
  }, [id]);

  useEffect(() => {
    getCurrentUser().then((u) => setUserId(u.userId));
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!generating) return;

    let cancelled = false;
    const generate = async () => {
      try {
        await triggerRfpGeneration(id);
        if (!cancelled) {
          await loadData();
          setGenerating(false);
        }
      } catch {
        if (!cancelled) {
          setError('Generation failed. Please refresh and try again.');
          setGenerating(false);
        }
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [generating, id, loadData]);

  async function handleSaveSection(sectionKey: string, content: string) {
    await updateRfpSection(id, sectionKey, content, userId);
    setSections((prev) =>
      prev.map((s) =>
        s.section_key === sectionKey
          ? { ...s, content, edited_by: userId, edited_at: new Date().toISOString() }
          : s
      )
    );
  }

  function handleFinalize() {
    setFinalizing(true);
    startTransition(async () => {
      try {
        await finalizeRfp(id);
        setRfp((prev) => prev ? { ...prev, status: 'finalized', finalized_at: new Date().toISOString() } : prev);
      } catch {
        setError('Finalize failed. Please try again.');
      } finally {
        setFinalizing(false);
      }
    });
  }

  function handlePrint() {
    const printEl = document.getElementById('rfp-print');
    if (!printEl) return;
    const origDisplay = printEl.style.display;
    printEl.style.display = 'block';
    window.print();
    printEl.style.display = origDisplay;
  }

  const isFinalized = rfp?.status === 'finalized';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media print {
          body > * { display: none !important; }
          #rfp-print { display: block !important; }
        }
      `}</style>

      <main>
        {loading && !generating ? (
          <>
            <div style={{ height: 32, width: '60%', borderRadius: 6, background: '#e2e8f0', marginBottom: '0.75rem' }} />
            <div style={{ height: 18, width: '40%', borderRadius: 4, background: '#f1f5f9', marginBottom: '2rem' }} />
            {[1, 2, 3].map((n) => <SkeletonSection key={n} />)}
          </>
        ) : error ? (
          <div className="empty">
            <p style={{ color: '#dc2626' }}>{error}</p>
            <a href="/rfps" className="btn secondary">← Back to RFPs</a>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <a href="/rfps" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none' }}>← All RFPs</a>
                <h1 style={{ margin: '0.35rem 0 0', fontSize: '1.5rem' }}>{rfp?.title}</h1>
                {rfp && (
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    {rfp.unit_count && `${rfp.unit_count} units · `}
                    {rfp.state && `${rfp.state} · `}
                    {rfp.status === 'finalized'
                      ? `Finalized ${new Date(rfp.finalized_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : `Status: ${rfp.status}`}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {sections.length > 0 && (
                  <button className="btn secondary" onClick={handlePrint} style={{ fontSize: '0.85rem' }}>
                    Export / Print
                  </button>
                )}
                {!isFinalized && sections.length > 0 && (
                  <button
                    onClick={handleFinalize}
                    disabled={finalizing || isPending}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {finalizing || isPending ? 'Finalizing…' : 'Finalize RFP'}
                  </button>
                )}
                {isFinalized && (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.35rem 0.85rem',
                      borderRadius: 6,
                      background: '#d1fae5',
                      color: '#065f46',
                    }}
                  >
                    ✓ Finalized
                  </span>
                )}
              </div>
            </div>

            {generating && (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="card" style={{ marginBottom: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <p style={{ margin: 0, color: '#1e40af', fontWeight: 500, fontSize: '0.95rem' }}>
                    ✦ Generating your RFP sections with AI… This takes 30–60 seconds.
                  </p>
                </div>
                {[1, 2, 3, 4].map((n) => <SkeletonSection key={n} />)}
              </div>
            )}

            {!generating && sections.length === 0 && !error && (
              <div className="empty">
                <p>No sections found. The RFP may still be generating.</p>
                <button onClick={() => { setGenerating(true); }} style={{ marginTop: '0.75rem' }}>
                  Retry Generation
                </button>
              </div>
            )}

            {!generating && sections.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                {isFinalized && (
                  <div className="card" style={{ marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: 0, color: '#065f46', fontSize: '0.9rem' }}>
                      This RFP has been finalized. Use &ldquo;Export / Print&rdquo; to distribute to management companies.
                    </p>
                  </div>
                )}
                {sections.map((section) => (
                  <SectionCard
                    key={section.section_key}
                    section={section}
                    onSave={handleSaveSection}
                    disabled={isFinalized}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {rfp && sections.length > 0 && (
          <PrintView rfp={rfp} sections={sections} />
        )}
      </main>
    </>
  );
}
