'use client';

import React, { useEffect, useRef, useState } from 'react';
import { recordTemplateEngagement, type EngagementAction } from '@/lib/hoa/templates';

interface TemplateActionsProps {
  slug: string;
  title: string;
  plainText: string;
}

/**
 * Copy / download actions for a template document. The first action shows a
 * one-time not-legal-advice acknowledgment (click-through, per the product
 * plan); after acceptance both actions run directly for the rest of the
 * visit. Engagement is recorded best-effort — a failed insert never blocks
 * the copy or download.
 */
export default function TemplateActions({ slug, title, plainText }: TemplateActionsProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState<EngagementAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const dialogButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending) dialogButtonRef.current?.focus();
  }, [pending]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plainText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setFeedback('Copied to clipboard — paste into your document editor.');
  }

  function downloadText() {
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback('Downloaded as a .txt file.');
  }

  async function run(action: EngagementAction) {
    if (action === 'copy') await copyText();
    else downloadText();
    // Best-effort telemetry; never block the user's action on it.
    void recordTemplateEngagement(slug, action);
  }

  function handleClick(action: EngagementAction) {
    setFeedback(null);
    if (!acknowledged) {
      setPending(action);
      return;
    }
    void run(action);
  }

  function handleAccept() {
    const action = pending;
    setAcknowledged(true);
    setPending(null);
    if (action) void run(action);
  }

  return (
    <div style={{ marginTop: '1.1rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={() => handleClick('copy')}>
          Copy full document
        </button>
        <button type="button" className="btn secondary" onClick={() => handleClick('download')}>
          Download .txt
        </button>
      </div>
      <div aria-live="polite">
        {feedback && (
          <p style={{ color: 'var(--substrate-success)', fontSize: '0.88rem', marginTop: '0.6rem', marginBottom: 0 }}>
            ✓ {feedback}
          </p>
        )}
      </div>

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tpl-ack-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPending(null);
          }}
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
              background: 'var(--substrate-bg)',
              borderRadius: 'var(--substrate-radius-lg)',
              padding: '2rem',
              maxWidth: 520,
              width: '100%',
              boxShadow: 'var(--substrate-shadow-lg)',
            }}
          >
            <h2 id="tpl-ack-title" style={{ marginTop: 0, fontSize: '1.2rem' }}>
              This is a reference document, not legal advice
            </h2>
            <p style={{ lineHeight: 1.65 }}>
              <strong>{title}</strong> is provided for your board&rsquo;s reference. No attorney
              has reviewed it for your association, and using it does not create an
              attorney-client relationship with Boardwell or anyone else.
            </p>
            <p style={{ lineHeight: 1.65 }}>
              Community-association statutes change and vary by state. Replace every{' '}
              <strong>[BRACKETED]</strong> placeholder, read the state note for your state, and
              have a licensed attorney in your state review any document before your board signs
              or sends it.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn secondary" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button ref={dialogButtonRef} type="button" className="btn" onClick={handleAccept}>
                I understand — continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
