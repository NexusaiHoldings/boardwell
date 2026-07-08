/**
 * AUTO-RECOVERED table DDL (table-ref-autorecover-001).
 *
 * The integration table-ref gate found these tables queried by apps/web
 * with no creating DDL. Columns are inferred from the SQL the build agents
 * wrote (best-effort, loosely typed) so migrate.ts creates them at deploy
 * and the runtime queries don't 500. Reviewable + replaceable: if a feature
 * later adds a richer hand-written DDL for one of these tables, delete its
 * block here (CREATE TABLE IF NOT EXISTS would otherwise no-op the richer one).
 */

export const RECOVERED_HOA_BID_SCORES_DDL = `
CREATE TABLE IF NOT EXISTS hoa_bid_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bid_id" uuid,
  "confidence" text,
  "extracted_value" text,
  "field_name" text,
  "status" text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;
