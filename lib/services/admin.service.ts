import prisma from '@/lib/prisma';

interface FinancialAuditFilters {
  userId?: string;
  dealId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export class AdminService {
  /**
   * Split-screen dispute context: deal with all relations,
   * chat snapshot from AuditLog, PII violations, financial summary.
   */
  async getDisputeContext(dealId: string) {
    const [deal, chatMessages, piiViolations, auditLogs] = await Promise.all([
      prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          brand: {
            select: {
              id: true,
              email: true,
              brandProfile: { select: { companyName: true, gstin: true, gstinVerified: true } },
            },
          },
          creator: {
            select: {
              id: true,
              email: true,
              creatorProfile: { select: { name: true } },
            },
          },
          deliverables: true,
          videoAssets: true,
          revisions: { orderBy: { createdAt: 'desc' as const } },
          escrowTransactions: { orderBy: { createdAt: 'desc' as const } },
          milestones: { orderBy: { sortOrder: 'asc' as const } },
        },
      }),
      prisma.chatMessage.findMany({
        where: { dealId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, email: true, role: true } },
          piiViolations: true,
        },
      }),
      prisma.pIIViolation.findMany({
        where: { chatMessage: { dealId } },
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: { entityType: 'Deal', entityId: dealId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    if (!deal) {
      return null;
    }

    // Financial summary
    const financialSummary = {
      totalAmount: deal.totalAmount,
      platformFee: deal.platformFee,
      creatorPayout: deal.creatorPayout,
      payment50Paid: deal.payment50Paid,
      payment100Paid: deal.payment100Paid,
      escrowTransactions: deal.escrowTransactions,
    };

    return {
      deal,
      chatMessages,
      piiViolations,
      auditLogs,
      financialSummary,
    };
  }

  /**
   * Financial audit trail: escrow transactions, wallet transactions,
   * and audit logs with pagination + date/user/deal filters.
   */
  async getFinancialAudit(filters: FinancialAuditFilters) {
    const { userId, dealId, startDate, endDate, page = 1, pageSize = 20 } = filters;
    const skip = (page - 1) * pageSize;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const hasDateFilter = startDate || endDate;

    const [escrowTransactions, walletTransactions, auditLogs, escrowCount, walletCount, auditCount] =
      await Promise.all([
        prisma.escrowTransaction.findMany({
          where: {
            ...(dealId && { dealId }),
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          include: {
            deal: {
              select: {
                id: true,
                title: true,
                brandId: true,
                creatorId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.walletTransaction.findMany({
          where: {
            ...(dealId && { dealId }),
            ...(userId && { wallet: { userId } }),
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          include: {
            wallet: {
              select: { userId: true, user: { select: { email: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.auditLog.findMany({
          where: {
            ...(userId && { actorId: userId }),
            ...(dealId && { entityType: 'Deal', entityId: dealId }),
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          include: {
            actor: { select: { id: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.escrowTransaction.count({
          where: {
            ...(dealId && { dealId }),
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
        }),
        prisma.walletTransaction.count({
          where: {
            ...(dealId && { dealId }),
            ...(userId && { wallet: { userId } }),
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
        }),
        prisma.auditLog.count({
          where: {
            ...(userId && { actorId: userId }),
            ...(dealId && { entityType: 'Deal', entityId: dealId }),
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
        }),
      ]);

    return {
      escrowTransactions,
      walletTransactions,
      auditLogs,
      pagination: {
        page,
        pageSize,
        escrowTotal: escrowCount,
        walletTotal: walletCount,
        auditTotal: auditCount,
      },
    };
  }

  /**
   * Escalation queue: Pending KYC users + unverified GSTIN brands.
   */
  async getEscalationQueue() {
    const [pendingKYC, pendingKYB] = await Promise.all([
      prisma.user.findMany({
        where: { kycStatus: 'PENDING', role: 'CREATOR', isBanned: false },
        select: {
          id: true,
          email: true,
          phone: true,
          kycStatus: true,
          createdAt: true,
          creatorProfile: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.brandProfile.findMany({
        where: {
          OR: [
            { gstinVerified: false, gstin: { not: null } },
            { gstin: null },
          ],
        },
        select: {
          id: true,
          companyName: true,
          gstin: true,
          gstinVerified: true,
          filingStatus: true,
          userId: true,
          user: { select: { email: true, createdAt: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return { pendingKYC, pendingKYB };
  }

  /**
   * Fraud detection: engagement anomaly detection on social entities.
   * Flags: high engagement + low followers, low engagement + high followers,
   * zero engagement with active deals.
   */
  async detectSuspiciousEntities() {
    const [highEngagementLowFollowers, lowEngagementHighFollowers, zeroEngagement] =
      await Promise.all([
        // High engagement (>15%) with low followers (<1000) — possible bot activity
        prisma.socialEntity.findMany({
          where: {
            isActive: true,
            engagementRate: { gt: 15 },
            followerCount: { lt: 1000 },
          },
          include: {
            master: { select: { id: true, email: true, isBanned: true } },
          },
        }),
        // Low engagement (<0.5%) with high followers (>100k) — possible purchased followers
        prisma.socialEntity.findMany({
          where: {
            isActive: true,
            engagementRate: { lt: 0.5 },
            followerCount: { gt: 100000 },
          },
          include: {
            master: { select: { id: true, email: true, isBanned: true } },
          },
        }),
        // Zero engagement with completed deals — possible fake activity
        prisma.socialEntity.findMany({
          where: {
            isActive: true,
            engagementRate: { equals: 0 },
            totalDeals: { gt: 0 },
          },
          include: {
            master: { select: { id: true, email: true, isBanned: true } },
          },
        }),
      ]);

    return {
      highEngagementLowFollowers: highEngagementLowFollowers.map((e) => ({
        ...e,
        anomaly: 'HIGH_ENGAGEMENT_LOW_FOLLOWERS',
        reason: `Engagement ${e.engagementRate}% with only ${e.followerCount} followers`,
      })),
      lowEngagementHighFollowers: lowEngagementHighFollowers.map((e) => ({
        ...e,
        anomaly: 'LOW_ENGAGEMENT_HIGH_FOLLOWERS',
        reason: `Engagement ${e.engagementRate}% with ${e.followerCount} followers`,
      })),
      zeroEngagement: zeroEngagement.map((e) => ({
        ...e,
        anomaly: 'ZERO_ENGAGEMENT_WITH_DEALS',
        reason: `Zero engagement but ${e.totalDeals} completed deals`,
      })),
      totalSuspicious:
        highEngagementLowFollowers.length +
        lowEngagementHighFollowers.length +
        zeroEngagement.length,
    };
  }

  /**
   * Batch update campaign applications.
   * Verifies brand ownership before updating PENDING applications.
   */
  async batchUpdateApplications(
    applicationIds: string[],
    status: 'ACCEPTED' | 'REJECTED',
    brandProfileId: string
  ) {
    // Verify brand owns the campaigns these applications belong to
    const applications = await prisma.campaignApplication.findMany({
      where: {
        id: { in: applicationIds },
        status: 'PENDING',
        campaign: { brandId: brandProfileId },
      },
    });

    if (applications.length === 0) {
      return { updated: 0, message: 'No eligible applications found' };
    }

    const result = await prisma.campaignApplication.updateMany({
      where: {
        id: { in: applications.map((a) => a.id) },
        status: 'PENDING',
      },
      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    return { updated: result.count, applicationIds: applications.map((a) => a.id) };
  }

  /**
   * Batch ban users with individual audit logs.
   */
  async batchBanUsers(userIds: string[], reason: string, adminId: string) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isBanned: false },
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      return { banned: 0, message: 'No eligible users found' };
    }

    // Batch update
    await prisma.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
      },
    });

    // Create individual audit logs
    await prisma.auditLog.createMany({
      data: users.map((u) => ({
        entityType: 'User',
        entityId: u.id,
        action: 'USER_BANNED',
        actorId: adminId,
        changes: { reason, email: u.email } as any,
      })),
    });

    return { banned: users.length, userIds: users.map((u) => u.id) };
  }
}

export const adminService = new AdminService();
