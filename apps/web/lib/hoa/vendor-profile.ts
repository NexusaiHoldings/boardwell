'use server';

/**
 * Management-company (vendor) saved profiles — phase 2 of the two-sided
 * model from the chairman's lab discussion (2026-07-08): vendors provide
 * their RFP response info ONCE; each new invitation pre-fills from the
 * profile (the "85%") so they mostly review and price (the "15%"). The
 * profile refreshes from every submitted bid ("they can edit their core
 * data... from the draft responses"), so the data maintains itself through
 * normal use.
 *
 * Identity model: a profile is keyed by company_email — the address the
 * board invited (and the signed token was mailed to), so token possession
 * authorizes pre-fill of that company's own data. A login account is
 * OPTIONAL: /vendor links a session user to the profile whose
 * company_email matches their login email.
 */

import { Pool } from 'pg';
import type { BidSubmissionData } from '@/lib/hoa/invitations';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface VendorProfile {
  id: string;
  company_email: string;
  company_name: string | null;
  years_in_business: string | null;
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
  portfolio_unit_count: string | null;
  management_fee_base: string | null;
  management_fee_additional: string | null;
  references_json: Array<{ name: string; company: string; email: string; phone: string }>;
  updated_at: string;
}

const PROFILE_COLUMNS = `id, company_email, company_name, years_in_business, company_description,
  cam_license_number, cam_license_state, cam_license_expiry,
  general_liability_amount, general_liability_expiry,
  errors_omissions_amount, errors_omissions_expiry,
  fidelity_bond_amount, insurance_carrier, annual_revenue, portfolio_unit_count,
  management_fee_base, management_fee_additional, references_json,
  updated_at::text AS updated_at`;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseReferences(raw: unknown): VendorProfile['references_json'] {
  if (Array.isArray(raw)) return raw as VendorProfile['references_json'];
  try {
    const parsed = JSON.parse(String(raw ?? '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getVendorProfileByEmail(email: string): Promise<VendorProfile | null> {
  const { rows } = await pool.query(
    `SELECT ${PROFILE_COLUMNS} FROM hoa_vendor_profiles WHERE company_email = $1`,
    [normalizeEmail(email)],
  );
  if (!rows[0]) return null;
  return { ...rows[0], references_json: parseReferences(rows[0].references_json) } as VendorProfile;
}

/**
 * Refresh (or create) the profile from a submitted bid — the chairman's
 * "edit core data from the draft responses" loop. Called by submitBid when
 * the vendor opts in.
 */
export async function upsertVendorProfileFromBid(
  companyEmail: string,
  companyName: string,
  data: BidSubmissionData,
): Promise<void> {
  await pool.query(
    `INSERT INTO hoa_vendor_profiles (
       company_email, company_name, years_in_business, company_description,
       cam_license_number, cam_license_state, cam_license_expiry,
       general_liability_amount, general_liability_expiry,
       errors_omissions_amount, errors_omissions_expiry,
       fidelity_bond_amount, insurance_carrier, annual_revenue,
       portfolio_unit_count, management_fee_base, management_fee_additional,
       references_json
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (company_email) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       years_in_business = EXCLUDED.years_in_business,
       company_description = EXCLUDED.company_description,
       cam_license_number = EXCLUDED.cam_license_number,
       cam_license_state = EXCLUDED.cam_license_state,
       cam_license_expiry = EXCLUDED.cam_license_expiry,
       general_liability_amount = EXCLUDED.general_liability_amount,
       general_liability_expiry = EXCLUDED.general_liability_expiry,
       errors_omissions_amount = EXCLUDED.errors_omissions_amount,
       errors_omissions_expiry = EXCLUDED.errors_omissions_expiry,
       fidelity_bond_amount = EXCLUDED.fidelity_bond_amount,
       insurance_carrier = EXCLUDED.insurance_carrier,
       annual_revenue = EXCLUDED.annual_revenue,
       portfolio_unit_count = EXCLUDED.portfolio_unit_count,
       management_fee_base = EXCLUDED.management_fee_base,
       management_fee_additional = EXCLUDED.management_fee_additional,
       references_json = EXCLUDED.references_json,
       updated_at = NOW()`,
    [
      normalizeEmail(companyEmail),
      companyName || null,
      data.yearsInBusiness || null,
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
      data.portfolioUnitCount || null,
      data.managementFeeBase || null,
      data.managementFeeAdditional || null,
      JSON.stringify((data.references ?? []).filter((r) => r.name.trim().length > 0)),
    ],
  );
}

/** Direct core-data edit from the /vendor portal (caller must verify the session email matches). */
export async function updateVendorProfile(
  companyEmail: string,
  fields: Partial<Omit<VendorProfile, 'id' | 'company_email' | 'references_json' | 'updated_at'>>,
): Promise<{ success: boolean; error?: string }> {
  const allowed: Array<keyof typeof fields> = [
    'company_name', 'years_in_business', 'company_description',
    'cam_license_number', 'cam_license_state', 'cam_license_expiry',
    'general_liability_amount', 'general_liability_expiry',
    'errors_omissions_amount', 'errors_omissions_expiry',
    'fidelity_bond_amount', 'insurance_carrier', 'annual_revenue',
    'portfolio_unit_count', 'management_fee_base', 'management_fee_additional',
  ];
  const sets: string[] = [];
  const values: unknown[] = [normalizeEmail(companyEmail)];
  for (const key of allowed) {
    if (key in fields) {
      values.push((fields[key] as string | null) || null);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) return { success: true };
  try {
    await pool.query(
      `UPDATE hoa_vendor_profiles SET ${sets.join(', ')}, updated_at = NOW()
       WHERE company_email = $1`,
      values,
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export interface VendorInvitationRow {
  rfp_title: string;
  community_name: string | null;
  status: string;
  invited_at: string;
  submitted_at: string | null;
  token: string | null;
  expires_at: string | null;
}

/** Invitation history for a vendor across all boards (matched by invited email). */
export async function listVendorInvitations(email: string): Promise<VendorInvitationRow[]> {
  const { rows } = await pool.query(
    `SELECT r.title AS rfp_title, r.community_name, i.status,
            i.invited_at::text AS invited_at,
            i.submitted_at::text AS submitted_at,
            CASE WHEN bt.expires_at > NOW() AND bt.used_at IS NULL THEN bt.token END AS token,
            bt.expires_at::text AS expires_at
     FROM hoa_bid_invitations i
     JOIN hoa_bid_tokens bt ON bt.id = i.token_id
     JOIN hoa_rfps r ON r.id = i.rfp_id
     WHERE lower(i.company_email) = $1
     ORDER BY i.invited_at DESC
     LIMIT 50`,
    [normalizeEmail(email)],
  );
  return rows as VendorInvitationRow[];
}
