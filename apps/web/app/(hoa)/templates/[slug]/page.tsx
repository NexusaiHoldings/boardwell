import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  CATEGORY_META,
  STATE_LABELS,
  TEMPLATE_LIBRARY,
  getTemplateBySlug,
  templatePlainText,
  templateWordCount,
  type TemplateSection,
} from '@/lib/hoa/template-library';
import TemplateActions from './TemplateActions';

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return TEMPLATE_LIBRARY.map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const doc = getTemplateBySlug(params.slug);
  if (!doc) return { title: 'Template not found | Boardwell' };
  return {
    title: `${doc.title} — Free Template | Boardwell`,
    description: doc.description,
  };
}

/**
 * Renders a section body per the library's block rules: blocks are separated
 * by blank lines; a block whose lines all start with "- " renders as a list;
 * single newlines inside a block are preserved (signature/address blocks).
 * [BRACKETED] placeholders are highlighted so boards can spot every blank.
 */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\[[^\]\n]+\])/g);
  return parts.map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <mark
        key={i}
        style={{
          background: 'color-mix(in srgb, var(--substrate-accent) 14%, transparent)',
          color: 'var(--substrate-fg)',
          padding: '0 0.2rem',
          borderRadius: 4,
          fontWeight: 600,
        }}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function SectionBody({ body }: { body: string }) {
  const blocks = body.split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const isList = lines.length > 0 && lines.every((l) => l.trim().startsWith('- '));
        if (isList) {
          return (
            <ul key={i} style={{ lineHeight: 1.7, paddingLeft: '1.3rem' }}>
              {lines.map((l, j) => (
                <li key={j} style={{ marginBottom: '0.35rem' }}>
                  {renderInline(l.trim().replace(/^- /, ''))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
            {renderInline(block)}
          </p>
        );
      })}
    </>
  );
}

function Section({ section }: { section: TemplateSection }) {
  return (
    <section className="surface" style={{ padding: '1.5rem 1.75rem' }}>
      <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>{section.heading}</h2>
      <SectionBody body={section.body} />
    </section>
  );
}

export default function TemplateDetailPage({ params }: PageProps) {
  const doc = getTemplateBySlug(params.slug);
  if (!doc) notFound();

  const plainText = templatePlainText(doc);
  const words = templateWordCount(doc);

  return (
    <main>
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem' }}>
        <Link href="/templates" style={{ fontSize: '0.9rem' }}>
          ← All templates
        </Link>
      </nav>

      <header style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
          <span className="pill">{doc.docType}</span>
          <span className="pill">{CATEGORY_META[doc.category].label}</span>
        </div>
        <h1 style={{ marginBottom: '0.5rem' }}>{doc.title}</h1>
        <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          ~{doc.fillMinutes} minutes to fill in · {words.toLocaleString()} words · state notes for{' '}
          {doc.stateNotes.map((n) => n.state).join(', ')}
        </p>
        <p style={{ maxWidth: '46rem', lineHeight: 1.65 }}>{doc.whenToUse}</p>
        <TemplateActions slug={doc.slug} title={doc.title} plainText={plainText} />
      </header>

      <div
        className="surface"
        style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}
        role="note"
      >
        <strong style={{ whiteSpace: 'nowrap' }}>Before you use this:</strong>
        <span className="muted" style={{ fontSize: '0.92rem', lineHeight: 1.55 }}>
          Replace every{' '}
          <mark
            style={{
              background: 'color-mix(in srgb, var(--substrate-accent) 14%, transparent)',
              color: 'var(--substrate-fg)',
              padding: '0 0.2rem',
              borderRadius: 4,
            }}
          >
            [BRACKETED]
          </mark>{' '}
          placeholder, check the state note for your state below, and have your
          association&rsquo;s attorney review anything you intend to sign or send. This is a
          reference document, not legal advice.
        </span>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {doc.sections.map((section) => (
          <Section key={section.heading} section={section} />
        ))}
      </div>

      <section className="surface" style={{ marginTop: '0.25rem', padding: '1.5rem 1.75rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>State notes</h2>
        <dl style={{ margin: 0 }}>
          {doc.stateNotes.map((note) => (
            <div key={note.state} style={{ marginBottom: '0.9rem' }}>
              <dt style={{ fontWeight: 650, marginBottom: '0.2rem' }}>
                {STATE_LABELS[note.state]}
              </dt>
              <dd className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                {note.note}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {doc.category === 'hire' ? (
        <section className="cta-band" style={{ marginTop: '2.5rem', padding: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>Boardwell fills this in for you</h2>
          <p style={{ maxWidth: '42rem' }}>
            Answer 10 minutes of questions about your community and Boardwell drafts your RFP —
            scope, questionnaire, fee-schedule requirements, and the weighted scoring rubric —
            ready to send to 3–5 management companies.
          </p>
          <Link href="/intake" className="btn">
            Start the 10-minute intake
          </Link>
        </section>
      ) : (
        <section className="cta-band" style={{ marginTop: '2.5rem', padding: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>More board documents</h2>
          <p style={{ maxWidth: '42rem' }}>
            {TEMPLATE_LIBRARY.length} free documents cover hiring a management company, running
            the board, and managing vendors — each with state notes and a fill-in checklist.
          </p>
          <Link href="/templates" className="btn">
            Browse the library
          </Link>
        </section>
      )}
    </main>
  );
}
