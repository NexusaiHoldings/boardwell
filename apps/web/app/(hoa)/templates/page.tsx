import Link from 'next/link';
import type { Metadata } from 'next';
import {
  CATEGORY_META,
  STATE_LABELS,
  TEMPLATE_LIBRARY,
  templatesByCategory,
  templateWordCount,
  type LaunchState,
  type TemplateDoc,
} from '@/lib/hoa/template-library';

export const metadata: Metadata = {
  title: 'Free HOA Board Document Templates | Boardwell',
  description:
    'Ten board-ready HOA documents — management company RFP, management agreement, termination notice, meeting minutes, violation notice, and more. State notes for FL, CA, TX, AZ, and NV. No signup required.',
};

const STATE_ORDER: LaunchState[] = ['FL', 'CA', 'TX', 'AZ', 'NV'];

function TemplateCard({ doc }: { doc: TemplateDoc }) {
  const words = templateWordCount(doc);
  return (
    <div className="feature-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="pill">{doc.docType}</span>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          ~{doc.fillMinutes} min to fill in · {words.toLocaleString()} words
        </span>
      </div>
      <h3 style={{ margin: 0, fontSize: '1.08rem', lineHeight: 1.35 }}>
        <Link href={`/templates/${doc.slug}`} style={{ textDecoration: 'none' }}>
          {doc.title}
        </Link>
      </h3>
      <p className="muted" style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, flex: 1 }}>
        {doc.description}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginTop: '0.25rem',
        }}
      >
        <span className="muted" style={{ fontSize: '0.78rem' }}>
          State notes: {STATE_ORDER.map((s) => s).join(' · ')}
        </span>
        <Link
          href={`/templates/${doc.slug}`}
          className="btn secondary"
          style={{ fontSize: '0.85rem', padding: '0.35rem 0.9rem' }}
        >
          Read &amp; copy
        </Link>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const groups = templatesByCategory();
  return (
    <main>
      <header style={{ marginBottom: '2rem' }}>
        <span className="eyebrow">Free board document library</span>
        <h1 style={{ marginBottom: '0.5rem' }}>
          Board documents you can send this week
        </h1>
        <p style={{ maxWidth: '46rem' }}>
          {TEMPLATE_LIBRARY.length} documents written from how boards actually hire, run
          meetings, and manage vendors — an RFP with a weighted scoring rubric, a management
          agreement with real termination and insurance clauses, meeting minutes, violation
          notices, and more. Fill in the{' '}
          <mark
            style={{
              background: 'color-mix(in srgb, var(--substrate-accent) 14%, transparent)',
              color: 'var(--substrate-fg)',
              padding: '0 0.25rem',
              borderRadius: 4,
            }}
          >
            [BRACKETED]
          </mark>{' '}
          placeholders, have your association&rsquo;s attorney review, and send. No signup, no
          email gate.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
          {STATE_ORDER.map((s) => (
            <span key={s} className="pill">
              {STATE_LABELS[s]}
            </span>
          ))}
          <span className="pill success">No login required</span>
        </div>
      </header>

      <div
        className="surface"
        style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}
        role="note"
      >
        <strong style={{ whiteSpace: 'nowrap' }}>Not legal advice.</strong>
        <span className="muted" style={{ fontSize: '0.92rem', lineHeight: 1.55 }}>
          These documents cite each state&rsquo;s community-association statute so your board
          knows where the law applies, but no attorney has reviewed them for your association.
          Have your own counsel review anything you intend to sign or send.
        </span>
      </div>

      {groups.map(({ category, templates }) => (
        <section key={category} style={{ marginTop: '2.5rem' }}>
          <h2 style={{ marginBottom: '0.35rem' }}>{CATEGORY_META[category].label}</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: '1.25rem', maxWidth: '44rem' }}>
            {CATEGORY_META[category].blurb}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.1rem',
            }}
          >
            {templates.map((doc) => (
              <TemplateCard key={doc.slug} doc={doc} />
            ))}
          </div>
        </section>
      ))}

      <section className="cta-band" style={{ marginTop: '3rem', padding: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>Hiring a management company? Skip the blank page.</h2>
        <p style={{ maxWidth: '42rem' }}>
          The RFP template below takes about 45 minutes to fill in by hand. Boardwell&rsquo;s
          intake asks your board 10 minutes of questions about your community, then drafts the
          RFP for you — scope, questionnaire, fee-schedule requirements, and the weighted
          scoring rubric, ready to send to bidders.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/intake" className="btn">
            Start the 10-minute intake
          </Link>
          <Link href="/templates/management-company-rfp" className="btn secondary">
            Or fill in the RFP template yourself
          </Link>
        </div>
      </section>
    </main>
  );
}
