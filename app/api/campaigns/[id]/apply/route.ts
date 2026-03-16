import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { campaignService } from '@/lib/services/campaign.service';
import { campaignApplicationSchema } from '@/lib/validations';
import { getAuthUserId } from '@/lib/auth-helpers';

/** POST /api/campaigns/:id/apply — Creator applies with social entity */
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
      return NextResponse.json({ error: 'Only creators can apply' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = campaignApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const application = await campaignService.apply(
      id,
      parsed.data.entityId,
      userId,
      parsed.data.creatorMessage,
      parsed.data.proposedRate
    );

    return NextResponse.json(application, { status: 201 });
  } catch (error: any) {
    console.error('Apply to campaign error:', error);
    const status = error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}
