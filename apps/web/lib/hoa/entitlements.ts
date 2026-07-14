'use server';

/**
 * Monetization entitlements — chairman-ratified pricing (2026-07-13):
 *
 *   BOARDS:   free profile + directory search · Premium $199/yr ·
 *             RFP transaction $399 standard / $249 premium
 *   VENDORS:  free listed profile + saved-profile prefill ·
 *             pay-to-respond $149/response ·
 *             Pro $249/mo — unlimited responses + full response tools
 *
 * SHIPS DARK: MONETIZATION_ENFORCED (env, default off) — until the chairman
 * flips it at launch, every gate below allows the action and records a
 * 'waived_early_access' transaction row so the eventual revenue surface is
 * measurable before it charges. FLIP CHECKLIST (launch-prep): create the
 * Stripe products/prices via the billing lego, set MONETIZATION_ENFORCED=1
 * on Vercel, wire the checkout redirect in the two gates below.
 */

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface PricingTable {
  board_premium_annual_usd: number;
  rfp_transaction_usd: number;
  rfp_transaction_premium_usd: number;
  vendor_pay_per_response_usd: number;
  vendor_pro_monthly_usd: number;
  enforced: boolean;
}

const PRICING: Omit<PricingTable, 'enforced'> = {
  board_premium_annual_usd: 199,
  rfp_transaction_usd: 399,
  rfp_transaction_premium_usd: 249,
  vendor_pay_per_response_usd: 149,
  vendor_pro_monthly_usd: 249,
};

function enforced(): boolean {
  return (process.env.MONETIZATION_ENFORCED || '').toLowerCase() in
    { '1': 1, 'true': 1, 'yes': 1 };
}

export async function getPricing(): Promise<PricingTable> {
  return { ...PRICING, enforced: enforced() };
}

/**
 * Board-side gate — called when a board starts inviting companies to an RFP
 * (the paid "RFP transaction"). Dark mode: allow + record a waived row once
 * per RFP so future revenue is countable.
 */
export async function assertBoardRfpTransaction(
  rfpId: string,
  orgId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { rows } = await pool.query(
      `SELECT id, status FROM hoa_rfp_transactions
       WHERE rfp_id = $1 AND payer_side = 'board' AND kind = 'rfp_transaction'
       LIMIT 1`,
      [rfpId],
    );
    if (rows[0]) {
      if (!enforced() || rows[0].status !== 'pending_payment') return { allowed: true };
      return { allowed: false, reason: 'payment_required' };
    }
    await pool.query(
      `INSERT INTO hoa_rfp_transactions (rfp_id, org_id, payer_side, kind, amount_usd, status)
       VALUES ($1, $2, 'board', 'rfp_transaction', $3, $4)`,
      [rfpId, orgId, PRICING.rfp_transaction_usd,
       enforced() ? 'pending_payment' : 'waived_early_access'],
    );
    if (enforced()) {
      // Flip-time: return a Stripe Checkout URL here instead of a bare block.
      return { allowed: false, reason: 'payment_required' };
    }
    return { allowed: true };
  } catch {
    // Fail-open: monetization plumbing must never break the product.
    return { allowed: true };
  }
}

/**
 * Vendor-side gate — called at bid submission (pay-to-respond). Pro
 * subscribers and dark mode always pass; dark mode records the waived row.
 */
export async function assertVendorResponse(
  rfpId: string,
  companyEmail: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const email = companyEmail.trim().toLowerCase();
    const { rows } = await pool.query(
      `SELECT id FROM hoa_rfp_transactions
       WHERE rfp_id = $1 AND payer_side = 'vendor' AND payer_email = $2
       LIMIT 1`,
      [rfpId, email],
    );
    if (!rows[0]) {
      await pool.query(
        `INSERT INTO hoa_rfp_transactions (rfp_id, payer_side, payer_email, kind, amount_usd, status)
         VALUES ($1, 'vendor', $2, 'pay_to_respond', $3, $4)`,
        [rfpId, email, PRICING.vendor_pay_per_response_usd,
         enforced() ? 'pending_payment' : 'waived_early_access'],
      );
    }
    if (!enforced()) return { allowed: true };
    // Flip-time: check billing-lego Pro subscription by email; if absent,
    // return a Stripe Checkout URL for the $149 response fee.
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
