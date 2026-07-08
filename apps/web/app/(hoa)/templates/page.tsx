'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getTemplatesPageData,
  recordDownload,
  type TemplateVersion,
  type UserContext,
} from '@/lib/hoa/templates';

const LAUNCH_STATES = ['FL', 'CA', 'TX', 'AZ', 'NV'] as const;

const STATE_META: Record<string, { label: string; color: string; bg: string }> = {
  FL: { label: 'Florida', color: '#fff', bg: '#003087' },
  CA: { label: 'California', color: '#fff', bg: '#B31942' },
  TX: { label: 'Texas', color: '#fff', bg: '#BF0A30' },
  AZ: { label: 'Arizona', color: '#fff', bg: '#002868' },
  NV: { label: 'Nevada', color: '#fff', bg: '#003865' },
};

function StateChip({ state }: { state: string }) {
  const meta = STATE_META[state] ?? { label: state, color: '#fff', bg: '#64748b' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.2rem 0.6rem',
        borderRadius: 99,
        background: meta.bg,
        color: meta.color,
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      {state}
    </span>
  );
}

function ReviewBadge({ status }: { status: string }) {
  const approved = status === 'approved';
  return (
    <span
      style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.15rem 0.55rem',
        borderRadius: 99,
        background: approved ? '#d1fae5' : '#fef3c7',
        color: approved ? '#065f46' : '#92400e',
      }}
    >
      {approved ? 'Attorney Approved' : 'Review in Progress'}
    </span>
  );
}

interface DisclaimerModalProps {
  template: TemplateVersion;
  onAccept: () => void;
  onClose: () => void;
  loading: boolean;
}

function DisclaimerModal({ template, onAccept, onClose, loading }: DisclaimerModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '0.75rem',
          padding: '2rem',
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <h2 id="disclaimer-title" style={{ marginTop: 0, fontSize: '1.2rem', color: '#0f172a' }}>
          Not Legal Advice — Please Read
        </h2>
        <p style={{ color: '#374151', lineHeight: 1.65, marginBottom: '0.9rem' }}>
          The template you are about to download — <strong>{template.title}</strong> — is provided
          for general informational and reference purposes only. It has been reviewed by a licensed
          attorney as of the version date shown, but it does not constitute legal advice and does
          not create an attorney-client relationship between you and this platform or any attorney.
        </p>
        <p style={{ color: '#374151', lineHeight: 1.65, marginBottom: '0.9rem' }}>
          State statutes governing community associations change regularly. You should consult a
          qualified attorney licensed in {STATE_META[template.state]?.label ?? template.state}{' '}
          before using this template in any binding agreement, and you should verify that the
          statutory year ({template.statute_year}) reflected in this template matches the current
          law in your jurisdiction.
        </p>
        <p style={{ color: '#374151', lineHeight: 1.65, marginBottom: '1.5rem' }}>
          By clicking "I Understand — Download Template" below, you acknowledge that you have read
          and understood this notice and that you are downloading this template at your own
          discretion.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={loading}
            style={{ fontSize: '0.9rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={onAccept}
            disabled={loading}
            style={{ fontSize: '0.9rem' }}
          >
            {loading ? 'Recording…' : 'I Understand — Download Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: TemplateVersion;
  onDownloadClick: (t: TemplateVersion) => void;
}

function TemplateCard({ template, onDownloadClick }: TemplateCardProps) {
  const [hovered, setHovered] = useState(false);
  const locked = template.review_status !== 'approved';
  const reviewedDate = template.attorney_reviewed_at
    ? new Date(template.attorney_reviewed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className="card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.13)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <StateChip state={template.state} />
            <ReviewBadge status={template.review_status} />
          </div>
          <h3 style={{ margin: '0 0 0.3rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {template.title}
          </h3>
          {template.description && (
            <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.87rem', lineHeight: 1.5 }}>
              {template.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: '0.82rem' }}>
              Version {template.version} · Statute Year {template.statute_year}
            </span>
            {reviewedDate && (
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                Attorney reviewed {reviewedDate}
              </span>
            )}
            {template.attorney_name && (
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                {template.attorney_name}
              </span>
            )}
          </div>
        </div>
        <div style={{ flexShrink: 0, alignSelf: 'center' }}>
          {locked ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.4rem',
                background: '#f8fafc',
                color: '#64748b',
                fontSize: '0.85rem',
                cursor: 'default',
              }}
            >
              <span aria-hidden="true">🔒</span>
              <span>Review in Progress</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn"
              style={{ fontSize: '0.87rem', padding: '0.45rem 1rem' }}
              onClick={() => onDownloadClick(template)}
            >
              Download
            </button>
          )}
        </div>
      </div>
      {locked && (
        <p
          style={{
            margin: '0.75rem 0 0',
            padding: '0.6rem 0.85rem',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '0.35rem',
            fontSize: '0.83rem',
            color: '#92400e',
            lineHeight: 1.5,
          }}
        >
          This template is currently undergoing attorney review to ensure it reflects the latest{' '}
          {template.statute_year} {STATE_META[template.state]?.label ?? template.state} statutes.
          It will be available for download once the review is complete. Please check back soon.
        </p>
      )}
    </div>
  );
}

function UncoveredStateCard({ state, onNotify }: { state: string; onNotify: (s: string) => void }) {
  const meta = STATE_META[state] ?? { label: state, color: '#fff', bg: '#64748b' };
  return (
    <div
      className="card"
      style={{
        opacity: 0.72,
        border: '1.5px dashed #cbd5e1',
        background: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <StateChip state={state} />
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.87rem', color: '#64748b' }}>
            {meta.label} templates are not yet available. Our team is preparing attorney-reviewed
            agreements for this state.
          </p>
        </div>
        <button
          type="button"
          className="btn secondary"
          style={{ fontSize: '0.83rem', padding: '0.4rem 0.85rem', flexShrink: 0 }}
          onClick={() => onNotify(state)}
        >
          Notify Me
        </button>
      </div>
    </div>
  );
}

interface NotifyModalProps {
  state: string;
  onClose: () => void;
}

function NotifyModal({ state, onClose }: NotifyModalProps) {
  const meta = STATE_META[state] ?? { label: state, color: '#fff', bg: '#64748b' };
  const [submitted, setSubmitted] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '0.75rem',
          padding: '2rem',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {submitted ? (
          <>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: '#065f46' }}>You&#39;re on the list!</h2>
            <p style={{ color: '#374151', lineHeight: 1.6 }}>
              We will notify you as soon as {meta.label} management agreement templates become
              available.
            </p>
            <button type="button" className="btn" onClick={onClose} style={{ marginTop: '0.5rem' }}>
              Close
            </button>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: '#0f172a' }}>
              Notify me when {meta.label} templates are ready
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              We are actively preparing attorney-reviewed management agreement templates for{' '}
              {meta.label}. Click below and we will send you an email when they are published.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={() => setSubmitted(true)}>
                Notify Me
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateVersion[]>([]);
  const [user, setUser] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateVersion | null>(null);
  const [notifyState, setNotifyState] = useState<string | null>(null);
  const [downloadLoading, startDownloadTransition] = useTransition();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    getTemplatesPageData()
      .then(({ user: u, templates: tpls }) => {
        setUser(u);
        setTemplates(tpls);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const coveredStates = new Set(templates.map((t) => t.state));
  const uncoveredStates = LAUNCH_STATES.filter((s) => !coveredStates.has(s));

  const groupedByState: Record<string, TemplateVersion[]> = {};
  for (const t of templates) {
    if (!groupedByState[t.state]) groupedByState[t.state] = [];
    groupedByState[t.state].push(t);
  }

  function handleDownloadClick(template: TemplateVersion) {
    setDownloadSuccess(null);
    setPendingTemplate(template);
  }

  function handleDisclaimerAccept() {
    if (!pendingTemplate || !user) return;
    const tpl = pendingTemplate;
    startDownloadTransition(async () => {
      await recordDownload(tpl.id, user.orgId, user.userId, user.userEmail);
      setPendingTemplate(null);
      setDownloadSuccess(tpl.id);
      if (tpl.file_url) {
        window.open(tpl.file_url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  return (
    <main>
      <style>{`
        .template-section { margin-bottom: 2.5rem; }
        .template-section h2 { font-size: 1rem; font-weight: 700; color: #374151; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .template-grid { display: flex; flex-direction: column; gap: 0.85rem; }
      `}</style>

      <h1>Management Agreement Templates</h1>
      <p>
        Attorney-reviewed state agreement templates for the five highest-HOA-density launch states.
        Download requires acknowledging that templates are for reference only and do not constitute
        legal advice.
      </p>

      {loading && (
        <div className="empty" style={{ borderStyle: 'solid' }}>
          <p className="muted">Loading templates…</p>
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ borderColor: '#fca5a5', background: '#fff1f2' }}>
          <p style={{ color: '#b91c1c', margin: 0 }}>⚠ Could not load templates: {error}</p>
        </div>
      )}

      {!loading && !error && templates.length === 0 && uncoveredStates.length === 0 && (
        <div className="empty">
          <p style={{ fontWeight: 600, margin: '0 0 0.4rem' }}>No templates yet</p>
          <p className="muted" style={{ margin: 0 }}>
            Management agreement templates for Florida, California, Texas, Arizona, and Nevada will
            appear here once they have been published.
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          {LAUNCH_STATES.filter((s) => coveredStates.has(s)).map((state) => (
            <section key={state} className="template-section">
              <h2>
                <StateChip state={state} />
                {STATE_META[state]?.label ?? state}
              </h2>
              <div className="template-grid">
                {(groupedByState[state] ?? []).map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onDownloadClick={handleDownloadClick}
                  />
                ))}
                {downloadSuccess && groupedByState[state]?.some((t) => t.id === downloadSuccess) && (
                  <p style={{ color: '#065f46', fontSize: '0.85rem', margin: 0 }}>
                    ✓ Download recorded. Your file is opening in a new tab.
                  </p>
                )}
              </div>
            </section>
          ))}

          {uncoveredStates.length > 0 && (
            <section className="template-section">
              <h2 style={{ color: '#94a3b8' }}>Coming Soon</h2>
              <div className="template-grid">
                {uncoveredStates.map((state) => (
                  <UncoveredStateCard
                    key={state}
                    state={state}
                    onNotify={(s) => setNotifyState(s)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {pendingTemplate && (
        <DisclaimerModal
          template={pendingTemplate}
          loading={downloadLoading}
          onAccept={handleDisclaimerAccept}
          onClose={() => setPendingTemplate(null)}
        />
      )}

      {notifyState && (
        <NotifyModal state={notifyState} onClose={() => setNotifyState(null)} />
      )}
    </main>
  );
}
