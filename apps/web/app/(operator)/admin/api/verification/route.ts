import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getVerificationQueue, submitVerificationReview } from '@/lib/hoa/verification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const g = await requireAdmin();
  if (!g.admin) return g.response;

  try {
    const queue = await getVerificationQueue();
    return NextResponse.json({ queue });
  } catch (err) {
    return NextResponse.json(
      { queue: [], error: String(err).slice(0, 300) },
      { status: 200 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const g = await requireAdmin();
  if (!g.admin) return g.response;

  let body: {
    submission_id: string;
    rfp_id: string;
    action: 'approve' | 'reject';
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { submission_id, rfp_id, action, notes } = body;

  if (!submission_id || !rfp_id) {
    return NextResponse.json({ error: 'submission_id and rfp_id are required' }, { status: 400 });
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const result = await submitVerificationReview(
    submission_id,
    rfp_id,
    g.admin.id,
    g.admin.email,
    action,
    notes ?? null,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
