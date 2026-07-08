'use server';

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface VerificationQueueItem {
  submission_id: string;
  rfp_id: string;
  org_id: string;
  company_name: string;
  company_email: string;
  rfp_title: string;
  submitted_at: string;
  cam_license_number: string | null;
  cam_license_state: string | null;
  cam_license_expiry: string | null;
  cam_license_url: string | null;
  general_liability_expiry: string | null;
  errors_omissions_expiry: string | null;
  insurance_cert_url: string | null;
  extraction_status: string | null;
  low_confidence_fields: number;
  priority: 'critical' | 'high' | 'normal';
  severity_reason: string;
  already_reviewed: boolean;
  review_action: string | null;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function computePriority(row: {
  general_liability_expiry: string | null;
  errors_omissions_expiry: string | null;
  cam_license_expiry: string | null;
  cam_license_number: string | null;
  low_confidence_fields: number;
}): { priority: 'critical' | 'high' | 'normal'; severity_reason: string } {
  const glDays = daysUntil(row.general_liability_expiry);
  const eoDays = daysUntil(row.errors_omissions_expiry);
  const camDays = daysUntil(row.cam_license_expiry);

  const insuranceDays = ([glDays, eoDays].filter((d) => d !== null) as number[]);
  const soonest = insuranceDays.length > 0 ? Math.min(...insuranceDays) : null;

  if (soonest !== null && soonest <= 30) {
    return {
      priority: 'critical',
      severity_reason: `Insurance expires in ${soonest} day${soonest === 1 ? '' : 's'}`,
    };
  }
  if (soonest !== null && soonest <= 90) {
    return {
      priority: 'high',
      severity_reason: `Insurance expires in ${soonest} days`,
    };
  }
  if (camDays !== null && camDays <= 60) {
    return {
      priority: 'high',
      severity_reason: `CAM license expires in ${camDays} days`,
    };
  }
  if (row.low_confidence_fields > 0) {
    return {
      priority: 'high',
      severity_reason: `${row.low_confidence_fields} field${row.low_confidence_fields === 1 ? '' : 's'} need manual review`,
    };
  }
  if (!row.cam_license_number) {
    return { priority: 'high', severity_reason: 'CAM license not provided' };
  }
  return { priority: 'normal', severity_reason: 'Standard credential verification' };
}

export async function getVerificationQueue(): Promise<VerificationQueueItem[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        bs.id AS submission_id,
        bs.rfp_id,
        bs.company_name,
        bs.company_email,
        bs.cam_license_number,
        bs.cam_license_state,
        bs.cam_license_expiry,
        bs.cam_license_url,
        bs.general_liability_expiry,
        bs.errors_omissions_expiry,
        bs.insurance_cert_url,
        bs.submitted_at::text AS submitted_at,
        r.title AS rfp_title,
        r.org_id,
        be.status AS extraction_status,
        COALESCE(
          (SELECT COUNT(*)::int FROM hoa_extraction_fields ef
           JOIN hoa_bid_extractions ex ON ex.id = ef.extraction_id
           WHERE ex.bid_submission_id = bs.id
             AND ef.confidence < 0.7
             AND NOT ef.human_reviewed),
          0
        ) AS low_confidence_fields,
        vr.action AS review_action,
        (vr.id IS NOT NULL) AS already_reviewed
      FROM hoa_bid_submissions bs
      JOIN hoa_rfps r ON r.id = bs.rfp_id
      LEFT JOIN hoa_bid_extractions be ON be.bid_submission_id = bs.id
      LEFT JOIN hoa_verification_reviews vr ON vr.bid_submission_id = bs.id
      ORDER BY bs.submitted_at DESC
    `);

    const priorityRank: Record<string, number> = { critical: 0, high: 1, normal: 2 };

    const items: VerificationQueueItem[] = result.rows.map((row) => {
      const { priority, severity_reason } = computePriority({
        general_liability_expiry: row.general_liability_expiry,
        errors_omissions_expiry: row.errors_omissions_expiry,
        cam_license_expiry: row.cam_license_expiry,
        cam_license_number: row.cam_license_number,
        low_confidence_fields: Number(row.low_confidence_fields),
      });
      return {
        submission_id: row.submission_id,
        rfp_id: row.rfp_id,
        org_id: row.org_id,
        company_name: row.company_name,
        company_email: row.company_email,
        rfp_title: row.rfp_title,
        submitted_at: row.submitted_at,
        cam_license_number: row.cam_license_number,
        cam_license_state: row.cam_license_state,
        cam_license_expiry: row.cam_license_expiry,
        cam_license_url: row.cam_license_url,
        general_liability_expiry: row.general_liability_expiry,
        errors_omissions_expiry: row.errors_omissions_expiry,
        insurance_cert_url: row.insurance_cert_url,
        extraction_status: row.extraction_status,
        low_confidence_fields: Number(row.low_confidence_fields),
        priority,
        severity_reason,
        already_reviewed: Boolean(row.already_reviewed),
        review_action: row.review_action ?? null,
      };
    });

    items.sort((a, b) => {
      if (a.already_reviewed !== b.already_reviewed) return a.already_reviewed ? 1 : -1;
      return priorityRank[a.priority] - priorityRank[b.priority];
    });

    return items;
  } finally {
    client.release();
  }
}

export async function submitVerificationReview(
  bidSubmissionId: string,
  rfpId: string,
  reviewerId: string,
  reviewerEmail: string,
  action: 'approve' | 'reject',
  notes: string | null,
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const badgeGranted = action === 'approve';

    await client.query(
      `INSERT INTO hoa_verification_reviews
         (bid_submission_id, rfp_id, reviewer_id, reviewer_email, action, notes, badge_granted)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (bid_submission_id) DO UPDATE SET
         reviewer_id = EXCLUDED.reviewer_id,
         reviewer_email = EXCLUDED.reviewer_email,
         action = EXCLUDED.action,
         notes = EXCLUDED.notes,
         badge_granted = EXCLUDED.badge_granted,
         updated_at = NOW()`,
      [bidSubmissionId, rfpId, reviewerId, reviewerEmail, action, notes, badgeGranted],
    );

    await client.query(
      `INSERT INTO hoa_score_audit_log
         (rfp_id, org_id, actor_id, actor_email, action, payload)
       SELECT $1, r.org_id, $2, $3, $4, $5::jsonb
       FROM hoa_rfps r WHERE r.id = $1`,
      [
        rfpId,
        reviewerId,
        reviewerEmail,
        `verification_${action}`,
        JSON.stringify({ bid_submission_id: bidSubmissionId, notes }),
      ],
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: String(err) };
  } finally {
    client.release();
  }
}

export async function stripExpiredBadges(): Promise<{ count: number; error?: string }> {
  const client = await pool.connect();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await client.query(
      `UPDATE hoa_verification_reviews vr
       SET badge_granted = FALSE, updated_at = NOW()
       FROM hoa_bid_submissions bs
       WHERE vr.bid_submission_id = bs.id
         AND vr.badge_granted = TRUE
         AND (
           (bs.general_liability_expiry IS NOT NULL
            AND bs.general_liability_expiry != ''
            AND bs.general_liability_expiry < $1)
           OR (bs.errors_omissions_expiry IS NOT NULL
               AND bs.errors_omissions_expiry != ''
               AND bs.errors_omissions_expiry < $1)
           OR (bs.cam_license_expiry IS NOT NULL
               AND bs.cam_license_expiry != ''
               AND bs.cam_license_expiry < $1)
         )`,
      [today],
    );
    return { count: result.rowCount ?? 0 };
  } catch (err) {
    return { count: 0, error: String(err) };
  } finally {
    client.release();
  }
}
