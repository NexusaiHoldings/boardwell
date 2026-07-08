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
`;
