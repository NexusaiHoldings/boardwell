'use server';

/**
 * Marketplace directory (per-market rollout, OREGON first — chairman
 * provides the seed data via the admin CSV import). Boards browse/search
 * management companies and invite them straight into an RFP; vendors see
 * the communities in their market on /vendor.
 */

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface DirectoryCompany {
  id: string;
  company_name: string;
  company_email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string;
  market: string | null;
  units_managed: string | null;
  description: string | null;
}

export async function searchDirectoryCompanies(opts: {
  state?: string;
  q?: string;
  limit?: number;
}): Promise<DirectoryCompany[]> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.state) {
    params.push(opts.state.toUpperCase());
    where.push(`state = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q.trim()}%`);
    where.push(
      `(company_name ILIKE $${params.length} OR city ILIKE $${params.length} OR description ILIKE $${params.length})`,
    );
  }
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT id, company_name, company_email, phone, website, city, state, market,
            units_managed, description
     FROM hoa_directory_companies
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY company_name
     LIMIT $${params.length}`,
    params,
  );
  return rows as DirectoryCompany[];
}

export async function directoryStats(): Promise<Array<{ state: string; companies: number }>> {
  const { rows } = await pool.query(
    `SELECT state, COUNT(*)::int AS companies FROM hoa_directory_companies
     GROUP BY state ORDER BY companies DESC`,
  );
  return rows as Array<{ state: string; companies: number }>;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * CSV import (admin-gated at the route). Expected header (case-insensitive,
 * order-free): company_name, state [, company_email, phone, website, city,
 * market, units_managed, description]. Upserts on (company_name, state).
 */
export async function importDirectoryCompanies(csvText: string): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    result.errors.push('CSV needs a header row and at least one data row');
    return result;
  }

  // Minimal CSV parse with quoted-field support.
  function parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const col = (name: string): number => header.indexOf(name);
  if (col('company_name') < 0 || col('state') < 0) {
    result.errors.push(`header must include company_name and state (got: ${header.join(', ')})`);
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const f = parseLine(lines[i]);
    const get = (name: string): string | null => {
      const idx = col(name);
      const v = idx >= 0 ? (f[idx] ?? '').trim() : '';
      return v || null;
    };
    const name = get('company_name');
    const state = (get('state') ?? '').toUpperCase();
    if (!name || !/^[A-Z]{2}$/.test(state)) {
      result.skipped++;
      continue;
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO hoa_directory_companies
           (company_name, company_email, phone, website, city, state, market,
            units_managed, description, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'chairman_data')
         ON CONFLICT (company_name, state) DO UPDATE SET
           company_email = COALESCE(EXCLUDED.company_email, hoa_directory_companies.company_email),
           phone = COALESCE(EXCLUDED.phone, hoa_directory_companies.phone),
           website = COALESCE(EXCLUDED.website, hoa_directory_companies.website),
           city = COALESCE(EXCLUDED.city, hoa_directory_companies.city),
           market = COALESCE(EXCLUDED.market, hoa_directory_companies.market),
           units_managed = COALESCE(EXCLUDED.units_managed, hoa_directory_companies.units_managed),
           description = COALESCE(EXCLUDED.description, hoa_directory_companies.description),
           updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [name, get('company_email')?.toLowerCase() ?? null, get('phone'), get('website'),
         get('city'), state, get('market'), get('units_managed'), get('description')],
      );
      if (rows[0]?.inserted) result.inserted++;
      else result.updated++;
    } catch (err) {
      result.errors.push(`row ${i + 1}: ${String(err).slice(0, 120)}`);
      if (result.errors.length >= 20) {
        result.errors.push('…further errors suppressed');
        break;
      }
    }
  }
  return result;
}
