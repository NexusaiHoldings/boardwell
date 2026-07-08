'use server';

import { Pool } from 'pg';
import { createBidToken } from '@/lib/hoa/access';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface InvitationRecord {
  id: string;
  rfp_id: string;
  token_id: string;
  company_name: string;
  company_email: string;
  status: string;
  invited_at: string;
  opened_at: string | null;
  submitted_at: string | null;
  declined_at: string | null;
  last_nudge_at: string | null;
  token: string;
  expires_at: string;
}

export interface BidSubmissionData {
  yearsInBusiness: number | null;
  companyDescription: string;
  camLicenseNumber: string;
  camLicenseState: string;
  camLicenseExpiry: string;
  generalLiabilityAmount: string;
  generalLiabilityExpiry: string;
  errorsOmissionsAmount: string;
  errorsOmissionsExpiry: string;
  fidelityBondAmount: string;
  insuranceCarrier: string;
  annualRevenue: string;
  portfolioUnitCount: number | null;
  managementFeeBase: string;
  managementFeeAdditional: string;
  references: Array<{ name: string; company: string; email: string; phone: string }>;
  selfReportedDisclaimerAcknowledged: boolean;
}

export interface TokenBidContext {
  invitation: InvitationRecord;
  rfpTitle: string;
  communityName: string | null;
}

export interface NudgeCandidate {
  invitationId: string;
  companyName: string;
  companyEmail: string;
  rfpTitle: string;
  token: string;
  expiresAt: string;
  daysLeft: number;
}

export async function listInvitations(rfpId: string, orgId: string): Promise<InvitationRecord[]> {
  const { rows: rfpRows } = await pool.query<{ org_id: string }>(
    `SELECT org_id FROM hoa_rfps WHERE id = $1`,
    [rfpId]
  );
  if (!rfpRows[0] || rfpRows[0].org_id !== orgId) return [];

  const { rows } = await pool.query<InvitationRecord>(
    `SELECT i.id, i.rfp_id, i.token_id, i.company_name, i.company_email,
            i.status,
            i.invited_at::text AS invited_at,
            i.opened_at::text AS opened_at,
            i.submitted_at::text AS submitted_at,
            i.declined_at::text AS declined_at,
            i.last_nudge_at::text AS last_nudge_at,
            bt.token, bt.expires_at::text AS expires_at
     FROM hoa_bid_invitations i
     JOIN hoa_bid_tokens bt ON bt.id = i.token_id
     WHERE i.rfp_id = $1
     ORDER BY i.invited_at DESC`,
    [rfpId]
  );
  return rows;
}

export async function createInvitation(
  rfpId: string,
  orgId: string,
  companyName: string,
  companyEmail: string
): Promise<{ success: boolean; error?: string }> {
  const { rows: rfpRows } = await pool.query<{ org_id: string; title: string }>(
    `SELECT org_id, title FROM hoa_rfps WHERE id = $1`,
    [rfpId]
  );
  if (!rfpRows[0] || rfpRows[0].org_id !== orgId) {
    return { success: false, error: 'RFP not found or access denied' };
  }

  const { rows: countRows } = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM hoa_bid_invitations WHERE rfp_id = $1`,
    [rfpId]
  );
  if (parseInt(countRows[0].cnt, 10) >= 10) {
    return { success: false, error: 'Maximum of 10 invitations allowed per RFP' };
  }

  const { rows: dupRows } = await pool.query<{ id: string }>(
    `SELECT id FROM hoa_bid_invitations WHERE rfp_id = $1 AND company_email = $2`,
    [rfpId, companyEmail.toLowerCase()]
  );
  if (dupRows.length > 0) {
    return { success: false, error: 'This email has already been invited' };
  }

  const token = await createBidToken(rfpId, companyName, companyEmail, 30);

  const { rows: tokenRows } = await pool.query<{ id: string }>(
    `SELECT id FROM hoa_bid_tokens WHERE token = $1`,
    [token]
  );
  const tokenId = tokenRows[0].id;

  await pool.query(
    `INSERT INTO hoa_bid_invitations (rfp_id, token_id, company_name, company_email, status)
     VALUES ($1, $2, $3, $4, 'invited')`,
    [rfpId, tokenId, companyName, companyEmail]
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://localhost:3000';
  const bidUrl = `${baseUrl}/bid/${token}`;
  await sendInvitationEmail(companyEmail, companyName, rfpRows[0].title, bidUrl);

  return { success: true };
}

export async function getInvitationForToken(token: string): Promise<TokenBidContext | null> {
  const { rows } = await pool.query<{
    invitation_id: string;
    rfp_id: string;
    token_id: string;
    company_name: string;
    company_email: string;
    status: string;
    invited_at: string;
    opened_at: string | null;
    submitted_at: string | null;
    declined_at: string | null;
    last_nudge_at: string | null;
    token: string;
    expires_at: string;
    rfp_title: string;
    community_name: string | null;
  }>(
    `SELECT i.id AS invitation_id, i.rfp_id, i.token_id,
            i.company_name, i.company_email, i.status,
            i.invited_at::text AS invited_at,
            i.opened_at::text AS opened_at,
            i.submitted_at::text AS submitted_at,
            i.declined_at::text AS declined_at,
            i.last_nudge_at::text AS last_nudge_at,
            bt.token, bt.expires_at::text AS expires_at,
            r.title AS rfp_title, r.community_name
     FROM hoa_bid_tokens bt
     JOIN hoa_bid_invitations i ON i.token_id = bt.id
     JOIN hoa_rfps r ON r.id = bt.rfp_id
     WHERE bt.token = $1 AND bt.expires_at > NOW()`,
    [token]
  );

  if (!rows[0]) return null;
  const row = rows[0];
  return {
    invitation: {
      id: row.invitation_id,
      rfp_id: row.rfp_id,
      token_id: row.token_id,
      company_name: row.company_name,
      company_email: row.company_email,
      status: row.status,
      invited_at: row.invited_at,
      opened_at: row.opened_at,
      submitted_at: row.submitted_at,
      declined_at: row.declined_at,
      last_nudge_at: row.last_nudge_at,
      token: row.token,
      expires_at: row.expires_at,
    },
    rfpTitle: row.rfp_title,
    communityName: row.community_name,
  };
}

export async function trackInvitationOpened(token: string): Promise<void> {
  await pool.query(
    `UPDATE hoa_bid_invitations
     SET status = CASE WHEN status = 'invited' THEN 'opened' ELSE status END,
         opened_at = CASE WHEN opened_at IS NULL THEN NOW() ELSE opened_at END,
         updated_at = NOW()
     WHERE token_id = (SELECT id FROM hoa_bid_tokens WHERE token = $1)`,
    [token]
  );
}

export async function submitBid(
  token: string,
  data: BidSubmissionData
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getInvitationForToken(token);
  if (!ctx) return { success: false, error: 'Invalid or expired token' };
  if (ctx.invitation.status === 'submitted') return { success: false, error: 'Bid already submitted' };
  if (ctx.invitation.status === 'declined') return { success: false, error: 'Invitation was declined' };

  const { invitation } = ctx;

  await pool.query(
    `INSERT INTO hoa_bid_submissions (
       invitation_id, rfp_id, company_name, company_email,
       years_in_business, company_description,
       cam_license_number, cam_license_state, cam_license_expiry,
       general_liability_amount, general_liability_expiry,
       errors_omissions_amount, errors_omissions_expiry,
       fidelity_bond_amount, insurance_carrier,
       annual_revenue, portfolio_unit_count,
       management_fee_base, management_fee_additional,
       references_json, self_reported_disclaimer_acknowledged
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [
      invitation.id,
      invitation.rfp_id,
      invitation.company_name,
      invitation.company_email,
      data.yearsInBusiness,
      data.companyDescription || null,
      data.camLicenseNumber || null,
      data.camLicenseState || null,
      data.camLicenseExpiry || null,
      data.generalLiabilityAmount || null,
      data.generalLiabilityExpiry || null,
      data.errorsOmissionsAmount || null,
      data.errorsOmissionsExpiry || null,
      data.fidelityBondAmount || null,
      data.insuranceCarrier || null,
      data.annualRevenue || null,
      data.portfolioUnitCount,
      data.managementFeeBase || null,
      data.managementFeeAdditional || null,
      JSON.stringify(data.references.filter((r) => r.name.trim().length > 0)),
      data.selfReportedDisclaimerAcknowledged,
    ]
  );

  await pool.query(
    `UPDATE hoa_bid_invitations
     SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [invitation.id]
  );

  await pool.query(`UPDATE hoa_bid_tokens SET used_at = NOW() WHERE token = $1`, [token]);

  return { success: true };
}

export async function declineInvitation(token: string): Promise<{ success: boolean; error?: string }> {
  const { rows } = await pool.query<{ id: string; status: string }>(
    `SELECT i.id, i.status
     FROM hoa_bid_invitations i
     JOIN hoa_bid_tokens bt ON bt.id = i.token_id
     WHERE bt.token = $1 AND bt.expires_at > NOW()`,
    [token]
  );
  if (!rows[0]) return { success: false, error: 'Invalid or expired token' };
  if (rows[0].status === 'submitted') return { success: false, error: 'Cannot decline after submission' };

  await pool.query(
    `UPDATE hoa_bid_invitations
     SET status = 'declined', declined_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [rows[0].id]
  );
  return { success: true };
}

export async function getInvitationsNeedingNudge(): Promise<NudgeCandidate[]> {
  const { rows } = await pool.query<{
    invitation_id: string;
    company_name: string;
    company_email: string;
    rfp_title: string;
    token: string;
    expires_at: string;
    days_until_expiry: string;
  }>(
    `SELECT i.id AS invitation_id, i.company_name, i.company_email,
            r.title AS rfp_title,
            bt.token, bt.expires_at::text AS expires_at,
            EXTRACT(DAY FROM (bt.expires_at - NOW()))::text AS days_until_expiry
     FROM hoa_bid_invitations i
     JOIN hoa_bid_tokens bt ON bt.id = i.token_id
     JOIN hoa_rfps r ON r.id = i.rfp_id
     WHERE i.status IN ('invited', 'opened')
       AND bt.expires_at > NOW()
       AND bt.expires_at <= NOW() + INTERVAL '4 days'
       AND (i.last_nudge_at IS NULL OR i.last_nudge_at < NOW() - INTERVAL '24 hours')`,
    []
  );

  return rows.map((row) => ({
    invitationId: row.invitation_id,
    companyName: row.company_name,
    companyEmail: row.company_email,
    rfpTitle: row.rfp_title,
    token: row.token,
    expiresAt: row.expires_at,
    daysLeft: Math.max(1, Math.round(parseFloat(row.days_until_expiry))),
  }));
}

export async function markNudgeSent(invitationId: string): Promise<void> {
  await pool.query(
    `UPDATE hoa_bid_invitations SET last_nudge_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [invitationId]
  );
}

export async function sendNudgeEmail(
  toEmail: string,
  companyName: string,
  rfpTitle: string,
  bidUrl: string,
  daysLeft: number
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || process.env.NOTIFICATIONS_FROM_EMAIL || 'noreply@hoaboard.app';
  if (!apiKey) return;

  const dayWord = daysLeft === 1 ? 'day' : 'days';
  const subject = `Reminder: ${daysLeft} ${dayWord} left to submit your bid — ${rfpTitle}`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>Bid Submission Deadline Approaching</h2>
    <p>Dear ${companyName},</p>
    <p>This is a reminder that your bid for <strong>${rfpTitle}</strong> is due in <strong>${daysLeft} ${dayWord}</strong>.</p>
    <p style="margin:2rem 0">
      <a href="${bidUrl}" style="background:#1e40af;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600">
        Complete Your Bid Submission
      </a>
    </p>
    <p>Or copy and paste: <a href="${bidUrl}">${bidUrl}</a></p>
    <p style="color:#64748b;font-size:0.85rem">If you do not wish to bid, you may decline using the link in your original invitation email.</p>
  </div>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html }),
    });
  } catch {
    // Non-fatal — nudge failure is logged by cron handler
  }
}

async function sendInvitationEmail(
  toEmail: string,
  companyName: string,
  rfpTitle: string,
  bidUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || process.env.NOTIFICATIONS_FROM_EMAIL || 'noreply@hoaboard.app';
  if (!apiKey) return;

  const subject = `You've been invited to submit a bid: ${rfpTitle}`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>Bid Invitation: ${rfpTitle}</h2>
    <p>Dear ${companyName},</p>
    <p>The board of directors has invited your company to submit a proposal for:</p>
    <p><strong>${rfpTitle}</strong></p>
    <p>Use the secure link below to access your personalized bid submission form. This link is unique to your company and expires in 30 days.</p>
    <p style="margin:2rem 0">
      <a href="${bidUrl}" style="background:#1e40af;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600">
        Submit Your Bid
      </a>
    </p>
    <p>Or copy and paste: <a href="${bidUrl}">${bidUrl}</a></p>
    <p style="color:#64748b;font-size:0.85rem">This invitation is confidential and intended only for ${companyName}. Do not share this link.</p>
  </div>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html }),
    });
  } catch {
    // Non-fatal — invitation record is still created
  }
}
