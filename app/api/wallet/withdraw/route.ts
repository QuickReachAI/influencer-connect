import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { walletService } from '@/lib/services/wallet.service';
import { walletWithdrawSchema } from '@/lib/validations';
import { paymentLimiter } from '@/lib/rate-limit';

/** POST /api/wallet/withdraw — Request withdrawal */
export async function POST(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = await paymentLimiter(userId);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = walletWithdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await walletService.withdraw(
      userId,
      parsed.data.amount,
      'Withdrawal request'
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Withdrawal failed' },
      { status: 400 }
    );
  }
}
