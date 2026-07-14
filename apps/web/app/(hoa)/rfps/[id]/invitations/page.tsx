import { listInvitations, createInvitation, InvitationRecord } from '@/lib/hoa/invitations';
import { getCurrentUserContext } from '@/lib/hoa/access';
import { redirect } from 'next/navigation';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface PageProps {
  params: { id: string };
  searchParams: { error?: string; success?: string; invite_name?: string; invite_email?: string };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  invited: { label: 'Invited', bg: '#dbeafe', color: '#1e40af' },
  opened: { label: 'Opened', bg: '#fef3c7', color: '#92400e' },
  submitted: { label: 'Submitted', bg: '#d1fae5', color: '#065f46' },
  declined: { label: 'Declined', bg: '#fee2e2', color: '#991b1b' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#f1f5f9', color: '#374151' };
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.2rem 0.65rem',
        borderRadius: 99,
        background: cfg.bg,
        color: cfg.color,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

function InvitationCard({ inv }: { inv: InvitationRecord }) {
  const invitedDate = new Date(inv.invited_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const expiresDate = new Date(inv.expires_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isExpired = new Date(inv.expires_at) < new Date();

  return (
    <div
      className="inv-card card"
      style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#0f172a', marginBottom: '0.2rem' }}>
          {inv.company_name}
        </div>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          {inv.company_email}
        </div>
        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            Invited {invitedDate}
          </span>
          <span
            className="muted"
            style={{ fontSize: '0.8rem', color: isExpired && inv.status !== 'submitted' ? '#dc2626' : undefined }}
          >
            {isExpired && inv.status !== 'submitted' ? 'Link expired' : `Expires ${expiresDate}`}
          </span>
          {inv.submitted_at && (
            <span className="muted" style={{ fontSize: '0.8rem', color: '#059669' }}>
              Submitted{' '}
              {new Date(inv.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
        <StatusPill status={inv.status} />
        {inv.status !== 'submitted' && inv.status !== 'declined' && !isExpired && (
          <a
            href={`/bid/${inv.token}`}
            className="inv-action btn secondary"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
          >
            Preview
          </a>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty" style={{ marginTop: '2rem' }}>
      <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '1rem' }}>📬</div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
        No vendors invited yet
      </h2>
      <p style={{ color: '#64748b', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
        Invite up to 10 management companies to submit bids. Each company receives a secure, personalized link — no account required.
      </p>
    </div>
  );
}

function SummaryBar({ invitations }: { invitations: InvitationRecord[] }) {
  const counts = invitations.reduce<Record<string, number>>(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const pills: Array<{ status: string; count: number }> = Object.entries(counts).map(([status, count]) => ({
    status,
    count,
  }));

  if (pills.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      {pills.map(({ status, count }) => {
        const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#f1f5f9', color: '#374151' };
        return (
          <span
            key={status}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              padding: '0.3rem 0.8rem',
              borderRadius: 99,
              background: cfg.bg,
              color: cfg.color,
            }}
          >
            <span style={{ fontWeight: 700 }}>{count}</span>
            {cfg.label}
          </span>
        );
      })}
      <span className="muted" style={{ fontSize: '0.85rem', alignSelf: 'center' }}>
        {invitations.length}/10 slots used
      </span>
    </div>
  );
}

export default async function InvitationsPage({ params, searchParams }: PageProps) {
  const { orgId } = await getCurrentUserContext();

  // Fetch RFP title for display
  const { rows: rfpRows } = await pool.query<{ title: string; org_id: string }>(
    `SELECT title, org_id FROM hoa_rfps WHERE id = $1`,
    [params.id]
  );
  const rfp = rfpRows[0];

  if (!rfp || rfp.org_id !== orgId) {
    return (
      <main>
        <div className="empty">
          <p style={{ color: '#dc2626' }}>RFP not found or access denied.</p>
          <a href="/rfps" className="btn secondary">← Back to RFPs</a>
        </div>
      </main>
    );
  }

  const invitations = await listInvitations(params.id, orgId);
  const canInvite = invitations.length < 10;
  const errorMsg = searchParams.error ? decodeURIComponent(searchParams.error) : null;
  const showSuccess = searchParams.success === '1';
  // Directory hand-off: /directory "Invite to an RFP" pre-fills this form.
  const inviteName = (searchParams.invite_name ?? '').slice(0, 200);
  const inviteEmail = (searchParams.invite_email ?? '').slice(0, 200);

  async function handleInvite(formData: FormData) {
    'use server';
    const { orgId: org } = await getCurrentUserContext();
    const companyName = ((formData.get('company_name') as string | null) ?? '').trim();
    const companyEmail = ((formData.get('company_email') as string | null) ?? '').trim();

    if (!companyName || !companyEmail) {
      redirect(`/rfps/${params.id}/invitations?error=${encodeURIComponent('Company name and email are required')}`);
    }

    const result = await createInvitation(params.id, org, companyName, companyEmail);
    if (!result.success) {
      redirect(`/rfps/${params.id}/invitations?error=${encodeURIComponent(result.error ?? 'Failed to send invitation')}`);
    }
    redirect(`/rfps/${params.id}/invitations?success=1`);
  }

  return (
    <main>
      <style>{`
        .inv-card { transition: box-shadow 0.18s, transform 0.18s; }
        .inv-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.11); transform: translateY(-1px); }
        .inv-action { transition: opacity 0.15s, background 0.15s; }
        .inv-action:hover { opacity: 1 !important; }
        @media (max-width: 600px) {
          .invite-form-row { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <a href={`/rfps/${params.id}`} style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none' }}>
            ← {rfp.title}
          </a>
          <h1 style={{ margin: '0.35rem 0 0' }}>Invitation Tracker</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>
            Manage bid invitations — up to 10 management companies per RFP.
          </p>
        </div>
      </div>

      {showSuccess && (
        <div
          className="card"
          style={{ marginTop: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <p style={{ margin: 0, color: '#065f46', fontWeight: 500 }}>
            ✓ Invitation sent — the company will receive an email with their secure bid link.
          </p>
        </div>
      )}

      {errorMsg && (
        <div
          className="card"
          style={{ marginTop: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}
        >
          <p style={{ margin: 0, color: '#991b1b' }}>⚠ {errorMsg}</p>
        </div>
      )}

      {canInvite && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Invite a Management Company</h2>
          <form action={handleInvite}>
            <div
              className="invite-form-row"
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label htmlFor="company_name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Company Name
                </label>
                <input
                  id="company_name"
                  name="company_name"
                  defaultValue={inviteName}
                  type="text"
                  required
                  placeholder="Acme Property Management"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label htmlFor="company_email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Contact Email
                </label>
                <input
                  id="company_email"
                  name="company_email"
                  defaultValue={inviteEmail}
                  type="email"
                  required
                  placeholder="bids@acmepm.com"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                Send Invitation
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              The company will receive a secure, single-use link to submit their proposal. No account required.
            </p>
          </form>
        </div>
      )}

      {!canInvite && (
        <div className="card" style={{ marginTop: '1.5rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
          <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
            Maximum of 10 invitations reached for this RFP.
          </p>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        {invitations.length > 0 && <SummaryBar invitations={invitations} />}
        {invitations.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>
              Invited Companies
            </h2>
            {invitations.map((inv) => (
              <InvitationCard key={inv.id} inv={inv} />
            ))}
          </>
        )}
      </div>
    </main>
  );
}
