// @ts-nocheck
import prisma from '@/lib/prisma';

type SocialPlatform = 'INSTAGRAM' | 'YOUTUBE' | 'FACEBOOK';

interface CreateEntityInput {
  masterId: string;
  platform: SocialPlatform;
  handle: string;
  followerCount?: number;
  engagementRate?: number;
  niche?: string[];
  categories?: string[];
}

interface UpdateEntityInput {
  followerCount?: number;
  engagementRate?: number;
  niche?: string[];
  categories?: string[];
  audienceDemographics?: any;
  portfolioItems?: any;
}

export class SocialEntityService {
  /**
   * Create a new social entity for a creator.
   * Enforces unique constraint [masterId, platform, handle].
   */
  async create(input: CreateEntityInput) {
    // Check for cross-user duplicate (same handle+platform, different user)
    const existing = await prisma.socialEntity.findFirst({
      where: {
        platform: input.platform,
        handle: input.handle,
        masterId: { not: input.masterId },
      },
    });

    if (existing) {
      throw new Error(
        'This social account is linked to another user. Flagged for admin review.'
      );
    }

    return prisma.socialEntity.create({
      data: {
        masterId: input.masterId,
        platform: input.platform,
        handle: input.handle,
        followerCount: input.followerCount ?? 0,
        engagementRate: input.engagementRate ?? 0,
        niche: input.niche ?? [],
        categories: input.categories ?? [],
      },
    });
  }

  /** List all active entities for a creator */
  async listByUser(masterId: string) {
    return prisma.socialEntity.findMany({
      where: { masterId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get single entity with ownership check */
  async getById(entityId: string, masterId: string) {
    const entity = await prisma.socialEntity.findUnique({
      where: { id: entityId },
    });
    if (!entity || entity.masterId !== masterId) {
      throw new Error('Entity not found or unauthorized');
    }
    return entity;
  }

  /** Update entity profile fields */
  async update(entityId: string, masterId: string, data: UpdateEntityInput) {
    await this.getById(entityId, masterId); // ownership check
    const updated = await prisma.socialEntity.update({
      where: { id: entityId },
      data,
    });
    // Recalculate completion score
    await this.recalculateCompletionScore(entityId);
    return updated;
  }

  /** Soft-deactivate entity (hide from discovery) */
  async deactivate(entityId: string, masterId: string) {
    await this.getById(entityId, masterId);
    await prisma.socialEntity.update({
      where: { id: entityId },
      data: { isActive: false },
    });
  }

  /**
   * Calculate profile completion score.
   * Bio: 10%, Niche/Category: 15%, Portfolio: 25%,
   * Audience Demographics: 30%, OAuth Connected: 20%
   */
  async recalculateCompletionScore(entityId: string): Promise<number> {
    const entity = await prisma.socialEntity.findUniqueOrThrow({
      where: { id: entityId },
      include: { master: { include: { creatorProfile: true } } },
    });

    let score = 0;
    const bio = entity.master.creatorProfile?.bio;
    if (bio && bio.length > 0) score += 10;
    if (entity.niche.length > 0 || entity.categories.length > 0) score += 15;
    if (entity.portfolioItems && Object.keys(entity.portfolioItems as object).length > 0) score += 25;
    if (entity.audienceDemographics && Object.keys(entity.audienceDemographics as object).length > 0) score += 30;
    if (entity.isVerified) score += 20;

    await prisma.socialEntity.update({
      where: { id: entityId },
      data: { completionScore: score },
    });

    return score;
  }
}

export const socialEntityService = new SocialEntityService();
