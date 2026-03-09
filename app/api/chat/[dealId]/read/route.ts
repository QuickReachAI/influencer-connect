import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { triggerDealEvent } from '@/lib/pusher';
import { readReceiptSchema } from '@/lib/validations';

/**
 * POST /api/chat/:dealId/read — Mark messages as read + trigger receipt
 * Body: { lastReadMessageId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const userId = getUserIdFromCookies(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dealId } = await params;
  const body = await request.json();

  const parsed = readReceiptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { lastReadMessageId } = parsed.data;

  await triggerDealEvent(dealId, 'read-receipt', {
    userId,
    lastReadMessageId,
    readAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
