'use server';

import { Pool } from 'pg';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Types ──────────────────────────────────────────────────────────────────

export interface ScoringRubric {
  id: string;
  rfp_id: string;
  org_id: string;
  weight_price: number;
  weight_cam_license: number;
  weight_portfolio_size: number;
  weight_insurance: number;
  weight_references: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoringWeights {
  price: number;
  cam_license: number;
  portfolio_size: number;
  insurance: number;
  references: number;
}

export interface BidFieldData {
  value: string | null;
  confidence: number;
  human_reviewed: boolean;
  accepted_value: string | null;
}

export interface BidScoringData {
  submission_id: string;
  company_name: string;
  company_email: string;
  submitted_at: string;
  extraction_id: string | null;
  extraction_status: string | null;
  management_fee_base: string | null;
  portfolio_unit_count: number | null;
  cam_license_number: string | null;
  cam_license_state: string | null;
  cam_license_expiry: string | null;
  general_liability_amount: string | null;
  general_liability_expiry: string | null;
  errors_omissions_amount: string | null;
  fidelity_bond_amount: string | null;
  references_json: string | null;
  fields: Record<string, BidFieldData>;
}

export interface ScoreOverrideRow {
  id: string;
  bid_submission_id: string;
  dimension: string;
  override_score: number;
  override_note: string | null;
  overridden_by: string;
  overridden_at: string;
}

export interface DashboardData {
  rubric: ScoringRubric;
  bids: BidScoringData[];
  overrides: ScoreOverrideRow[];
}

// ── Auth context ────────────────────────────────────────────────────────────

async function getUserContext(): Promise<{ userId: string; orgId: string; email: string }> {
  const hdrs = await headers();
  return {
    userId: hdrs.get('x-user-id') ?? 'anonymous',
    orgId: hdrs.get('x-org-id') ?? 'default-org',
    email: hdrs.get('x-user-email') ?? 'user@example.com',
  };
}

// ── Rubric CRUD ─────────────────────────────────────────────────────────────

export async function getRubricForRfp(
  rfpId: string,
  orgId: string,
): Promise<ScoringRubric | null> {
  const rfpCheck = await pool.query<{ org_id: string }>(
    `SELECT org_id FROM hoa_rfps WHERE id = $1`,
    [rfpId],
  );
  if (!rfpCheck.rows[0] || rfpCheck.rows[0].org_id !== orgId) return null;

  const existing = await pool.query<ScoringRubric>(
    `SELECT id, rfp_id, org_id,
            weight_price, weight_cam_license, weight_portfolio_size,
            weight_insurance, weight_references,
            created_by, updated_by,
            created_at::text AS created_at, updated_at::text AS updated_at
     FROM hoa_scoring_rubrics WHERE rfp_id = $1`,
    [rfpId],
  );
  if (existing.rows[0]) return existing.rows[0];

  const { userId } = await getUserContext();
  const created = await pool.query<ScoringRubric>(
    `INSERT INTO hoa_scoring_rubrics
       (rfp_id, org_id, weight_price, weight_cam_license, weight_portfolio_size,
        weight_insurance, weight_references, created_by)
     VALUES ($1, $2, 0.25, 0.20, 0.20, 0.20, 0.15, $3)
     RETURNING id, rfp_id, org_id,
               weight_price, weight_cam_license, weight_portfolio_size,
               weight_insurance, weight_references,
               created_by, updated_by,
               created_at::text AS created_at, updated_at::text AS updated_at`,
    [rfpId, orgId, userId],
  );
  return created.rows[0] ?? null;
}

export async function updateRubricWeights(
  rfpId: string,
  weights: ScoringWeights,
): Promise<{ success: boolean; error?: string; rubric?: ScoringRubric }> {
  try {
    const { userId, orgId, email } = await getUserContext();

    const rfpCheck = await pool.query<{ org_id: string }>(
      `SELECT org_id FROM hoa_rfps WHERE id = $1`,
      [rfpId],
    );
    if (!rfpCheck.rows[0] || rfpCheck.rows[0].org_id !== orgId) {
      return { success: false, error: 'Not found or access denied' };
    }

    const total =
      weights.price + weights.cam_license + weights.portfolio_size +
      weights.insurance + weights.references;
    if (total <= 0) return { success: false, error: 'Weights must sum to a positive value' };

    const norm = {
      price: weights.price / total,
      cam_license: weights.cam_license / total,
      portfolio_size: weights.portfolio_size / total,
      insurance: weights.insurance / total,
      references: weights.references / total,
    };

    const updated = await pool.query<ScoringRubric>(
      `INSERT INTO hoa_scoring_rubrics
         (rfp_id, org_id, weight_price, weight_cam_license, weight_portfolio_size,
          weight_insurance, weight_references, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       ON CONFLICT (rfp_id) DO UPDATE
         SET weight_price = EXCLUDED.weight_price,
             weight_cam_license = EXCLUDED.weight_cam_license,
             weight_portfolio_size = EXCLUDED.weight_portfolio_size,
             weight_insurance = EXCLUDED.weight_insurance,
             weight_references = EXCLUDED.weight_references,
             updated_by = $8,
             updated_at = NOW()
       RETURNING id, rfp_id, org_id,
                 weight_price, weight_cam_license, weight_portfolio_size,
                 weight_insurance, weight_references,
                 created_by, updated_by,
                 created_at::text AS created_at, updated_at::text AS updated_at`,
      [rfpId, orgId, norm.price, norm.cam_license, norm.portfolio_size, norm.insurance, norm.references, userId],
    );

    await pool.query(
      `INSERT INTO hoa_score_audit_log (rfp_id, org_id, actor_id, actor_email, action, payload)
       VALUES ($1, $2, $3, $4, 'update_weights', $5::jsonb)`,
      [rfpId, orgId, userId, email, JSON.stringify({ weights: norm })],
    );

    return { success: true, rubric: updated.rows[0] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Dashboard data ──────────────────────────────────────────────────────────

export async function getScoringDashboardData(
  rfpId: string,
  orgId: string,
): Promise<{ success: boolean; error?: string; data?: DashboardData }> {
  try {
    const rfpCheck = await pool.query<{ org_id: string }>(
      `SELECT org_id FROM hoa_rfps WHERE id = $1`,
      [rfpId],
    );
    if (!rfpCheck.rows[0] || rfpCheck.rows[0].org_id !== orgId) {
      return { success: false, error: 'Not found or access denied' };
    }

    const rubric = await getRubricForRfp(rfpId, orgId);
    if (!rubric) return { success: false, error: 'Failed to load rubric' };

    const subsRes = await pool.query<{
      id: string;
      company_name: string;
      company_email: string;
      submitted_at: string;
      management_fee_base: string | null;
      portfolio_unit_count: number | null;
      cam_license_number: string | null;
      cam_license_state: string | null;
      cam_license_expiry: string | null;
      general_liability_amount: string | null;
      general_liability_expiry: string | null;
      errors_omissions_amount: string | null;
      fidelity_bond_amount: string | null;
      references_json: string | null;
    }>(
      `SELECT s.id, s.company_name, s.company_email,
              s.submitted_at::text AS submitted_at,
              s.management_fee_base, s.portfolio_unit_count,
              s.cam_license_number, s.cam_license_state, s.cam_license_expiry,
              s.general_liability_amount, s.general_liability_expiry,
              s.errors_omissions_amount, s.fidelity_bond_amount,
              s.references_json
       FROM hoa_bid_submissions s
       WHERE s.rfp_id = $1
       ORDER BY s.submitted_at ASC`,
      [rfpId],
    );

    const bids: BidScoringData[] = await Promise.all(
      subsRes.rows.map(async (row) => {
        const extRes = await pool.query<{ id: string; status: string }>(
          `SELECT id, status FROM hoa_bid_extractions
           WHERE bid_submission_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [row.id],
        );
        const ext = extRes.rows[0] ?? null;

        const fields: Record<string, BidFieldData> = {};
        if (ext) {
          const fieldsRes = await pool.query<{
            field_key: string;
            extracted_value: string | null;
            confidence: number;
            human_reviewed: boolean;
            accepted_value: string | null;
          }>(
            `SELECT field_key, extracted_value, confidence, human_reviewed, accepted_value
             FROM hoa_extraction_fields WHERE extraction_id = $1`,
            [ext.id],
          );
          for (const f of fieldsRes.rows) {
            fields[f.field_key] = {
              value: f.extracted_value,
              confidence: f.confidence,
              human_reviewed: f.human_reviewed,
              accepted_value: f.accepted_value,
            };
          }
        }

        return {
          submission_id: row.id,
          company_name: row.company_name,
          company_email: row.company_email,
          submitted_at: row.submitted_at,
          extraction_id: ext?.id ?? null,
          extraction_status: ext?.status ?? null,
          management_fee_base: row.management_fee_base,
          portfolio_unit_count: row.portfolio_unit_count,
          cam_license_number: row.cam_license_number,
          cam_license_state: row.cam_license_state,
          cam_license_expiry: row.cam_license_expiry,
          general_liability_amount: row.general_liability_amount,
          general_liability_expiry: row.general_liability_expiry,
          errors_omissions_amount: row.errors_omissions_amount,
          fidelity_bond_amount: row.fidelity_bond_amount,
          references_json: row.references_json,
          fields,
        };
      }),
    );

    const overridesRes = await pool.query<ScoreOverrideRow>(
      `SELECT o.id, o.bid_submission_id, o.dimension,
              o.override_score, o.override_note,
              o.overridden_by, o.overridden_at::text AS overridden_at
       FROM hoa_score_overrides o
       JOIN hoa_scoring_rubrics r ON r.id = o.rubric_id
       WHERE r.rfp_id = $1`,
      [rfpId],
    );

    return { success: true, data: { rubric, bids, overrides: overridesRes.rows } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Score overrides ─────────────────────────────────────────────────────────

export async function saveScoreOverride(
  rfpId: string,
  bidSubmissionId: string,
  dimension: string,
  overrideScore: number,
  overrideNote: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, orgId, email } = await getUserContext();

    if (overrideScore < 0 || overrideScore > 100) {
      return { success: false, error: 'Score must be 0–100' };
    }

    const rfpCheck = await pool.query<{ org_id: string }>(
      `SELECT org_id FROM hoa_rfps WHERE id = $1`,
      [rfpId],
    );
    if (!rfpCheck.rows[0] || rfpCheck.rows[0].org_id !== orgId) {
      return { success: false, error: 'Not found or access denied' };
    }

    const rubricRes = await pool.query<{ id: string }>(
      `SELECT id FROM hoa_scoring_rubrics WHERE rfp_id = $1`,
      [rfpId],
    );
    if (!rubricRes.rows[0]) return { success: false, error: 'Rubric not found' };
    const rubricId = rubricRes.rows[0].id;

    await pool.query(
      `INSERT INTO hoa_score_overrides
         (rubric_id, bid_submission_id, rfp_id, dimension, override_score, override_note, overridden_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (rubric_id, bid_submission_id, dimension) DO UPDATE
         SET override_score = EXCLUDED.override_score,
             override_note = EXCLUDED.override_note,
             overridden_by = EXCLUDED.overridden_by,
             overridden_at = NOW()`,
      [rubricId, bidSubmissionId, rfpId, dimension, overrideScore, overrideNote || null, userId],
    );

    await pool.query(
      `INSERT INTO hoa_score_audit_log (rfp_id, org_id, actor_id, actor_email, action, payload)
       VALUES ($1, $2, $3, $4, 'override_score', $5::jsonb)`,
      [
        rfpId, orgId, userId, email,
        JSON.stringify({ bid_submission_id: bidSubmissionId, dimension, score: overrideScore }),
      ],
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function removeScoreOverride(
  rfpId: string,
  bidSubmissionId: string,
  dimension: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, orgId, email } = await getUserContext();

    const rfpCheck = await pool.query<{ org_id: string }>(
      `SELECT org_id FROM hoa_rfps WHERE id = $1`,
      [rfpId],
    );
    if (!rfpCheck.rows[0] || rfpCheck.rows[0].org_id !== orgId) {
      return { success: false, error: 'Not found or access denied' };
    }

    await pool.query(
      `DELETE FROM hoa_score_overrides
       WHERE rfp_id = $1 AND bid_submission_id = $2 AND dimension = $3`,
      [rfpId, bidSubmissionId, dimension],
    );

    await pool.query(
      `INSERT INTO hoa_score_audit_log (rfp_id, org_id, actor_id, actor_email, action, payload)
       VALUES ($1, $2, $3, $4, 'reset_override', $5::jsonb)`,
      [
        rfpId, orgId, userId, email,
        JSON.stringify({ bid_submission_id: bidSubmissionId, dimension }),
      ],
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
