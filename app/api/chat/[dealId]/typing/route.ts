import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { triggerDealEvent } from '@/lib/pusher';
import { chatLimiter } from '@/lib/rate-limit';
import { typingSchema } from '@/lib/validations';

/**
 * POST /api/chat/:dealId/typing — Trigger typing indicator
 * Body: { action: 'start' | 'stop' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const userId = getUserIdFromCookies(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitResult = await chatLimiter(userId);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { dealId } = await params;
  const body = await request.json();

  const parsed = typingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { action } = parsed.data;

  await triggerDealEvent(dealId, action === 'start' ? 'typing-start' : 'typing-stop', {
    userId,
  });

  return NextResponse.json({ success: true });
}
