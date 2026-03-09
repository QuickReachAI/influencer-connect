import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { campaignService } from '@/lib/services/campaign.service';
import { campaignCreateSchema } from '@/lib/validations';
import { apiLimiter } from '@/lib/rate-limit';

/**
 * POST /api/campaigns — Create a campaign (brand only)
 * GET  /api/campaigns — List campaigns (brand: own, creator: discovery)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { success } = await apiLimiter(ip);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { brandProfile: { select: { id: true } } },
    });
    if (!user || user.role !== 'BRAND') {
      return NextResponse.json({ error: 'Only brands can create campaigns' }, { status: 403 });
    }
    if (!user.brandProfile) {
      return NextResponse.json({ error: 'Brand profile not found' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = campaignCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const campaign = await campaignService.create({
      brandProfileId: user.brandProfile.id,
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

const MOCK_CAMPAIGNS = [
  {
    id: 'camp-mock-1',
    title: 'Summer Skincare Collection Launch',
    description: 'Looking for beauty creators to showcase our new summer skincare line. Must create engaging content highlighting product benefits.',
    niche: ['Beauty', 'Skincare'],
    minFollowers: 10000,
    maxFollowers: 500000,
    contentFormat: ['REEL', 'SHORT'],
    duration: '30-60s',
    ownershipTransfer: true,
    budget: 50000,
    status: 'ACTIVE',
    publishedAt: new Date().toISOString(),
    expiresAt: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { applications: 8, deals: 0 },
  },
  {
    id: 'camp-mock-2',
    title: 'Tech Product Review Series',
    description: 'Need tech reviewers for our latest smartphone. Detailed honest review with camera comparisons.',
    niche: ['Technology', 'Gadgets'],
    minFollowers: 50000,
    maxFollowers: 2000000,
    contentFormat: ['VIDEO'],
    duration: '8-15 min',
    ownershipTransfer: true,
    budget: 100000,
    status: 'ACTIVE',
    publishedAt: new Date().toISOString(),
    expiresAt: null,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { applications: 15, deals: 1 },
  },
  {
    id: 'camp-mock-3',
    title: 'Fitness Challenge Campaign',
    description: 'Partner with us for a 3-month fitness challenge. Create motivational content and workout demos.',
    niche: ['Fitness', 'Health'],
    minFollowers: 5000,
    maxFollowers: 200000,
    contentFormat: ['REEL', 'SHORT', 'POST'],
    duration: '30-90s',
    ownershipTransfer: true,
    budget: 30000,
    status: 'DRAFT',
    publishedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    _count: { applications: 0, deals: 0 },
  },
];

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { brandProfile: { select: { id: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);

    // Mock mode: return mock campaigns for brands (no database)
    if (!process.env.DATABASE_URL && user.role === 'BRAND') {
      return NextResponse.json({ campaigns: MOCK_CAMPAIGNS });
    }

    // Brand: list own campaigns
    if (user.role === 'BRAND') {
      if (!user.brandProfile) {
        return NextResponse.json({ error: 'Brand profile not found' }, { status: 400 });
      }
      const campaigns = await campaignService.listByBrand(user.brandProfile.id);
      return NextResponse.json({ campaigns });
    }

    // Creator: discovery view
    if (user.role === 'CREATOR') {
      const entityId = searchParams.get('entityId');
      if (!entityId) {
        return NextResponse.json({ error: 'entityId required for discovery' }, { status: 400 });
      }

      const filters = {
        niche: searchParams.getAll('niche'),
        minBudget: searchParams.get('minBudget') ? Number(searchParams.get('minBudget')) : undefined,
        maxBudget: searchParams.get('maxBudget') ? Number(searchParams.get('maxBudget')) : undefined,
        page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
        pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
      };

      const result = await campaignService.discover(entityId, filters);
      return NextResponse.json(result);
    }

    // Admin: all campaigns
    const campaigns = await prisma.campaign.findMany({
      include: {
        brand: { include: { user: { select: { email: true } } } },
        _count: { select: { applications: true, deals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
