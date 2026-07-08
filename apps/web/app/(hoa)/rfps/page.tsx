import { listRfps, getCurrentUser, RfpListItem } from '@/lib/hoa/rfp-generator';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    generating: '#92400e',
    draft: '#1e40af',
    finalized: '#065f46',
  };
  const labels: Record<string, string> = {
    generating: 'Generating…',
    draft: 'Draft',
    finalized: 'Finalized',
  };
  const bgs: Record<string, string> = {
    generating: '#fef3c7',
    draft: '#dbeafe',
    finalized: '#d1fae5',
  };
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.2rem 0.6rem',
        borderRadius: 99,
        background: bgs[status] ?? '#f1f5f9',
        color: colors[status] ?? '#374151',
        display: 'inline-block',
      }}
    >
      {labels[status] ?? status}
    </span>
  );
}

function RfpCard({ rfp }: { rfp: RfpListItem }) {
  const created = new Date(rfp.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a
            href={`/rfps/${rfp.id}`}
            style={{ fontWeight: 600, fontSize: '1.05rem', color: '#0f172a', textDecoration: 'none' }}
          >
            {rfp.title}
          </a>
          <div style={{ marginTop: '0.35rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {rfp.unit_count && (
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {rfp.unit_count} units
              </span>
            )}
            {rfp.state && (
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {rfp.state}
              </span>
            )}
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Created {created}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          <StatusBadge status={rfp.status} />
          <a href={`/rfps/${rfp.id}`} className="btn secondary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
            {rfp.status === 'finalized' ? 'View' : 'Edit'}
          </a>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>📄</div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
        Your board hasn&rsquo;t started an RFP yet
      </h2>
      <p style={{ color: '#64748b', maxWidth: '380px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
        Stop spending 40–80 hours sourcing bids. Generate a professional, state-compliant RFP in minutes — tailored to your community.
      </p>
      <a href="/intake" className="btn">
        Start an RFP
      </a>
    </div>
  );
}

export default async function RfpsPage() {
  const user = await getCurrentUser();
  const rfps = await listRfps(user.orgId);

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>RFPs</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>
            Community management bid requests generated from your intake data.
          </p>
        </div>
        {rfps.length > 0 && (
          <a href="/intake" className="btn" style={{ flexShrink: 0 }}>
            + New RFP
          </a>
        )}
      </div>

      {rfps.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          {rfps.map((rfp) => (
            <RfpCard key={rfp.id} rfp={rfp} />
          ))}
        </div>
      )}
    </main>
  );
}
