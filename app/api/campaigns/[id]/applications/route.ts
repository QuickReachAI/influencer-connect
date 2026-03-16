import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserId } from '@/lib/auth-helpers';

/** GET /api/campaigns/:id/applications — Brand views applications for a campaign */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id, brandId: user.brandProfile.id },
    });
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const applications = await prisma.campaignApplication.findMany({
      where: { campaignId: id },
      include: {
        entity: true,
        applicant: {
          select: { email: true, creatorProfile: { select: { name: true, avatar: true } } },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    return NextResponse.json(applications);
  } catch (error: any) {
    console.error('Get applications error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
