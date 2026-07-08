import { NextRequest, NextResponse } from 'next/server';
import { getInvitationsNeedingNudge, markNudgeSent, sendNudgeEmail } from '@/lib/hoa/invitations';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://localhost:3000';

  let candidates;
  try {
    candidates = await getInvitationsNeedingNudge();
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to query nudge candidates', detail: String(err) },
      { status: 500 }
    );
  }

  const results: Array<{ invitationId: string; email: string; status: string; error?: string }> = [];

  for (const candidate of candidates) {
    const bidUrl = `${baseUrl}/bid/${candidate.token}`;
    try {
      await sendNudgeEmail(
        candidate.companyEmail,
        candidate.companyName,
        candidate.rfpTitle,
        bidUrl,
        candidate.daysLeft
      );
      await markNudgeSent(candidate.invitationId);
      results.push({ invitationId: candidate.invitationId, email: candidate.companyEmail, status: 'sent' });
    } catch (err) {
      results.push({
        invitationId: candidate.invitationId,
        email: candidate.companyEmail,
        status: 'failed',
        error: String(err),
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
    timestamp: new Date().toISOString(),
  });
}
