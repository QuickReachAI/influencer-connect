import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { campaignService } from '@/lib/services/campaign.service';
import { campaignUpdateSchema } from '@/lib/validations';

/** GET /api/campaigns/:id — Campaign details */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const campaign = await campaignService.getById(id);
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/campaigns/:id — Update/publish/pause/cancel campaign */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { brandProfile: { select: { id: true } } },
    });
    if (!user || user.role !== 'BRAND' || !user.brandProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle status changes
    if (body.action === 'publish') {
      const result = await campaignService.publish(id, user.brandProfile.id);
      return NextResponse.json(result);
    }
    if (body.action === 'pause') {
      const result = await campaignService.pause(id, user.brandProfile.id);
      return NextResponse.json(result);
    }
    if (body.action === 'cancel') {
      const result = await campaignService.cancel(id, user.brandProfile.id);
      return NextResponse.json(result);
    }

    // General update
    const parsed = campaignUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.campaign.update({
      where: { id, brandId: user.brandProfile.id },
      data: parsed.data as any,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update campaign error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
