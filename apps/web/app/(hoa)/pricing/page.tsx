/**
 * /pricing — chairman-ratified two-sided pricing (2026-07-13), shown
 * honestly as EARLY ACCESS while MONETIZATION_ENFORCED is dark: every price
 * is real, everything is free until launch. No fake urgency (engagement
 * rubric hard-fail class), no invented testimonials.
 */
import type { JSX } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getPricing } from "@/lib/hoa/entitlements";

export const metadata: Metadata = {
  title: "Pricing | Boardwell",
  description:
    "Free directory search for boards; RFP transactions from $249. Management companies: free profile, pay-per-response, or Pro with pre-filled responses.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function Tier({
  name, price, cadence, blurb, items, cta, href, highlight,
}: {
  name: string; price: string; cadence: string; blurb: string;
  items: string[]; cta: string; href: string; highlight?: boolean;
}): JSX.Element {
  return (
    <div
      className={highlight ? "surface" : "feature-card"}
      style={{
        display: "flex", flexDirection: "column", gap: "0.6rem", margin: 0,
        ...(highlight ? { border: "1px solid color-mix(in srgb, var(--substrate-accent) 45%, var(--substrate-border))" } : {}),
      }}
    >
      <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{name}</h3>
      <div>
        <span style={{ fontSize: "1.8rem", fontWeight: 700 }}>{price}</span>
        <span className="muted" style={{ fontSize: "0.85rem" }}> {cadence}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{blurb}</p>
      <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7, fontSize: "0.92rem", flex: 1 }}>
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
      <Link href={href} className={highlight ? "btn" : "btn secondary"} style={{ alignSelf: "flex-start" }}>
        {cta}
      </Link>
    </div>
  );
}

export default async function PricingPage(): Promise<JSX.Element> {
  const p = await getPricing();
  return (
    <main>
      <span className="eyebrow">Pricing</span>
      <h1 style={{ marginBottom: "0.5rem" }}>Simple pricing for both sides of the table</h1>
      <p style={{ maxWidth: "44rem" }}>
        Boards pay when they run an RFP. Management companies pay to respond — or subscribe
        and respond without limits, with responses arriving mostly pre-filled.
      </p>

      {!p.enforced && (
        <div
          className="surface"
          style={{ padding: "1rem 1.25rem", display: "flex", gap: "0.75rem", alignItems: "baseline" }}
          role="note"
        >
          <span className="pill success">Early access</span>
          <span className="muted" style={{ fontSize: "0.92rem" }}>
            While we launch, everything below is free — the prices shown are what these plans
            will cost at general availability. Early-access usage is never retroactively billed.
          </span>
        </div>
      )}

      <section style={{ marginTop: "2rem" }}>
        <h2>For HOA &amp; condo boards</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.1rem", marginTop: "1rem" }}>
          <Tier
            name="Free"
            price="$0"
            cadence=""
            blurb="Find your next management company."
            items={[
              "Search the management-company directory",
              "The full board document template library",
              "Board profile",
            ]}
            cta="Browse the directory"
            href="/directory"
          />
          <Tier
            name="RFP transaction"
            price={`$${p.rfp_transaction_usd}`}
            cadence="per RFP"
            blurb="The complete guided process, one flat fee."
            items={[
              "AI-guided, state-aware RFP builder + PDF export",
              "Invite up to 10 companies with tracked bid links",
              "Normalized bids, weighted side-by-side scoring",
              "Immutable board decision report",
            ]}
            cta="Start an RFP"
            href="/intake"
            highlight
          />
          <Tier
            name="Board Premium"
            price={`$${p.board_premium_annual_usd}`}
            cadence="/year"
            blurb={`Discounted transactions ($${p.rfp_transaction_premium_usd}/RFP) + premium profile.`}
            items={[
              `RFP transactions at $${p.rfp_transaction_premium_usd} (save $${p.rfp_transaction_usd - p.rfp_transaction_premium_usd})`,
              "Premium board profile",
              "Priority support",
            ]}
            cta="Get Premium"
            href="/billing"
          />
        </div>
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2>For management companies</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.1rem", marginTop: "1rem" }}>
          <Tier
            name="Free"
            price="$0"
            cadence=""
            blurb="Be findable, respond when invited."
            items={[
              "Directory listing",
              "Saved company profile — bids arrive pre-filled",
              "Respond to direct board invitations",
            ]}
            cta="Vendor portal"
            href="/vendor"
          />
          <Tier
            name="Pay per response"
            price={`$${p.vendor_pay_per_response_usd}`}
            cadence="per response"
            blurb="No subscription — pay only when you bid."
            items={[
              "Everything in Free",
              "Submit responses to any RFP you're invited to",
              "Structured format boards actually score",
            ]}
            cta="See how bidding works"
            href="/vendor"
          />
          <Tier
            name="Pro"
            price={`$${p.vendor_pro_monthly_usd}`}
            cadence="/month"
            blurb="For companies growing their portfolio."
            items={[
              "Unlimited RFP responses",
              "Responses ~85% pre-filled from your profile — review, price, send",
              "New-RFP opportunity notifications in your markets",
              "Full response tooling",
            ]}
            cta="Get Pro"
            href="/billing"
            highlight
          />
        </div>
      </section>

      <p className="muted" style={{ marginTop: "2rem", fontSize: "0.85rem", maxWidth: "44rem" }}>
        Prices in USD. Boards: the transaction fee covers one complete RFP process regardless
        of how many of your invited companies respond.
      </p>
    </main>
  );
}
