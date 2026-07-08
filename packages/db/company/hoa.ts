/**
 * HOA domain table definitions.
 * migrate.ts runs every *_DDL constant against the company database at deploy.
 */

export const HOA_DDL = `
CREATE TABLE IF NOT EXISTS hoa_intake_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  unit_count INTEGER NOT NULL,
  amenity_mix TEXT[] NOT NULL DEFAULT '{}',
  budget_range_min INTEGER NOT NULL,
  budget_range_max INTEGER NOT NULL,
  state TEXT NOT NULL,
  pain_points TEXT NOT NULL,
  current_management TEXT,
  status TEXT NOT NULL DEFAULT 'complete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hoa_rfps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  intake_id UUID REFERENCES hoa_intake_questionnaires(id),
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  community_name TEXT,
  finalized_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hoa_rfp_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES hoa_rfps(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  edited_by TEXT,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rfp_id, section_key)
);

CREATE TABLE IF NOT EXISTS hoa_bid_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES hoa_rfps(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hoa_bid_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES hoa_rfps(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES hoa_bid_tokens(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  last_nudge_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hoa_bid_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES hoa_bid_invitations(id) ON DELETE CASCADE,
  rfp_id UUID NOT NULL REFERENCES hoa_rfps(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  years_in_business INTEGER,
  company_description TEXT,
  cam_license_number TEXT,
  cam_license_state TEXT,
  cam_license_expiry TEXT,
  general_liability_amount TEXT,
  general_liability_expiry TEXT,
  errors_omissions_amount TEXT,
  errors_omissions_expiry TEXT,
  fidelity_bond_amount TEXT,
  insurance_carrier TEXT,
  annual_revenue TEXT,
  portfolio_unit_count INTEGER,
  management_fee_base TEXT,
  management_fee_additional TEXT,
  references_json TEXT,
  insurance_cert_url TEXT,
  financial_statement_url TEXT,
  cam_license_url TEXT,
  self_reported_disclaimer_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
