import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dealService } from '@/lib/services/deal.service';
import { getAuthUserId } from '@/lib/auth-helpers';

/** POST /api/deals/:id/lock/accept — Creator accepts lock */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== 'CREATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const deal = await dealService.acceptLock(id, userId);
    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Accept lock error:', error);
    const status = error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}
