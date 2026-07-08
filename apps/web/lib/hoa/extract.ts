'use server';

import { Pool } from 'pg';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface BidSubmissionRow {
  id: string;
  invitation_id: string;
  rfp_id: string;
  company_name: string;
  company_email: string;
  years_in_business: number | null;
  company_description: string | null;
  cam_license_number: string | null;
  cam_license_state: string | null;
  cam_license_expiry: string | null;
  general_liability_amount: string | null;
  general_liability_expiry: string | null;
  errors_omissions_amount: string | null;
  errors_omissions_expiry: string | null;
  fidelity_bond_amount: string | null;
  insurance_carrier: string | null;
  annual_revenue: string | null;
  portfolio_unit_count: number | null;
  management_fee_base: string | null;
  management_fee_additional: string | null;
  references_json: string | null;
  insurance_cert_url: string | null;
  financial_statement_url: string | null;
  cam_license_url: string | null;
  submitted_at: string;
  rfp_title: string;
  community_name: string | null;
}

export interface ExtractionField {
  id: string;
  extraction_id: string;
  field_key: string;
  field_label: string;
  extracted_value: string | null;
  confidence: number;
  human_reviewed: boolean;
  accepted_value: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface ExtractionRow {
  id: string;
  bid_submission_id: string;
  rfp_id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  fields: ExtractionField[];
}

export interface ExtractionFieldDef {
  key: string;
  label: string;
  isExpiry?: boolean;
}

export const EXTRACTION_FIELD_DEFS: ExtractionFieldDef[] = [
  { key: 'cam_license_number', label: 'CAM License Number' },
  { key: 'cam_license_state', label: 'CAM License State' },
  { key: 'cam_license_expiry', label: 'CAM License Expiry', isExpiry: true },
  { key: 'general_liability_amount', label: 'General Liability Amount' },
  { key: 'general_liability_expiry', label: 'GL Insurance Expiry', isExpiry: true },
  { key: 'errors_omissions_amount', label: 'E&O Insurance Amount' },
  { key: 'errors_omissions_expiry', label: 'E&O Insurance Expiry', isExpiry: true },
  { key: 'fidelity_bond_amount', label: 'Fidelity Bond Amount' },
  { key: 'insurance_carrier', label: 'Insurance Carrier' },
  { key: 'annual_revenue', label: 'Annual Revenue' },
  { key: 'portfolio_unit_count', label: 'Portfolio Unit Count' },
  { key: 'management_fee_base', label: 'Base Management Fee' },
  { key: 'management_fee_additional', label: 'Additional Fee Schedule' },
  { key: 'years_in_business', label: 'Years in Business' },
];

async function getCurrentUserId(): Promise<string> {
  try {
    const hdrs = headers();
    return hdrs.get('x-user-id') ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function formatBidForExtraction(s: BidSubmissionRow): string {
  const lines: string[] = [
    `Company: ${s.company_name} <${s.company_email}>`,
    `Years in Business: ${s.years_in_business ?? 'Not provided'}`,
    `Company Description: ${s.company_description ?? 'Not provided'}`,
    '',
    '--- LICENSE & CREDENTIALS ---',
    `CAM License Number: ${s.cam_license_number ?? 'Not provided'}`,
    `CAM License State: ${s.cam_license_state ?? 'Not provided'}`,
    `CAM License Expiry: ${s.cam_license_expiry ?? 'Not provided'}`,
    '',
    '--- INSURANCE ---',
    `General Liability Amount: ${s.general_liability_amount ?? 'Not provided'}`,
    `General Liability Expiry: ${s.general_liability_expiry ?? 'Not provided'}`,
    `Errors & Omissions Amount: ${s.errors_omissions_amount ?? 'Not provided'}`,
    `Errors & Omissions Expiry: ${s.errors_omissions_expiry ?? 'Not provided'}`,
    `Fidelity Bond Amount: ${s.fidelity_bond_amount ?? 'Not provided'}`,
    `Insurance Carrier: ${s.insurance_carrier ?? 'Not provided'}`,
    '',
    '--- FINANCIAL PROFILE ---',
    `Annual Revenue: ${s.annual_revenue ?? 'Not provided'}`,
    `Portfolio Unit Count: ${s.portfolio_unit_count ?? 'Not provided'}`,
    `Base Management Fee: ${s.management_fee_base ?? 'Not provided'}`,
    `Additional Fee Schedule: ${s.management_fee_additional ?? 'Not provided'}`,
  ];

  if (s.references_json) {
    try {
      const refs = JSON.parse(s.references_json) as Array<{ name?: string; phone?: string; email?: string }>;
      lines.push('', '--- REFERENCES ---');
      refs.forEach((ref, idx) => {
        lines.push(`Reference ${idx + 1}: ${ref.name ?? ''} | ${ref.phone ?? ''} | ${ref.email ?? ''}`);
      });
    } catch {
      // ignore malformed references
    }
  }

  return lines.join('\n');
}

function buildExtractionPrompt(bidText: string): string {
  const fieldList = EXTRACTION_FIELD_DEFS.map((f) => `  - ${f.key}: ${f.label}`).join('\n');
  return `You are an expert HOA bid document analyst. Extract and validate the following fields from this bid submission, then assign a confidence score (0.0–1.0) to each extracted value.

Confidence scoring rules:
- 0.90–1.00: Field present, clearly valid (proper date format, reasonable dollar amount, matches expected pattern)
- 0.75–0.89: Field present, minor format issue or slightly unusual value
- 0.55–0.74: Field present but suspicious format or ambiguous value
- 0.00–0.54: Field missing, empty, or clearly invalid

Fields to extract:
${fieldList}

Return ONLY a JSON object in this exact format:
{
  "fields": {
    "field_key": { "value": "extracted string or null", "confidence": 0.0 }
  }
}

Bid submission data:
${bidText}`;
}

function scoreHeuristic(value: string | null | undefined): { value: string | null; confidence: number } {
  if (!value || String(value).trim() === '') return { value: null, confidence: 0.1 };
  const v = String(value).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return { value: v, confidence: 0.92 };
  }
  if (/^\d{1,2}\/\d{4}$/.test(v) || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(v)) {
    return { value: v, confidence: 0.81 };
  }
  if (/^\$[\d,]+(\.\d+)?/.test(v) || /^[\d,.]+\s*(million|thousand|M|K)\b/i.test(v)) {
    return { value: v, confidence: 0.88 };
  }
  if (/^[A-Z]{1,4}[-\s]?\d{4,12}$/i.test(v)) {
    return { value: v, confidence: 0.87 };
  }
  if (/^\d+$/.test(v)) return { value: v, confidence: 0.85 };
  return { value: v, confidence: 0.72 };
}

function computeHeuristicExtraction(
  s: BidSubmissionRow
): Record<string, { value: string | null; confidence: number }> {
  return {
    cam_license_number: scoreHeuristic(s.cam_license_number),
    cam_license_state: scoreHeuristic(s.cam_license_state),
    cam_license_expiry: scoreHeuristic(s.cam_license_expiry),
    general_liability_amount: scoreHeuristic(s.general_liability_amount),
    general_liability_expiry: scoreHeuristic(s.general_liability_expiry),
    errors_omissions_amount: scoreHeuristic(s.errors_omissions_amount),
    errors_omissions_expiry: scoreHeuristic(s.errors_omissions_expiry),
    fidelity_bond_amount: scoreHeuristic(s.fidelity_bond_amount),
    insurance_carrier: scoreHeuristic(s.insurance_carrier),
    annual_revenue: scoreHeuristic(s.annual_revenue),
    portfolio_unit_count: scoreHeuristic(s.portfolio_unit_count?.toString()),
    management_fee_base: scoreHeuristic(s.management_fee_base),
    management_fee_additional: scoreHeuristic(s.management_fee_additional),
    years_in_business: scoreHeuristic(s.years_in_business?.toString()),
  };
}

async function callGatewayExtraction(
  submission: BidSubmissionRow
): Promise<Record<string, { value: string | null; confidence: number }>> {
  const baseUrl =
    process.env.AI_GATEWAY_URL || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY || '';

  if (!apiKey) {
    return computeHeuristicExtraction(submission);
  }

  const bidText = formatBidForExtraction(submission);
  const prompt = buildExtractionPrompt(bidText);

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-5.4-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert HOA bid document analyst. Extract fields and assign confidence scores. Respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      return computeHeuristicExtraction(submission);
    }

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '{}';

    const parsed = JSON.parse(content) as {
      fields?: Record<string, { value: string | null; confidence: number }>;
    };

    const gatewayFields = parsed.fields ?? {};
    const heuristic = computeHeuristicExtraction(submission);

    // Merge: use gateway result if present, fall back to heuristic per field
    const merged: Record<string, { value: string | null; confidence: number }> = {};
    for (const def of EXTRACTION_FIELD_DEFS) {
      merged[def.key] = gatewayFields[def.key] ?? heuristic[def.key] ?? { value: null, confidence: 0.1 };
    }
    return merged;
  } catch {
    return computeHeuristicExtraction(submission);
  }
}

export async function getBidSubmission(
  bidId: string,
  rfpId: string
): Promise<BidSubmissionRow | null> {
  const { rows } = await pool.query<BidSubmissionRow>(
    `SELECT s.id, s.invitation_id, s.rfp_id, s.company_name, s.company_email,
            s.years_in_business, s.company_description,
            s.cam_license_number, s.cam_license_state, s.cam_license_expiry,
            s.general_liability_amount, s.general_liability_expiry,
            s.errors_omissions_amount, s.errors_omissions_expiry,
            s.fidelity_bond_amount, s.insurance_carrier,
            s.annual_revenue, s.portfolio_unit_count,
            s.management_fee_base, s.management_fee_additional,
            s.references_json, s.insurance_cert_url,
            s.financial_statement_url, s.cam_license_url,
            s.submitted_at::text AS submitted_at,
            r.title AS rfp_title, r.community_name
     FROM hoa_bid_submissions s
     JOIN hoa_rfps r ON r.id = s.rfp_id
     WHERE s.id = $1 AND s.rfp_id = $2`,
    [bidId, rfpId]
  );
  return rows[0] ?? null;
}

export async function getExtractionForBid(bidId: string): Promise<ExtractionRow | null> {
  const { rows: extRows } = await pool.query<Omit<ExtractionRow, 'fields'>>(
    `SELECT id, bid_submission_id, rfp_id, status, error_message,
            created_at::text AS created_at, updated_at::text AS updated_at
     FROM hoa_bid_extractions
     WHERE bid_submission_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [bidId]
  );
  if (!extRows[0]) return null;

  const { rows: fieldRows } = await pool.query<ExtractionField>(
    `SELECT id, extraction_id, field_key, field_label, extracted_value,
            confidence, human_reviewed, accepted_value,
            reviewed_at::text AS reviewed_at, reviewed_by,
            created_at::text AS created_at
     FROM hoa_extraction_fields
     WHERE extraction_id = $1
     ORDER BY confidence ASC, field_key ASC`,
    [extRows[0].id]
  );

  return { ...extRows[0], fields: fieldRows };
}

export async function runExtraction(
  bidId: string,
  rfpId: string
): Promise<{ success: boolean; extractionId?: string; error?: string }> {
  const { rows: extRows } = await pool.query<{ id: string }>(
    `INSERT INTO hoa_bid_extractions (bid_submission_id, rfp_id, status)
     VALUES ($1, $2, 'processing')
     RETURNING id`,
    [bidId, rfpId]
  );
  const extractionId = extRows[0].id;

  const submission = await getBidSubmission(bidId, rfpId);
  if (!submission) {
    await pool.query(
      `UPDATE hoa_bid_extractions
       SET status = 'failed', error_message = $1, updated_at = NOW()
       WHERE id = $2`,
      ['Bid submission not found', extractionId]
    );
    return { success: false, error: 'Bid submission not found' };
  }

  try {
    const extracted = await callGatewayExtraction(submission);

    for (const def of EXTRACTION_FIELD_DEFS) {
      const result = extracted[def.key] ?? { value: null, confidence: 0.1 };
      await pool.query(
        `INSERT INTO hoa_extraction_fields
           (extraction_id, field_key, field_label, extracted_value, confidence)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (extraction_id, field_key) DO UPDATE
           SET extracted_value = EXCLUDED.extracted_value,
               confidence = EXCLUDED.confidence`,
        [extractionId, def.key, def.label, result.value, result.confidence]
      );
    }

    await pool.query(
      `UPDATE hoa_bid_extractions
       SET status = 'complete', updated_at = NOW()
       WHERE id = $1`,
      [extractionId]
    );

    return { success: true, extractionId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Extraction failed';
    await pool.query(
      `UPDATE hoa_bid_extractions
       SET status = 'failed', error_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [errMsg, extractionId]
    );
    return { success: false, error: errMsg };
  }
}

export async function acceptField(
  extractionId: string,
  fieldKey: string
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  const { rows } = await pool.query<{ extracted_value: string | null }>(
    `SELECT extracted_value FROM hoa_extraction_fields
     WHERE extraction_id = $1 AND field_key = $2`,
    [extractionId, fieldKey]
  );
  if (!rows[0]) return { success: false };

  await pool.query(
    `UPDATE hoa_extraction_fields
     SET human_reviewed = TRUE,
         accepted_value = extracted_value,
         reviewed_at = NOW(),
         reviewed_by = $1
     WHERE extraction_id = $2 AND field_key = $3`,
    [userId, extractionId, fieldKey]
  );
  return { success: true };
}

export async function correctField(
  extractionId: string,
  fieldKey: string,
  correctedValue: string
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await pool.query(
    `UPDATE hoa_extraction_fields
     SET human_reviewed = TRUE,
         accepted_value = $1,
         reviewed_at = NOW(),
         reviewed_by = $2
     WHERE extraction_id = $3 AND field_key = $4`,
    [correctedValue, userId, extractionId, fieldKey]
  );
  return { success: true };
}

export async function saveManualExtraction(
  bidId: string,
  rfpId: string,
  fields: Record<string, string>
): Promise<{ success: boolean; extractionId?: string; error?: string }> {
  const userId = await getCurrentUserId();

  try {
    const { rows: extRows } = await pool.query<{ id: string }>(
      `INSERT INTO hoa_bid_extractions (bid_submission_id, rfp_id, status)
       VALUES ($1, $2, 'complete')
       RETURNING id`,
      [bidId, rfpId]
    );
    const extractionId = extRows[0].id;

    for (const def of EXTRACTION_FIELD_DEFS) {
      const rawVal = fields[def.key];
      const value = rawVal && rawVal.trim() !== '' ? rawVal.trim() : null;
      await pool.query(
        `INSERT INTO hoa_extraction_fields
           (extraction_id, field_key, field_label, extracted_value, confidence,
            human_reviewed, accepted_value, reviewed_at, reviewed_by)
         VALUES ($1, $2, $3, $4, 1.0, TRUE, $4, NOW(), $5)
         ON CONFLICT (extraction_id, field_key) DO UPDATE
           SET extracted_value = EXCLUDED.extracted_value,
               accepted_value = EXCLUDED.accepted_value,
               human_reviewed = TRUE,
               reviewed_at = NOW(),
               reviewed_by = EXCLUDED.reviewed_by`,
        [extractionId, def.key, def.label, value, userId]
      );
    }

    return { success: true, extractionId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Failed to save manual extraction';
    return { success: false, error: errMsg };
  }
}
