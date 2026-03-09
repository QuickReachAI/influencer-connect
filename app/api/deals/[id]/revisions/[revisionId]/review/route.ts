import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { revisionService } from '@/lib/services/revision.service';
import prisma from '@/lib/prisma';

/**
 * POST /api/deals/:id/revisions/:revisionId/review
 * Body: { action: 'approve' | 'request_revision', feedback?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, revisionId } = await params;

  // Verify user is the brand on this deal
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || deal.brandId !== userId) {
    return NextResponse.json({ error: 'Only the brand can review revisions' }, { status: 403 });
  }

  const { action, feedback } = await request.json();

  try {
    if (action === 'approve') {
      const result = await revisionService.approveRevision(id, revisionId, userId);
      return NextResponse.json(result);
    }

    if (action === 'request_revision' && feedback) {
      const result = await revisionService.requestRevision(id, userId, feedback);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Review failed' },
      { status: 400 }
    );
  }
}
