/**
 * POST /api/admin/directory/import — CSV import for the marketplace
 * directory (ADMIN). Body: text/csv or {csv: "..."} JSON. Header row must
 * include company_name + state; optional: company_email, phone, website,
 * city, market, units_managed, description. Upserts on (company_name, state).
 * This is how the chairman's Oregon dataset loads.
 */
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { importDirectoryCompanies } from "@/lib/hoa/directory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let csv = "";
  const ctype = request.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      const body = (await request.json()) as { csv?: string };
      csv = body.csv ?? "";
    } else {
      csv = await request.text();
    }
  } catch {
    return NextResponse.json({ error: "unreadable body" }, { status: 400 });
  }
  if (!csv.trim()) return NextResponse.json({ error: "empty CSV" }, { status: 400 });
  if (csv.length > 5_000_000) return NextResponse.json({ error: "CSV too large (5MB max)" }, { status: 413 });

  const result = await importDirectoryCompanies(csv);
  return NextResponse.json(result, { status: result.errors.length && !result.inserted && !result.updated ? 400 : 200 });
}
