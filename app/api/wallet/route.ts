import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { walletService } from '@/lib/services/wallet.service';

/** GET /api/wallet — Balance + recent transactions */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = await walletService.getOrCreateWallet(userId);
  return NextResponse.json(wallet);
}
