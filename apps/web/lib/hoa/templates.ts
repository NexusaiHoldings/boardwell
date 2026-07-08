'use server';

import { Pool } from 'pg';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface TemplateVersion {
  id: string;
  org_id: string;
  state: string;
  statute_year: number;
  title: string;
  description: string | null;
  file_url: string | null;
  review_status: string;
  attorney_name: string | null;
  attorney_reviewed_at: string | null;
  version: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserContext {
  userId: string;
  orgId: string;
  userEmail: string;
}

export async function getCurrentUserContext(): Promise<UserContext | null> {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const orgId = headersList.get('x-org-id');
  const userEmail =
    headersList.get('x-user-email') ?? headersList.get('x-forwarded-user') ?? '';
  if (!userId || !orgId) return null;
  return { userId, orgId, userEmail };
}

export async function listTemplates(
  orgId: string,
): Promise<{ success: boolean; data?: TemplateVersion[]; error?: string }> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, org_id, state, statute_year, title, description, file_url,
              review_status, attorney_name,
              attorney_reviewed_at::text AS attorney_reviewed_at,
              version, is_active, created_by,
              created_at::text AS created_at,
              updated_at::text AS updated_at
       FROM hoa_template_versions
       WHERE org_id = $1 AND is_active = TRUE
       ORDER BY state ASC, statute_year DESC`,
      [orgId],
    );
    return { success: true, data: result.rows as TemplateVersion[] };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    client.release();
  }
}

export async function getTemplatesPageData(): Promise<{
  user: UserContext | null;
  templates: TemplateVersion[];
}> {
  const user = await getCurrentUserContext();
  if (!user) {
    return { user: null, templates: [] };
  }
  const result = await listTemplates(user.orgId);
  return { user, templates: result.data ?? [] };
}

export async function recordDownload(
  templateId: string,
  orgId: string,
  userId: string,
  userEmail: string,
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO hoa_template_downloads
         (template_id, org_id, user_id, user_email, disclaimer_acknowledged_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [templateId, orgId, userId, userEmail],
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    client.release();
  }
}
