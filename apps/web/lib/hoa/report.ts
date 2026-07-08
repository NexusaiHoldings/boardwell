'use server';

import { Pool } from 'pg';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const LIABILITY_DISCLAIMER =
  'DISCLAIMER: This report is a decision-support tool only. ' +
  'Scores and rankings are generated from submitted bid data and configured rubric weights. ' +
  'Final selection decisions are solely the responsibility of the board. ' +
  'This report does not constitute legal, financial, or professional advice. ' +
  'Verify all credentials independently before executing any management contract.';

// ── Types ──────────────────────────────────────────────────────────────────

export type Dimension = 'price' | 'cam_license' | 'portfolio_size' | 'insurance' | 'references';

export interface DimScore {
  raw: number;
  weighted: number;
  is_override: boolean;
  override_note: string | null;
  verified: boolean;
}

export interface BidSnapshot {
  submission_id: string;
  company_name: string;
  company_email: string;
  submitted_at: string;
  composite_score: number;
  rank: number;
  management_fee: string | null;
  cam_license_number: string | null;
  cam_license_state: string | null;
  cam_license_expiry: string | null;
  verification_badge: boolean;
  portfolio_unit_count: number | null;
  years_in_business: number | null;
  scores: Record<Dimension, DimScore>;
}

export interface ReportWeights {
  price: number;
  cam_license: number;
  portfolio_size: number;
  insurance: number;
  references: number;
}

export interface ReportSnapshot {
  rfp_title: string;
  community_name: string | null;
  generated_at: string;
  weights: ReportWeights;
  bids: BidSnapshot[];
  disclaimer: string;
}

export interface DecisionReport {
  id: string;
  rfp_id: string;
  org_id: string;
  generated_by: string;
  generated_by_email: string;
  snapshot_json: ReportSnapshot;
  pdf_url: string | null;
  emailed_at: string | null;
  email_recipients: string[];
  disclaimer_text: string;
  created_at: string;
}

// ── Internal scoring types ─────────────────────────────────────────────────

interface RawBidData {
  submission_id: string;
  company_name: string;
  company_email: string;
  submitted_at: string;
  years_in_business: number | null;
  portfolio_unit_count: number | null;
  cam_license_number: string | null;
  cam_license_state: string | null;
  cam_license_expiry: string | null;
  general_liability_amount: string | null;
  general_liability_expiry: string | null;
  errors_omissions_amount: string | null;
  fidelity_bond_amount: string | null;
  management_fee_base: string | null;
  references_json: string | null;
  fields: Record<string, { value: string | null; accepted_value: string | null; human_reviewed: boolean }>;
  verification_badge: boolean;
}

// ── Internal score helpers ─────────────────────────────────────────────────

function parseDollarAmount(s: string | null | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getFieldValue(bid: RawBidData, key: string): string | null {
  const f = bid.fields[key];
  if (!f) return null;
  return f.accepted_value ?? f.value;
}

function isFieldVerified(bid: RawBidData, key: string): boolean {
  return bid.fields[key]?.human_reviewed === true;
}

function scoreCamLicense(bid: RawBidData): { score: number; verified: boolean } {
  let score = 0;
  const licNum = getFieldValue(bid, 'cam_license_number') ?? bid.cam_license_number;
  if (licNum) score += 40;
  const expiry = parseDate(getFieldValue(bid, 'cam_license_expiry') ?? bid.cam_license_expiry);
  if (expiry && expiry > new Date()) score += 40;
  const state = getFieldValue(bid, 'cam_license_state') ?? bid.cam_license_state;
  if (state) score += 20;
  const verified =
    isFieldVerified(bid, 'cam_license_number') || isFieldVerified(bid, 'cam_license_expiry');
  return { score: Math.min(score, 100), verified };
}

function scorePortfolioSize(bid: RawBidData): { score: number; verified: boolean } {
  const raw = getFieldValue(bid, 'portfolio_unit_count');
  const countStr = raw ?? (bid.portfolio_unit_count != null ? String(bid.portfolio_unit_count) : null);
  const count = countStr ? parseInt(countStr, 10) : 0;
  let score = 0;
  if (count >= 5000) score = 100;
  else if (count >= 2500) score = 90;
  else if (count >= 1000) score = 75;
  else if (count >= 500) score = 60;
  else if (count >= 100) score = 40;
  else if (count > 0) score = 20;
  return { score, verified: isFieldVerified(bid, 'portfolio_unit_count') };
}

function scoreInsurance(bid: RawBidData): { score: number; verified: boolean } {
  let score = 0;
  const now = new Date();
  const glAmt = parseDollarAmount(
    getFieldValue(bid, 'general_liability_amount') ?? bid.general_liability_amount,
  );
  if (glAmt >= 1_000_000) score += 35;
  else if (glAmt >= 500_000) score += 20;
  const glExp = parseDate(
    getFieldValue(bid, 'general_liability_expiry') ?? bid.general_liability_expiry,
  );
  if (glExp && glExp > now) score += 20;
  const eoAmt = parseDollarAmount(
    getFieldValue(bid, 'errors_omissions_amount') ?? bid.errors_omissions_amount,
  );
  if (eoAmt >= 500_000) score += 25;
  else if (eoAmt >= 250_000) score += 15;
  const fbAmt = parseDollarAmount(
    getFieldValue(bid, 'fidelity_bond_amount') ?? bid.fidelity_bond_amount,
  );
  if (fbAmt > 0) score += 20;
  const verified =
    isFieldVerified(bid, 'general_liability_amount') ||
    isFieldVerified(bid, 'general_liability_expiry');
  return { score: Math.min(score, 100), verified };
}

function scoreReferences(bid: RawBidData): { score: number; verified: boolean } {
  let refs: unknown[] = [];
  if (bid.references_json) {
    try {
      refs = JSON.parse(bid.references_json);
    } catch {
      refs = [];
    }
  }
  const count = Array.isArray(refs) ? refs.length : 0;
  let score = 0;
  if (count >= 5) score = 100;
  else if (count >= 3) score = 80;
  else if (count >= 2) score = 60;
  else if (count >= 1) score = 35;
  return { score, verified: false };
}

function computeSnapshots(
  bids: RawBidData[],
  weights: ReportWeights,
  overrideMap: Map<string, Map<Dimension, { score: number; note: string | null }>>,
): BidSnapshot[] {
  const fees = bids.map((b) => {
    const feeStr = getFieldValue(b, 'management_fee_base') ?? b.management_fee_base;
    return parseDollarAmount(feeStr);
  });
  const validFees = fees.filter((f) => f > 0);
  const minFee = validFees.length ? Math.min(...validFees) : 0;
  const maxFee = validFees.length ? Math.max(...validFees) : 0;

  const results = bids.map((bid, idx) => {
    const bidOverrides = overrideMap.get(bid.submission_id) ?? new Map<Dimension, { score: number; note: string | null }>();

    const getDimScore = (dim: Dimension, rawScore: number, verified: boolean): DimScore => {
      const ov = bidOverrides.get(dim);
      const finalRaw = ov ? ov.score : rawScore;
      return {
        raw: Math.round(finalRaw),
        weighted: Math.round(finalRaw * weights[dim]),
        is_override: !!ov,
        override_note: ov?.note ?? null,
        verified,
      };
    };

    let priceRaw = 0;
    const fee = fees[idx];
    if (fee > 0 && maxFee > minFee) {
      priceRaw = Math.round(100 - ((fee - minFee) / (maxFee - minFee)) * 100);
    } else if (fee > 0 && minFee === maxFee) {
      priceRaw = 75;
    }

    const cam = scoreCamLicense(bid);
    const port = scorePortfolioSize(bid);
    const ins = scoreInsurance(bid);
    const refs = scoreReferences(bid);

    const scores: Record<Dimension, DimScore> = {
      price: getDimScore('price', priceRaw, isFieldVerified(bid, 'management_fee_base')),
      cam_license: getDimScore('cam_license', cam.score, cam.verified),
      portfolio_size: getDimScore('portfolio_size', port.score, port.verified),
      insurance: getDimScore('insurance', ins.score, ins.verified),
      references: getDimScore('references', refs.score, refs.verified),
    };

    const composite =
      scores.price.raw * weights.price +
      scores.cam_license.raw * weights.cam_license +
      scores.portfolio_size.raw * weights.portfolio_size +
      scores.insurance.raw * weights.insurance +
      scores.references.raw * weights.references;

    return { bid, scores, composite: Math.round(composite) };
  });

  results.sort((a, b) => b.composite - a.composite);

  return results.map((r, idx) => ({
    submission_id: r.bid.submission_id,
    company_name: r.bid.company_name,
    company_email: r.bid.company_email,
    submitted_at: r.bid.submitted_at,
    composite_score: r.composite,
    rank: idx + 1,
    management_fee:
      getFieldValue(r.bid, 'management_fee_base') ?? r.bid.management_fee_base,
    cam_license_number: r.bid.cam_license_number,
    cam_license_state: r.bid.cam_license_state,
    cam_license_expiry: r.bid.cam_license_expiry,
    verification_badge: r.bid.verification_badge,
    portfolio_unit_count: r.bid.portfolio_unit_count,
    years_in_business: r.bid.years_in_business,
    scores: r.scores,
  }));
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

// ── Server actions ──────────────────────────────────────────────────────────

export async function generateDecisionReport(rfpId: string): Promise<{
  success: boolean;
  error?: string;
  report?: DecisionReport;
}> {
  try {
    const { userId, orgId, email } = await getUserContext();

    const rfpRes = await pool.query<{
      org_id: string;
      title: string;
      community_name: string | null;
    }>(
      `SELECT org_id, title, community_name FROM hoa_rfps WHERE id = $1`,
      [rfpId],
    );
    if (!rfpRes.rows[0] || rfpRes.rows[0].org_id !== orgId) {
      return { success: false, error: 'RFP not found or access denied' };
    }
    const rfp = rfpRes.rows[0];

    const rubricRes = await pool.query<{
      weight_price: number;
      weight_cam_license: number;
      weight_portfolio_size: number;
      weight_insurance: number;
      weight_references: number;
    }>(
      `SELECT weight_price, weight_cam_license, weight_portfolio_size,
              weight_insurance, weight_references
       FROM hoa_scoring_rubrics WHERE rfp_id = $1`,
      [rfpId],
    );

    const weights: ReportWeights = rubricRes.rows[0]
      ? {
          price: rubricRes.rows[0].weight_price,
          cam_license: rubricRes.rows[0].weight_cam_license,
          portfolio_size: rubricRes.rows[0].weight_portfolio_size,
          insurance: rubricRes.rows[0].weight_insurance,
          references: rubricRes.rows[0].weight_references,
        }
      : { price: 0.25, cam_license: 0.20, portfolio_size: 0.20, insurance: 0.20, references: 0.15 };

    const subRes = await pool.query<{
      id: string;
      company_name: string;
      company_email: string;
      submitted_at: string;
      years_in_business: number | null;
      portfolio_unit_count: number | null;
      cam_license_number: string | null;
      cam_license_state: string | null;
      cam_license_expiry: string | null;
      general_liability_amount: string | null;
      general_liability_expiry: string | null;
      errors_omissions_amount: string | null;
      fidelity_bond_amount: string | null;
      management_fee_base: string | null;
      references_json: string | null;
    }>(
      `SELECT id, company_name, company_email,
              submitted_at::text AS submitted_at,
              years_in_business, portfolio_unit_count,
              cam_license_number, cam_license_state, cam_license_expiry,
              general_liability_amount, general_liability_expiry,
              errors_omissions_amount, fidelity_bond_amount,
              management_fee_base, references_json
       FROM hoa_bid_submissions WHERE rfp_id = $1
       ORDER BY submitted_at ASC`,
      [rfpId],
    );

    if (subRes.rows.length === 0) {
      return { success: false, error: 'No bid submissions found for this RFP' };
    }

    const ovRes = await pool.query<{
      bid_submission_id: string;
      dimension: string;
      override_score: number;
      override_note: string | null;
    }>(
      `SELECT o.bid_submission_id, o.dimension, o.override_score, o.override_note
       FROM hoa_score_overrides o
       JOIN hoa_scoring_rubrics r ON r.id = o.rubric_id
       WHERE r.rfp_id = $1`,
      [rfpId],
    );

    const overrideMap = new Map<string, Map<Dimension, { score: number; note: string | null }>>();
    for (const ov of ovRes.rows) {
      if (!overrideMap.has(ov.bid_submission_id)) {
        overrideMap.set(ov.bid_submission_id, new Map());
      }
      overrideMap.get(ov.bid_submission_id)!.set(ov.dimension as Dimension, {
        score: ov.override_score,
        note: ov.override_note,
      });
    }

    const badgeRes = await pool.query<{ bid_submission_id: string }>(
      `SELECT bid_submission_id FROM hoa_verification_reviews
       WHERE rfp_id = $1 AND badge_granted = TRUE`,
      [rfpId],
    );
    const badgeSet = new Set(badgeRes.rows.map((r) => r.bid_submission_id));

    const bids: RawBidData[] = await Promise.all(
      subRes.rows.map(async (row) => {
        const extRes = await pool.query<{ id: string }>(
          `SELECT id FROM hoa_bid_extractions
           WHERE bid_submission_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [row.id],
        );
        const fields: Record<
          string,
          { value: string | null; accepted_value: string | null; human_reviewed: boolean }
        > = {};
        if (extRes.rows[0]) {
          const fRes = await pool.query<{
            field_key: string;
            extracted_value: string | null;
            accepted_value: string | null;
            human_reviewed: boolean;
          }>(
            `SELECT field_key, extracted_value, accepted_value, human_reviewed
             FROM hoa_extraction_fields WHERE extraction_id = $1`,
            [extRes.rows[0].id],
          );
          for (const f of fRes.rows) {
            fields[f.field_key] = {
              value: f.extracted_value,
              accepted_value: f.accepted_value,
              human_reviewed: f.human_reviewed,
            };
          }
        }
        return {
          submission_id: row.id,
          company_name: row.company_name,
          company_email: row.company_email,
          submitted_at: row.submitted_at,
          years_in_business: row.years_in_business,
          portfolio_unit_count: row.portfolio_unit_count,
          cam_license_number: row.cam_license_number,
          cam_license_state: row.cam_license_state,
          cam_license_expiry: row.cam_license_expiry,
          general_liability_amount: row.general_liability_amount,
          general_liability_expiry: row.general_liability_expiry,
          errors_omissions_amount: row.errors_omissions_amount,
          fidelity_bond_amount: row.fidelity_bond_amount,
          management_fee_base: row.management_fee_base,
          references_json: row.references_json,
          fields,
          verification_badge: badgeSet.has(row.id),
        };
      }),
    );

    const bidSnapshots = computeSnapshots(bids, weights, overrideMap);
    const snapshot: ReportSnapshot = {
      rfp_title: rfp.title,
      community_name: rfp.community_name,
      generated_at: new Date().toISOString(),
      weights,
      bids: bidSnapshots,
      disclaimer: LIABILITY_DISCLAIMER,
    };

    const repRes = await pool.query<{ id: string; created_at: string }>(
      `INSERT INTO hoa_decision_reports
         (rfp_id, org_id, generated_by, generated_by_email, snapshot_json, disclaimer_text)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id, created_at::text AS created_at`,
      [rfpId, orgId, userId, email, JSON.stringify(snapshot), LIABILITY_DISCLAIMER],
    );

    const saved = repRes.rows[0];
    return {
      success: true,
      report: {
        id: saved.id,
        rfp_id: rfpId,
        org_id: orgId,
        generated_by: userId,
        generated_by_email: email,
        snapshot_json: snapshot,
        pdf_url: null,
        emailed_at: null,
        email_recipients: [],
        disclaimer_text: LIABILITY_DISCLAIMER,
        created_at: saved.created_at,
      },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getDecisionReports(rfpId: string): Promise<{
  success: boolean;
  error?: string;
  reports?: DecisionReport[];
}> {
  try {
    const { orgId } = await getUserContext();

    const rfpCheck = await pool.query<{ org_id: string }>(
      `SELECT org_id FROM hoa_rfps WHERE id = $1`,
      [rfpId],
    );
    if (!rfpCheck.rows[0] || rfpCheck.rows[0].org_id !== orgId) {
      return { success: false, error: 'Not found or access denied' };
    }

    const res = await pool.query<{
      id: string;
      rfp_id: string;
      org_id: string;
      generated_by: string;
      generated_by_email: string;
      snapshot_json: string;
      pdf_url: string | null;
      emailed_at: string | null;
      email_recipients: string[];
      disclaimer_text: string;
      created_at: string;
    }>(
      `SELECT id, rfp_id, org_id, generated_by, generated_by_email,
              snapshot_json::text AS snapshot_json, pdf_url,
              emailed_at::text AS emailed_at, email_recipients,
              disclaimer_text, created_at::text AS created_at
       FROM hoa_decision_reports
       WHERE rfp_id = $1
       ORDER BY created_at DESC`,
      [rfpId],
    );

    const reports: DecisionReport[] = res.rows.map((row) => ({
      ...row,
      snapshot_json: JSON.parse(row.snapshot_json) as ReportSnapshot,
    }));

    return { success: true, reports };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getReportById(reportId: string): Promise<{
  success: boolean;
  error?: string;
  report?: DecisionReport;
}> {
  try {
    const { orgId } = await getUserContext();

    const res = await pool.query<{
      id: string;
      rfp_id: string;
      org_id: string;
      generated_by: string;
      generated_by_email: string;
      snapshot_json: string;
      pdf_url: string | null;
      emailed_at: string | null;
      email_recipients: string[];
      disclaimer_text: string;
      created_at: string;
    }>(
      `SELECT id, rfp_id, org_id, generated_by, generated_by_email,
              snapshot_json::text AS snapshot_json, pdf_url,
              emailed_at::text AS emailed_at, email_recipients,
              disclaimer_text, created_at::text AS created_at
       FROM hoa_decision_reports
       WHERE id = $1 AND org_id = $2`,
      [reportId, orgId],
    );

    if (!res.rows[0]) return { success: false, error: 'Report not found' };

    return {
      success: true,
      report: {
        ...res.rows[0],
        snapshot_json: JSON.parse(res.rows[0].snapshot_json) as ReportSnapshot,
      },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function emailReportToBoard(
  reportId: string,
  recipients: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const { orgId } = await getUserContext();

    if (!recipients.length) return { success: false, error: 'No recipients provided' };

    const res = await pool.query<{
      snapshot_json: string;
      org_id: string;
    }>(
      `SELECT snapshot_json::text AS snapshot_json, org_id
       FROM hoa_decision_reports WHERE id = $1 AND org_id = $2`,
      [reportId, orgId],
    );
    if (!res.rows[0]) return { success: false, error: 'Report not found' };

    const snapshot: ReportSnapshot = JSON.parse(res.rows[0].snapshot_json);

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      process.env.NOTIFICATIONS_FROM_EMAIL ||
      'noreply@hoaboard.app';

    const subject = `Board Decision Report: ${snapshot.rfp_title}`;

    const rankRows = snapshot.bids
      .map(
        (b) =>
          `<tr style="border-bottom:1px solid #e5e7eb">` +
          `<td style="padding:0.6rem 1rem;font-weight:700;color:#1e3a8a">#${b.rank}</td>` +
          `<td style="padding:0.6rem 1rem;font-weight:600">${b.company_name}</td>` +
          `<td style="padding:0.6rem 1rem;text-align:center;font-size:1.1rem;font-weight:800;color:#1e3a8a">${b.composite_score}</td>` +
          `<td style="padding:0.6rem 1rem;text-align:center">${b.verification_badge ? '<span style="color:#065f46;font-weight:700">✓ Verified</span>' : '<span style="color:#9ca3af">—</span>'}</td>` +
          `<td style="padding:0.6rem 1rem">${b.management_fee ?? '—'}</td>` +
          `</tr>`,
      )
      .join('');

    const html =
      `<div style="font-family:sans-serif;max-width:700px;margin:0 auto;color:#111827">` +
      `<div style="background:#1e3a8a;color:#fff;padding:2rem;border-radius:8px 8px 0 0">` +
      `<h1 style="margin:0 0 0.5rem;font-size:1.4rem">Board Decision Report</h1>` +
      `<p style="margin:0;opacity:0.85;font-size:1rem">${snapshot.rfp_title}${snapshot.community_name ? ' — ' + snapshot.community_name : ''}</p>` +
      `<p style="margin:0.5rem 0 0;opacity:0.7;font-size:0.8rem">Generated ${new Date(snapshot.generated_at).toLocaleString()}</p>` +
      `</div>` +
      `<div style="background:#fef3c7;border:1px solid #fcd34d;padding:1rem 1.5rem">` +
      `<p style="margin:0;font-size:0.82rem;color:#92400e;font-weight:500">${snapshot.disclaimer}</p>` +
      `</div>` +
      `<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:1.5rem;border-radius:0 0 8px 8px">` +
      `<h2 style="margin:0 0 1rem;font-size:1rem;color:#111827">Ranked Results — ${snapshot.bids.length} Bid${snapshot.bids.length !== 1 ? 's' : ''}</h2>` +
      `<table style="width:100%;border-collapse:collapse;font-size:0.875rem">` +
      `<thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">` +
      `<th style="padding:0.6rem 1rem;text-align:left;font-weight:600">Rank</th>` +
      `<th style="padding:0.6rem 1rem;text-align:left;font-weight:600">Company</th>` +
      `<th style="padding:0.6rem 1rem;text-align:center;font-weight:600">Score</th>` +
      `<th style="padding:0.6rem 1rem;text-align:center;font-weight:600">Verified</th>` +
      `<th style="padding:0.6rem 1rem;text-align:left;font-weight:600">Mgmt Fee</th>` +
      `</tr></thead>` +
      `<tbody>${rankRows}</tbody>` +
      `</table>` +
      `<p style="margin:1.5rem 0 0;font-size:0.78rem;color:#6b7280">` +
      `View the full interactive report with score breakdowns in your HOA management portal.` +
      `</p>` +
      `</div></div>`;

    let sent = 0;
    let lastError: string | null = null;

    if (apiKey) {
      for (const recipient of recipients) {
        try {
          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: fromEmail, to: [recipient], subject, html }),
            signal: AbortSignal.timeout(15_000),
          });
          if (resp.ok) {
            sent += 1;
          } else {
            const body = (await resp.json()) as { message?: string };
            lastError = body.message ?? `status ${resp.status}`;
          }
        } catch (e) {
          lastError = String(e);
        }
      }
    }

    await pool.query(
      `UPDATE hoa_decision_reports
       SET emailed_at = NOW(), email_recipients = $1
       WHERE id = $2`,
      [recipients, reportId],
    );

    if (!apiKey) return { success: true };
    if (sent === 0 && lastError) {
      return { success: false, error: `Email delivery failed: ${lastError}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
