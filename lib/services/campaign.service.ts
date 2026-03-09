import prisma from '@/lib/prisma';
import { inngest } from '@/lib/inngest/client';
import type { CampaignStatus } from '@prisma/client';

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
  niche?: string[];
  minBudget?: number;
  maxBudget?: number;
  contentFormat?: string[];
  page?: number;
  pageSize?: number;
}

export class CampaignService {
  /** Create a new campaign (brand only). Status starts as DRAFT. */
  async create(input: CreateCampaignInput) {
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

  /** Publish a campaign: set status ACTIVE, record publishedAt, emit Inngest event. */
  async publish(campaignId: string, brandProfileId: string) {
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

    await inngest.send({
      name: 'campaign/published',
      data: { campaignId },
    });

    return updated;
  }

  /** Pause an active campaign */
  async pause(campaignId: string, brandProfileId: string) {
    return this.updateStatus(campaignId, brandProfileId, 'ACTIVE', 'PAUSED');
  }

  /** Cancel a campaign (irreversible) */
  async cancel(campaignId: string, brandProfileId: string) {
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
   * Trickle-down visibility:
   * - Rating >= 4.0: see immediately
   * - Rating >= 3.0: see 1h after publish
   * - Rating < 3.0: see 2h after publish
   */
  async discover(entityId: string, filters: DiscoverFilters) {
    const entity = await prisma.socialEntity.findUnique({
      where: { id: entityId },
    });
    if (!entity) throw new Error('Entity not found');

    const now = new Date();
    const rating = Number(entity.rating);

    let minPublishedBefore: Date;
    if (rating >= 4.0) {
      minPublishedBefore = now;
    } else if (rating >= 3.0) {
      minPublishedBefore = new Date(now.getTime() - 60 * 60 * 1000);
    } else {
      minPublishedBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);
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

  /** Creator applies to a campaign with a specific social entity. */
  async apply(
    campaignId: string,
    entityId: string,
    applicantId: string,
    message?: string,
    proposedRate?: number
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || campaign.status !== 'ACTIVE') {
      throw new Error('Campaign not found or not accepting applications');
    }

    const entity = await prisma.socialEntity.findUnique({
      where: { id: entityId },
    });
    if (!entity || entity.masterId !== applicantId) {
      throw new Error('Entity not found or unauthorized');
    }

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
   * On accept: creates a Deal linked to campaign + entity + exclusive lock.
   */
  async reviewApplication(
    applicationId: string,
    brandProfileId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ) {
    const application = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: {
        campaign: {
          include: { brand: { include: { user: true } } },
        },
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

    if (status === 'ACCEPTED') {
      const amount = Number(application.proposedRate ?? application.campaign.budget);
      const deal = await prisma.deal.create({
        data: {
          brandId: application.campaign.brand.userId,
          creatorId: application.entity.masterId,
          entityId: application.entityId,
          campaignId: application.campaignId,
          title: `${application.campaign.title} - ${application.entity.handle}`,
          description: application.campaign.description,
          totalAmount: amount,
          platformFee: amount * 0.05,
          creatorPayout: amount * 0.95,
          status: 'LOCKED',
        },
      });

      await prisma.exclusiveNegotiation.create({
        data: {
          dealId: deal.id,
          entityId: application.entityId,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      return { application: updated, deal };
    }

    return { application: updated };
  }

  /** Get brand's own campaigns */
  async listByBrand(brandProfileId: string) {
    return prisma.campaign.findMany({
      where: { brandId: brandProfileId },
      include: { _count: { select: { applications: true, deals: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get campaign by ID with full details */
  async getById(campaignId: string) {
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
  ) {
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
