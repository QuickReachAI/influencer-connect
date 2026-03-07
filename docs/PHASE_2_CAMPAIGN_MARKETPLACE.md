# Phase 2: Campaign Marketplace & Discovery

## 1. Overview

Phase 2 builds the campaign marketplace on top of the Phase 1 schema. Brands create campaigns, creators discover and apply to them through their social entities, and an exclusive negotiation (lock) system ensures one-at-a-time deal flow per entity.

**Delivers**: Campaign CRUD, trickle-down visibility, creator discovery, campaign applications, exclusive negotiation locks, profile completion scoring in discovery.

**Dependencies**: Phase 1 complete (all models, enums, Inngest infrastructure, SocialEntity service, Wallet service).

---

## 2. Prerequisites

### npm packages

No new packages required beyond Phase 1.

### Environment variables

No new environment variables required.

### Prior phase completion checks

- [ ] All Phase 1 migrations applied (`SocialEntity`, `Campaign`, `CampaignApplication`, `ExclusiveNegotiation` tables exist)
- [ ] Inngest serve endpoint running at `/api/inngest`
- [ ] `socialEntityService` functional
- [ ] GIN indexes on `SocialEntity.niche` and `Campaign.niche` exist

---

## 3. Schema Changes

No new schema changes. All models used in this phase were created in Phase 1.

---

## 4. Service Layer

### 4.1 Campaign Service — `lib/services/campaign.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';
import { inngest } from '@/lib/inngest/client';
import type { CampaignStatus, CampaignApplicationStatus } from '@prisma/client';

interface CreateCampaignInput {
  brandProfileId: string;
  title: string;
  description: string;
  niche: string[];
  minFollowers?: number;
  maxFollowers?: number;
  contentFormat: string[];
  duration?: string;
  ownershipTransfer?: boolean;
  budget: number;
  expiresAt?: Date;
}

interface DiscoverFilters {
  platform?: string;
  niche?: string[];
  minBudget?: number;
  maxBudget?: number;
  contentFormat?: string[];
  page?: number;
  pageSize?: number;
}

export class CampaignService {
  /**
   * Create a new campaign (brand only, KYC required).
   * Status starts as DRAFT. Brand must explicitly publish.
   */
  async create(input: CreateCampaignInput): Promise<any> {
    return prisma.campaign.create({
      data: {
        brandId: input.brandProfileId,
        title: input.title,
        description: input.description,
        niche: input.niche,
        minFollowers: input.minFollowers ?? 0,
        maxFollowers: input.maxFollowers ?? 999999999,
        contentFormat: input.contentFormat as any[],
        duration: input.duration,
        ownershipTransfer: input.ownershipTransfer ?? false,
        budget: input.budget,
        expiresAt: input.expiresAt,
        status: 'DRAFT',
      },
      include: { brand: true },
    });
  }

  /**
   * Publish a campaign: set status ACTIVE, record publishedAt,
   * emit Inngest event for trickle-down visibility.
   */
  async publish(campaignId: string, brandProfileId: string): Promise<any> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.brandId !== brandProfileId) {
      throw new Error('Campaign not found or unauthorized');
    }
    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      throw new Error('Campaign must be in DRAFT or PAUSED status to publish');
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
        visibilityTier: 1,
      },
    });

    // Emit visibility event for trickle-down
    await inngest.send({
      name: 'campaign/published',
      data: { campaignId },
    });

    return updated;
  }

  /** Pause an active campaign */
  async pause(campaignId: string, brandProfileId: string): Promise<any> {
    return this.updateStatus(campaignId, brandProfileId, 'ACTIVE', 'PAUSED');
  }

  /** Cancel a campaign (irreversible) */
  async cancel(campaignId: string, brandProfileId: string): Promise<any> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || campaign.brandId !== brandProfileId) {
      throw new Error('Campaign not found or unauthorized');
    }
    if (campaign.status === 'CANCELLED' || campaign.status === 'COMPLETED') {
      throw new Error('Campaign is already finalized');
    }
    return prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Discover campaigns for a creator's social entity.
   * Applies trickle-down visibility tier filtering based on entity rating.
   *
   * Visibility logic:
   * - Tier 1 (rating 4.0-5.0): See immediately after publish
   * - Tier 2 (rating 3.0-3.99): See 1 hour after publish
   * - Tier 3 (rating < 3.0): See 2 hours after publish
   */
  async discover(entityId: string, filters: DiscoverFilters): Promise<any> {
    const entity = await prisma.socialEntity.findUnique({
      where: { id: entityId },
    });
    if (!entity) throw new Error('Entity not found');

    const now = new Date();
    const rating = Number(entity.rating);

    // Determine which campaigns are visible based on entity rating
    let minPublishedBefore: Date;
    if (rating >= 4.0) {
      minPublishedBefore = now; // See immediately
    } else if (rating >= 3.0) {
      minPublishedBefore = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
    } else {
      minPublishedBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where: any = {
      status: 'ACTIVE',
      publishedAt: { lte: minPublishedBefore },
      minFollowers: { lte: entity.followerCount },
      maxFollowers: { gte: entity.followerCount },
    };

    if (filters.niche && filters.niche.length > 0) {
      where.niche = { hasSome: filters.niche };
    }
    if (filters.minBudget) {
      where.budget = { ...(where.budget ?? {}), gte: filters.minBudget };
    }
    if (filters.maxBudget) {
      where.budget = { ...(where.budget ?? {}), lte: filters.maxBudget };
    }
    if (filters.contentFormat && filters.contentFormat.length > 0) {
      where.contentFormat = { hasSome: filters.contentFormat };
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          brand: { include: { user: { select: { email: true } } } },
          _count: { select: { applications: true } },
        },
        orderBy: [{ publishedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.campaign.count({ where }),
    ]);

    return { campaigns, total, page, pageSize };
  }

  /**
   * Creator applies to a campaign with a specific social entity.
   * Enforces unique application per entity per campaign.
   */
  async apply(
    campaignId: string,
    entityId: string,
    applicantId: string,
    message?: string,
    proposedRate?: number
  ): Promise<any> {
    // Verify campaign is active
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || campaign.status !== 'ACTIVE') {
      throw new Error('Campaign not found or not accepting applications');
    }

    // Verify entity belongs to applicant
    const entity = await prisma.socialEntity.findUnique({
      where: { id: entityId },
    });
    if (!entity || entity.masterId !== applicantId) {
      throw new Error('Entity not found or unauthorized');
    }

    // Check follower range
    if (
      entity.followerCount < campaign.minFollowers ||
      entity.followerCount > campaign.maxFollowers
    ) {
      throw new Error('Entity does not meet follower requirements');
    }

    return prisma.campaignApplication.create({
      data: {
        campaignId,
        entityId,
        applicantId,
        creatorMessage: message,
        proposedRate,
        status: 'PENDING',
      },
    });
  }

  /**
   * Brand reviews a campaign application (accept/reject).
   * On accept: creates a Deal linked to campaign + entity,
   * then initiates exclusive negotiation lock.
   */
  async reviewApplication(
    applicationId: string,
    brandProfileId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<any> {
    const application = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: {
        campaign: true,
        entity: { include: { master: true } },
      },
    });

    if (!application) throw new Error('Application not found');
    if (application.campaign.brandId !== brandProfileId) {
      throw new Error('Unauthorized');
    }
    if (application.status !== 'PENDING') {
      throw new Error('Application already reviewed');
    }

    const updated = await prisma.campaignApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    // On accept: create deal + lock
    if (status === 'ACCEPTED') {
      const deal = await prisma.deal.create({
        data: {
          brandId: application.campaign.brand.userId,
          creatorId: application.entity.masterId,
          entityId: application.entityId,
          campaignId: application.campaignId,
          title: `${application.campaign.title} - ${application.entity.handle}`,
          description: application.campaign.description,
          totalAmount: application.proposedRate ?? application.campaign.budget,
          platformFee:
            Number(application.proposedRate ?? application.campaign.budget) * 0.05,
          creatorPayout:
            Number(application.proposedRate ?? application.campaign.budget) * 0.95,
          status: 'LOCKED',
        },
      });

      // Create exclusive negotiation lock
      await prisma.exclusiveNegotiation.create({
        data: {
          dealId: deal.id,
          entityId: application.entityId,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
        },
      });

      return { application: updated, deal };
    }

    return { application: updated };
  }

  /** Get brand's own campaigns */
  async listByBrand(brandProfileId: string): Promise<any[]> {
    return prisma.campaign.findMany({
      where: { brandId: brandProfileId },
      include: { _count: { select: { applications: true, deals: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get campaign by ID with full details */
  async getById(campaignId: string): Promise<any> {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        brand: { include: { user: { select: { email: true } } } },
        applications: {
          include: {
            entity: true,
            applicant: { select: { email: true, creatorProfile: true } },
          },
          orderBy: { appliedAt: 'desc' },
        },
        _count: { select: { deals: true } },
      },
    });
  }

  private async updateStatus(
    campaignId: string,
    brandProfileId: string,
    expectedStatus: CampaignStatus,
    newStatus: CampaignStatus
  ): Promise<any> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || campaign.brandId !== brandProfileId) {
      throw new Error('Campaign not found or unauthorized');
    }
    if (campaign.status !== expectedStatus) {
      throw new Error(`Campaign must be in ${expectedStatus} status`);
    }
    return prisma.campaign.update({
      where: { id: campaignId },
      data: { status: newStatus },
    });
  }
}

export const campaignService = new CampaignService();
```

### 4.2 Deal Lock Service — `lib/services/deal.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';

export class DealService {
  /**
   * Lock a deal for exclusive negotiation.
   * Checks that the entity has no other active lock.
   * Creates ExclusiveNegotiation record with 48h expiry.
   */
  async lockDeal(dealId: string, entityId: string, brandId: string): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

    // Check for existing active lock on this entity
    const existingLock = await prisma.exclusiveNegotiation.findFirst({
      where: { entityId, isActive: true },
    });
    if (existingLock) {
      throw new Error('This entity already has an active negotiation lock');
    }

    const lock = await prisma.exclusiveNegotiation.create({
      data: {
        dealId,
        entityId,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await prisma.deal.update({
      where: { id: dealId },
      data: { status: 'LOCKED' },
    });

    return lock;
  }

  /**
   * Creator accepts a lock — deal moves to SCRIPT_PENDING.
   * Lock persists until deal completes or is cancelled.
   */
  async acceptLock(dealId: string, creatorId: string): Promise<any> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { exclusiveNegotiations: { where: { isActive: true } } },
    });

    if (!deal || deal.creatorId !== creatorId) {
      throw new Error('Deal not found or unauthorized');
    }
    if (deal.status !== 'LOCKED') {
      throw new Error('Deal is not in LOCKED status');
    }

    return prisma.deal.update({
      where: { id: dealId },
      data: { status: 'SCRIPT_PENDING' },
    });
  }

  /**
   * Creator rejects a lock — releases the lock, cancels the deal.
   */
  async rejectLock(dealId: string, creatorId: string): Promise<any> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { exclusiveNegotiations: { where: { isActive: true } } },
    });

    if (!deal || deal.creatorId !== creatorId) {
      throw new Error('Deal not found or unauthorized');
    }
    if (deal.status !== 'LOCKED') {
      throw new Error('Deal is not in LOCKED status');
    }

    // Release lock
    if (deal.exclusiveNegotiations[0]) {
      await prisma.exclusiveNegotiation.update({
        where: { id: deal.exclusiveNegotiations[0].id },
        data: { isActive: false, releasedAt: new Date() },
      });
    }

    return prisma.deal.update({
      where: { id: dealId },
      data: { status: 'CANCELLED' },
    });
  }
}

export const dealService = new DealService();
```

### 4.3 Profile Completion in Discovery

Already implemented in `lib/services/social-entity.service.ts` (Phase 1 section 4.6, `recalculateCompletionScore`). Used as secondary sort in `campaignService.discover()` — add to `orderBy`:

```typescript
orderBy: [
  { publishedAt: 'desc' },
  // Secondary: entities with higher completionScore rank higher in results
],
```

---

## 5. API Routes

### 5.1 `app/api/campaigns/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/services/campaign.service';
import { campaignCreateSchema } from '@/lib/validations';
import { apiLimiter } from '@/lib/rate-limit';

/**
 * POST /api/campaigns — Create a campaign (brand only, KYC required)
 * GET  /api/campaigns — List campaigns (role-based)
 *   - Brand: own campaigns
 *   - Creator: discovery view with visibility tier filtering
 *   - Admin: ?mode=discover|manage override
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Only brands can create campaigns' }, { status: 403 });
  }

  const rateLimitResult = await apiLimiter(session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = campaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await campaignService.create({
    brandProfileId: session.user.brandProfileId,
    ...parsed.data,
  });

  return NextResponse.json(campaign, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (session.user.role === 'BRAND' || mode === 'manage') {
    const campaigns = await campaignService.listByBrand(session.user.brandProfileId);
    return NextResponse.json(campaigns);
  }

  // Creator discovery
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
```

### 5.2 `app/api/campaigns/[id]/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/services/campaign.service';
import { campaignUpdateSchema } from '@/lib/validations';

/** GET /api/campaigns/:id — Campaign details */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const campaign = await campaignService.getById(id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(campaign);
}

/** PATCH /api/campaigns/:id — Update/pause/cancel campaign */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Handle status changes
  if (body.action === 'publish') {
    const result = await campaignService.publish(id, session.user.brandProfileId);
    return NextResponse.json(result);
  }
  if (body.action === 'pause') {
    const result = await campaignService.pause(id, session.user.brandProfileId);
    return NextResponse.json(result);
  }
  if (body.action === 'cancel') {
    const result = await campaignService.cancel(id, session.user.brandProfileId);
    return NextResponse.json(result);
  }

  // General update
  const parsed = campaignUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Direct prisma update for field changes
  const updated = await prisma.campaign.update({
    where: { id, brandId: session.user.brandProfileId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
```

### 5.3 `app/api/campaigns/[id]/apply/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/services/campaign.service';
import { campaignApplicationSchema } from '@/lib/validations';

/** POST /api/campaigns/:id/apply — Creator applies with social entity */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CREATOR') {
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
    session.user.id,
    parsed.data.creatorMessage,
    parsed.data.proposedRate
  );

  return NextResponse.json(application, { status: 201 });
}
```

### 5.4 `app/api/campaigns/[id]/applications/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** GET /api/campaigns/:id/applications — Brand views applications */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id, brandId: session.user.brandProfileId },
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
}
```

### 5.5 `app/api/campaigns/[id]/applications/[appId]/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/services/campaign.service';

/** PATCH /api/campaigns/:id/applications/:appId — Accept/reject application */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { appId } = await params;
  const body = await request.json();
  const status = body.status as 'ACCEPTED' | 'REJECTED';

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const result = await campaignService.reviewApplication(
    appId,
    session.user.brandProfileId,
    status
  );

  return NextResponse.json(result);
}
```

### 5.6 `app/api/social-entities/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { socialEntityService } from '@/lib/services/social-entity.service';
import { socialEntityCreateSchema } from '@/lib/validations';

/** GET /api/social-entities — List creator's entities */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entities = await socialEntityService.listByUser(session.user.id);
  return NextResponse.json(entities);
}

/** POST /api/social-entities — Add social entity */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CREATOR') {
    return NextResponse.json({ error: 'Only creators can add entities' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = socialEntityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entity = await socialEntityService.create({
    masterId: session.user.id,
    ...parsed.data,
  });

  return NextResponse.json(entity, { status: 201 });
}
```

### 5.7 `app/api/social-entities/[id]/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { socialEntityService } from '@/lib/services/social-entity.service';
import { socialEntityUpdateSchema } from '@/lib/validations';

/** GET /api/social-entities/:id — Entity details */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const entity = await socialEntityService.getById(id, session.user.id);
  return NextResponse.json(entity);
}

/** PATCH /api/social-entities/:id — Update entity profile */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = socialEntityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entity = await socialEntityService.update(id, session.user.id, parsed.data);
  return NextResponse.json(entity);
}

/** DELETE /api/social-entities/:id — Deactivate entity */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await socialEntityService.deactivate(id, session.user.id);
  return NextResponse.json({ success: true });
}
```

### 5.8 `app/api/social-entities/[id]/completion/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { socialEntityService } from '@/lib/services/social-entity.service';

/** GET /api/social-entities/:id/completion — Profile completion breakdown */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const score = await socialEntityService.recalculateCompletionScore(id);

  return NextResponse.json({ entityId: id, completionScore: score });
}
```

### 5.9 `app/api/deals/[id]/lock/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dealService } from '@/lib/services/deal.service';
import { dealLockSchema } from '@/lib/validations';

/** POST /api/deals/:id/lock — Lock deal for exclusive negotiation (brand) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = dealLockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lock = await dealService.lockDeal(id, parsed.data.entityId, session.user.id);
  return NextResponse.json(lock, { status: 201 });
}
```

### 5.10 `app/api/deals/[id]/lock/accept/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dealService } from '@/lib/services/deal.service';

/** POST /api/deals/:id/lock/accept — Creator accepts lock */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const deal = await dealService.acceptLock(id, session.user.id);
  return NextResponse.json(deal);
}
```

### 5.11 `app/api/deals/[id]/lock/reject/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dealService } from '@/lib/services/deal.service';

/** POST /api/deals/:id/lock/reject — Creator rejects lock */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const deal = await dealService.rejectLock(id, session.user.id);
  return NextResponse.json(deal);
}
```

### 5.12 Modifications to Existing Routes

#### `app/api/influencers/route.ts`

Replace CreatorProfile JSON-based social platform querying with `SocialEntity` table:

```typescript
// BEFORE: Filtering on CreatorProfile.socialPlatforms JSON field
// AFTER: Join to SocialEntity table

const entities = await prisma.socialEntity.findMany({
  where: {
    isActive: true,
    platform: filters.platform ? filters.platform : undefined,
    followerCount: { gte: filters.minFollowers, lte: filters.maxFollowers },
    niche: filters.niche ? { hasSome: filters.niche } : undefined,
  },
  include: {
    master: {
      include: { creatorProfile: true },
    },
  },
  orderBy: [
    { completionScore: 'desc' },
    { rating: 'desc' },
  ],
});
```

#### `app/api/deals/route.ts`

Accept optional `entityId` and `campaignId` when creating deals:

```typescript
// Add to deal creation input:
entityId: body.entityId ?? null,
campaignId: body.campaignId ?? null,
```

---

## 6. Inngest Functions

### 6.1 Campaign Visibility Cron — `lib/inngest/functions/campaign-visibility.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';

/**
 * Hourly cron: update campaign visibility tiers.
 * - Tier 1 (immediately): creators with rating >= 4.0
 * - Tier 2 (after 1h): creators with rating >= 3.0
 * - Tier 3 (after 2h): all creators
 *
 * The tier is stored on the Campaign model for query filtering.
 * See campaignService.discover() for how tiers affect queries.
 */
export const campaignVisibilityFunction = inngest.createFunction(
  {
    id: 'campaign-visibility-update',
    name: 'Campaign Visibility Tier Update',
  },
  { cron: '*/30 * * * *' }, // Every 30 minutes
  async ({ step }) => {
    const now = new Date();

    // Upgrade tier 1 → tier 2 (campaigns published > 1h ago)
    const tier2Count = await step.run('upgrade-to-tier-2', async () => {
      const result = await prisma.campaign.updateMany({
        where: {
          status: 'ACTIVE',
          visibilityTier: 1,
          publishedAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) },
        },
        data: { visibilityTier: 2 },
      });
      return result.count;
    });

    // Upgrade tier 2 → tier 3 (campaigns published > 2h ago)
    const tier3Count = await step.run('upgrade-to-tier-3', async () => {
      const result = await prisma.campaign.updateMany({
        where: {
          status: 'ACTIVE',
          visibilityTier: 2,
          publishedAt: { lt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        },
        data: { visibilityTier: 3 },
      });
      return result.count;
    });

    return { tier2Upgraded: tier2Count, tier3Upgraded: tier3Count };
  }
);
```

### 6.2 Deal Lock Cleanup Cron — `lib/inngest/functions/deal-locks.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';

/**
 * Hourly cron: release expired exclusive negotiation locks.
 * Locks expire 48h after creation if creator hasn't accepted.
 */
export const dealLockCleanupFunction = inngest.createFunction(
  {
    id: 'deal-lock-cleanup',
    name: 'Expired Deal Lock Cleanup',
  },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    const releasedCount = await step.run('release-expired-locks', async () => {
      const expired = await prisma.exclusiveNegotiation.findMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() },
        },
        include: { deal: true },
      });

      for (const lock of expired) {
        await prisma.$transaction([
          prisma.exclusiveNegotiation.update({
            where: { id: lock.id },
            data: { isActive: false, releasedAt: new Date() },
          }),
          prisma.deal.update({
            where: { id: lock.dealId },
            data: { status: 'CANCELLED' },
          }),
        ]);
      }

      return expired.length;
    });

    return { releasedCount };
  }
);
```

**Register in `app/api/inngest/route.ts`**: Add both functions to the `functions` array.

---

## 7. Validation Schemas

All validation schemas for Phase 2 were added in Phase 1 (section 7):
- `campaignCreateSchema`
- `campaignUpdateSchema`
- `campaignApplicationSchema`
- `socialEntityCreateSchema`
- `socialEntityUpdateSchema`
- `dealLockSchema`

---

## 8. Frontend Changes

### 8.1 Brand Dashboard — Campaign Management

Modify `app/dashboard/brand/page.tsx` to add campaign creation and management:

- **"Create Campaign" button** → opens form using `campaignCreateSchema` fields
- **Campaign list** → cards showing title, status, application count, budget
- **Campaign detail** → view applications, accept/reject, see linked deals
- **Status actions** → publish, pause, cancel buttons

### 8.2 Creator Dashboard — Campaign Discovery

Modify `app/dashboard/influencer/page.tsx` to add campaign browsing:

- **Entity selector** → dropdown of creator's social entities (from `GET /api/social-entities`)
- **Campaign browse** → grid of active campaigns matching entity, with filters (niche, budget, content format)
- **Apply button** → opens modal with message + proposed rate fields
- **Lock notifications** → show pending lock requests with accept/reject

### 8.3 Deal Negotiation UI

Modify existing deal detail pages to support lock workflow:
- **LOCKED status badge** → shows "Exclusive Negotiation" with countdown timer (48h)
- **Creator view** → "Accept" and "Reject" buttons for lock
- **Brand view** → milestone form visible after lock accepted

---

## 9. Migration & Seed

No additional migrations beyond Phase 1. Campaign seed data was included in Phase 1 section 9.4.

---

## 10. Verification Checklist

1. [ ] Create campaign as brand → verify status is DRAFT
2. [ ] Publish campaign → verify `publishedAt` is set, status is ACTIVE
3. [ ] Check campaign visibility: high-rated entity sees immediately, low-rated entity doesn't see until 2h after publish
4. [ ] Wait 30 min for cron → verify `visibilityTier` updates from 1 → 2 → 3
5. [ ] Apply as creator → verify `CampaignApplication` created with PENDING status
6. [ ] Apply again with same entity → verify unique constraint error
7. [ ] Brand accepts application → verify Deal created with LOCKED status + ExclusiveNegotiation record
8. [ ] Try to lock same entity in another deal → verify "already has active lock" error
9. [ ] Creator accepts lock → verify deal status moves to SCRIPT_PENDING
10. [ ] Creator rejects lock → verify lock released, deal cancelled
11. [ ] Wait for lock expiry (set to 1min in test) → verify cron releases it
12. [ ] Verify `GET /api/social-entities` returns creator's entities
13. [ ] Verify `POST /api/social-entities` creates entity with correct platform/handle
14. [ ] Verify `GET /api/social-entities/:id/completion` returns completion score
15. [ ] Verify `GET /api/influencers` now uses SocialEntity table instead of CreatorProfile JSON
