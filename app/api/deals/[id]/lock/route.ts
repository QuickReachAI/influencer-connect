import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dealService } from '@/lib/services/deal.service';
import { dealLockSchema } from '@/lib/validations';

/** POST /api/deals/:id/lock — Lock deal for exclusive negotiation (brand) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== 'BRAND') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = dealLockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const lock = await dealService.lockDeal(id, parsed.data.entityId, userId);
    return NextResponse.json(lock, { status: 201 });
  } catch (error: any) {
    console.error('Lock deal error:', error);
    const status = error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}
