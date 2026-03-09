import prisma from '@/lib/prisma';

export class DealService {
  /**
   * Lock a deal for exclusive negotiation.
   * Checks that the entity has no other active lock.
   * Creates ExclusiveNegotiation record with 48h expiry.
   */
  async lockDeal(dealId: string, entityId: string, brandId: string) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

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

  /** Creator accepts a lock — deal moves to SCRIPT_PENDING. */
  async acceptLock(dealId: string, creatorId: string) {
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

  /** Creator rejects a lock — releases the lock, cancels the deal. */
  async rejectLock(dealId: string, creatorId: string) {
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
