'use server';

import { Pool } from 'pg';
import crypto from 'crypto';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface BidTokenRecord {
  id: string;
  rfp_id: string;
  org_id: string;
  token: string;
  company_name: string;
  company_email: string;
  expires_at: string;
}

export interface UserContext {
  userId: string;
  orgId: string;
  email: string;
}

export async function getCurrentUserContext(): Promise<UserContext> {
  try {
    const hdrs = headers();
    const userId = hdrs.get('x-user-id') ?? hdrs.get('x-forwarded-user') ?? 'anonymous';
    const orgId = hdrs.get('x-org-id') ?? hdrs.get('x-forwarded-org') ?? 'default-org';
    const email = hdrs.get('x-user-email') ?? 'user@example.com';
    return { userId, orgId, email };
  } catch {
    return { userId: 'anonymous', orgId: 'default-org', email: 'user@example.com' };
  }
}

export async function generateBidToken(): Promise<string> {
  return crypto.randomBytes(32).toString('hex');
}

export async function verifyBidToken(token: string): Promise<BidTokenRecord | null> {
  const { rows } = await pool.query<BidTokenRecord>(
    `SELECT bt.id, bt.rfp_id, bt.token, bt.company_name, bt.company_email,
            bt.expires_at::text AS expires_at, r.org_id
     FROM hoa_bid_tokens bt
     JOIN hoa_rfps r ON r.id = bt.rfp_id
     WHERE bt.token = $1
       AND bt.expires_at > NOW()
       AND bt.used_at IS NULL`,
    [token]
  );
  return rows[0] ?? null;
}

export async function markBidTokenUsed(token: string): Promise<void> {
  await pool.query(
    `UPDATE hoa_bid_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );
}

export async function createBidToken(
  rfpId: string,
  companyName: string,
  companyEmail: string,
  expiresInDays: number = 30
): Promise<string> {
  const token = await generateBidToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await pool.query(
    `INSERT INTO hoa_bid_tokens (rfp_id, token, company_name, company_email, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [rfpId, token, companyName, companyEmail, expiresAt.toISOString()]
  );
  return token;
}

export async function assertBoardAccess(rfpId: string, orgId: string): Promise<boolean> {
  const { rows } = await pool.query<{ org_id: string }>(
    `SELECT org_id FROM hoa_rfps WHERE id = $1`,
    [rfpId]
  );
  if (!rows[0]) return false;
  return rows[0].org_id === orgId;
}
