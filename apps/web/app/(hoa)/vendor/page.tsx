/**
 * /vendor — management-company portal (phase 2 of the two-sided model from
 * the chairman's lab discussion 2026-07-08).
 *
 * A vendor logs in with the SAME email boards invite (their company email);
 * the page links the session to the hoa_vendor_profiles row by that email.
 * Here they maintain their core data ("the management company is responsible
 * for inputting and refreshing") and see every invitation across boards.
 * The token-based bid flow keeps working without an account — this portal is
 * the optional upgrade, not a wall.
 */
import type { JSX } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/admin-auth";
import {
  getVendorProfileByEmail,
  listVendorInvitations,
  updateVendorProfile,
} from "@/lib/hoa/vendor-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FIELDS: Array<{ key: string; label: string; section: string }> = [
  { key: "company_name", label: "Company name", section: "Company" },
  { key: "years_in_business", label: "Years in business", section: "Company" },
  { key: "company_description", label: "Company description", section: "Company" },
  { key: "cam_license_number", label: "CAM license number", section: "Licensing" },
  { key: "cam_license_state", label: "CAM license state", section: "Licensing" },
  { key: "cam_license_expiry", label: "CAM license expiry", section: "Licensing" },
  { key: "general_liability_amount", label: "General liability amount", section: "Insurance" },
  { key: "general_liability_expiry", label: "General liability expiry", section: "Insurance" },
  { key: "errors_omissions_amount", label: "E&O amount", section: "Insurance" },
  { key: "errors_omissions_expiry", label: "E&O expiry", section: "Insurance" },
  { key: "fidelity_bond_amount", label: "Fidelity bond amount", section: "Insurance" },
  { key: "insurance_carrier", label: "Insurance carrier", section: "Insurance" },
  { key: "annual_revenue", label: "Annual revenue", section: "Financial" },
  { key: "portfolio_unit_count", label: "Portfolio unit count", section: "Financial" },
  { key: "management_fee_base", label: "Base management fee (default)", section: "Financial" },
  { key: "management_fee_additional", label: "Additional fees (default)", section: "Financial" },
];

function StatusPill({ status }: { status: string }): JSX.Element {
  const cls = status === "submitted" ? "pill success" : "pill";
  const label: Record<string, string> = {
    invited: "Invited",
    opened: "Opened",
    submitted: "Submitted",
    declined: "Declined",
  };
  return <span className={cls}>{label[status] ?? status}</span>;
}

export default async function VendorPortalPage(): Promise<JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/vendor");

  const profile = await getVendorProfileByEmail(user.email);
  const invitations = profile ? await listVendorInvitations(user.email) : [];

  async function handleSave(formData: FormData): Promise<void> {
    "use server";
    const sessionUser = await getSessionUser();
    if (!sessionUser) redirect("/login?redirect=/vendor");
    const fields: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = formData.get(f.key);
      if (v !== null) fields[f.key] = String(v).trim();
    }
    await updateVendorProfile(sessionUser.email, fields);
    redirect("/vendor?saved=1");
  }

  if (!profile) {
    return (
      <main>
        <h1 style={{ marginBottom: "0.25rem" }}>Vendor portal</h1>
        <p className="muted" style={{ marginTop: 0, maxWidth: "44rem" }}>
          For management companies responding to Boardwell RFPs.
        </p>
        <div className="empty" style={{ marginTop: "1.5rem", maxWidth: "44rem" }}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>
            No vendor profile found for {user.email} yet.
          </p>
          <p className="muted" style={{ maxWidth: "36rem", margin: "0 auto" }}>
            Your profile is created the first time you submit a bid: when a board invites you
            to an RFP, open the invitation link from that email, complete the bid with
            &ldquo;save my company details&rdquo; checked, and your next invitation will arrive
            pre-filled. Make sure you log in here with the same email address boards invite.
          </p>
        </div>
      </main>
    );
  }

  const sections = Array.from(new Set(FIELDS.map((f) => f.section)));

  return (
    <main>
      <h1 style={{ marginBottom: "0.25rem" }}>Vendor portal</h1>
      <p className="muted" style={{ marginTop: 0, maxWidth: "44rem" }}>
        {profile.company_name ?? user.email} · Your saved details pre-fill every RFP response —
        keep them current and each new invitation is mostly review-and-price. Last updated{" "}
        {new Date(profile.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
      </p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem" }}>Your RFP invitations</h2>
        {invitations.length === 0 ? (
          <p className="muted">No invitations yet — boards invite you by email, and they appear here.</p>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.7rem" }}>RFP</th>
                  <th style={{ textAlign: "left", padding: "0.7rem" }}>Community</th>
                  <th style={{ textAlign: "left", padding: "0.7rem" }}>Invited</th>
                  <th style={{ textAlign: "left", padding: "0.7rem" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "0.7rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--substrate-border)" }}>
                    <td style={{ padding: "0.7rem", fontWeight: 600 }}>{inv.rfp_title}</td>
                    <td style={{ padding: "0.7rem" }}>{inv.community_name ?? "—"}</td>
                    <td style={{ padding: "0.7rem" }}>
                      {new Date(inv.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "0.7rem" }}>
                      <StatusPill status={inv.status} />
                    </td>
                    <td style={{ padding: "0.7rem" }}>
                      {inv.token && inv.status !== "submitted" && inv.status !== "declined" ? (
                        <Link href={`/bid/${inv.token}`} className="btn secondary" style={{ fontSize: "0.82rem", padding: "0.3rem 0.8rem" }}>
                          Respond
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: "2rem", maxWidth: "44rem" }}>
        <h2 style={{ fontSize: "1.15rem" }}>Core company data</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          This is what pre-fills your bids. Fees here are defaults — you set the actual fee per
          community on each response.
        </p>
        <form action={handleSave} className="surface" style={{ padding: "1.5rem" }}>
          {sections.map((section) => (
            <fieldset key={section} style={{ border: "none", padding: 0, margin: "0 0 1.25rem" }}>
              <legend style={{ fontWeight: 650, marginBottom: "0.6rem" }}>{section}</legend>
              {FIELDS.filter((f) => f.section === section).map((f) => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.8rem" }}>
                  <label htmlFor={`vp-${f.key}`} style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {f.label}
                  </label>
                  {f.key === "company_description" ? (
                    <textarea
                      id={`vp-${f.key}`}
                      name={f.key}
                      rows={3}
                      maxLength={2000}
                      defaultValue={(profile as unknown as Record<string, string | null>)[f.key] ?? ""}
                    />
                  ) : (
                    <input
                      id={`vp-${f.key}`}
                      name={f.key}
                      type="text"
                      maxLength={200}
                      defaultValue={(profile as unknown as Record<string, string | null>)[f.key] ?? ""}
                    />
                  )}
                </div>
              ))}
            </fieldset>
          ))}
          <button type="submit">Save profile</button>
        </form>
      </section>

      <section style={{ marginTop: "1.5rem", maxWidth: "44rem" }}>
        <h2 style={{ fontSize: "1.15rem" }}>References</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {profile.references_json.length > 0
            ? `${profile.references_json.length} saved reference${profile.references_json.length === 1 ? "" : "s"} (updated from your most recent bid): ${profile.references_json.map((r) => r.name).join(", ")}.`
            : "No references saved yet — they save from your next submitted bid."}{" "}
          References are edited on the bid form itself, so they stay tied to what you actually
          submitted.
        </p>
      </section>
    </main>
  );
}
