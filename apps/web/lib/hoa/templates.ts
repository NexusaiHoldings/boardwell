'use server';

/**
 * Template-library server actions (product-flywheel-001 Phase B canary).
 *
 * The library's content is repo-backed (lib/hoa/template-library.ts) and
 * renders server-side for anonymous visitors — no login wall before value.
 * This module records copy/download engagement into hoa_template_engagement
 * (DDL in packages/db/company/hoa.ts). Recording is best-effort: a DB
 * failure never blocks the user's copy or download.
 *
 * The earlier org-scoped hoa_template_versions read path was removed with
 * the page rewrite: it required login headers and per-org seeded rows, so
 * every visitor (and the functional-QA gate) saw an empty "Coming Soon"
 * library. The versions/downloads tables remain in the DDL for a future
 * org-uploaded-documents feature.
 */

import { Pool } from 'pg';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type EngagementAction = 'copy' | 'download';

export async function recordTemplateEngagement(
  templateSlug: string,
  action: EngagementAction,
): Promise<{ success: boolean }> {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const orgId = headersList.get('x-org-id');
    const userEmail =
      headersList.get('x-user-email') ?? headersList.get('x-forwarded-user');
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO hoa_template_engagement
           (template_slug, action, user_id, org_id, user_email)
         VALUES ($1, $2, $3, $4, $5)`,
        [templateSlug, action, userId, orgId, userEmail],
      );
    } finally {
      client.release();
    }
    return { success: true };
  } catch {
    // Best-effort telemetry — never block the user's copy/download.
    return { success: false };
  }
}
