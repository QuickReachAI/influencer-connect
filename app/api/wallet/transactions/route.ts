import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { walletService } from '@/lib/services/wallet.service';

/** GET /api/wallet/transactions — Transaction history (paginated) */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20');

  const result = await walletService.getTransactions(userId, page, pageSize);
  return NextResponse.json(result);
}
