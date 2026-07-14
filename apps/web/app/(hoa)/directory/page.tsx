/**
 * /directory — the management-company marketplace (per-market rollout,
 * Oregon first). Free for boards: browse and search, then invite a company
 * straight into an RFP. Freemium per the chairman's model — search is free,
 * the RFP workflow is the transaction.
 */
import type { JSX } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { searchDirectoryCompanies, directoryStats } from "@/lib/hoa/directory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Management Company Directory | Boardwell",
  description:
    "Browse HOA management companies in your market, compare basics, and invite them into a structured RFP — free for boards.",
};

interface PageProps {
  searchParams: { q?: string; state?: string };
}

export default async function DirectoryPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const state = (searchParams.state ?? "OR").toUpperCase();
  const q = searchParams.q ?? "";
  const [companies, stats] = await Promise.all([
    searchDirectoryCompanies({ state, q, limit: 50 }),
    directoryStats(),
  ]);
  const statesWithData = stats.filter((s) => s.companies > 0);

  return (
    <main>
      <span className="eyebrow">Marketplace</span>
      <h1 style={{ marginBottom: "0.5rem" }}>Management company directory</h1>
      <p style={{ maxWidth: "44rem" }}>
        Browse the management companies serving your market, then invite the ones that fit
        into a structured RFP — every bid comes back in the same format, scored side by side.
        Searching is free for boards.
      </p>

      <form method="GET" className="toolbar" style={{ marginTop: "1rem" }}>
        <label htmlFor="dir-q" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, minWidth: 220 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Search companies</span>
          <input id="dir-q" type="text" name="q" defaultValue={q} placeholder="Name, city, or specialty" />
        </label>
        <label htmlFor="dir-state" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>State</span>
          <select id="dir-state" name="state" defaultValue={state}>
            <option value="OR">Oregon</option>
            <option value="FL">Florida</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
            <option value="AZ">Arizona</option>
            <option value="NV">Nevada</option>
            <option value="WA">Washington</option>
          </select>
        </label>
        <button type="submit" style={{ alignSelf: "flex-end" }}>Search</button>
      </form>

      {companies.length === 0 ? (
        <div className="empty" style={{ marginTop: "1.5rem" }}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>
            {q
              ? `No companies match “${q}” in ${state}.`
              : `We're rolling the directory out market by market — ${state} listings are coming.`}
          </p>
          <p className="muted" style={{ maxWidth: "36rem", margin: "0 auto" }}>
            {statesWithData.length > 0
              ? `Markets live today: ${statesWithData.map((s) => `${s.state} (${s.companies})`).join(" · ")}.`
              : "The first market launches shortly."}{" "}
            You can always invite any management company by email directly from your{" "}
            <Link href="/rfps">RFP</Link> — the directory just makes finding them faster.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.1rem",
            marginTop: "1.5rem",
          }}
        >
          {companies.map((c) => (
            <div key={c.id} className="feature-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{c.company_name}</h3>
              <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                {[c.city, c.state].filter(Boolean).join(", ")}
                {c.units_managed ? ` · ~${c.units_managed} units managed` : ""}
              </p>
              {c.description ? (
                <p className="muted" style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.55, flex: 1 }}>
                  {c.description.length > 160 ? c.description.slice(0, 160) + "…" : c.description}
                </p>
              ) : <span style={{ flex: 1 }} />}
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.85rem" }}>
                {c.website && (
                  <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                )}
                {c.phone && <span className="muted">{c.phone}</span>}
              </div>
              {c.company_email ? (
                <Link
                  href={`/rfps?invite_name=${encodeURIComponent(c.company_name)}&invite_email=${encodeURIComponent(c.company_email)}`}
                  className="btn secondary"
                  style={{ fontSize: "0.85rem", alignSelf: "flex-start" }}
                >
                  Invite to an RFP
                </Link>
              ) : (
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  Contact info pending — invite by email from your RFP.
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="cta-band" style={{ marginTop: "3rem", padding: "2rem" }}>
        <h2 style={{ marginTop: 0 }}>Are you a management company?</h2>
        <p style={{ maxWidth: "42rem" }}>
          Get listed, keep your credentials on file once, and respond to RFPs mostly
          pre-filled — you review, price the community, and submit.
        </p>
        <Link href="/vendor" className="btn">Vendor portal</Link>
      </section>
    </main>
  );
}
