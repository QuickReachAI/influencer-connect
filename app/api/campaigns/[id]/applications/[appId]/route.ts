import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { campaignService } from '@/lib/services/campaign.service';
import { getAuthUserId } from '@/lib/auth-helpers';

/** PATCH /api/campaigns/:id/applications/:appId — Accept/reject application */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { brandProfile: { select: { id: true } } },
    });
    if (!user || user.role !== 'BRAND' || !user.brandProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { appId } = await params;
    const body = await request.json();
    const status = body.status as 'ACCEPTED' | 'REJECTED';

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be ACCEPTED or REJECTED' }, { status: 400 });
    }

    const result = await campaignService.reviewApplication(
      appId,
      user.brandProfile.id,
      status
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Review application error:', error);
    const statusCode = error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: statusCode });
  }
}
