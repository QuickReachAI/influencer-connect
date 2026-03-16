import prisma from '@/lib/prisma';
import { DealStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Valid state transitions map
// ---------------------------------------------------------------------------
const VALID_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  DRAFT: ['LOCKED', 'CANCELLED'],
  LOCKED: ['SCRIPT_PENDING', 'CANCELLED'],
  SCRIPT_PENDING: ['SCRIPT_APPROVED', 'CANCELLED'],
  SCRIPT_APPROVED: ['PAYMENT_50_PENDING', 'CANCELLED'],
  PAYMENT_50_PENDING: ['PRODUCTION', 'CANCELLED'],
  PRODUCTION: ['DELIVERY_PENDING', 'DISPUTED'],
  DELIVERY_PENDING: ['REVISION_PENDING', 'PAYMENT_100_PENDING', 'DISPUTED'],
  REVISION_PENDING: ['DELIVERY_PENDING', 'DISPUTED'],
  PAYMENT_100_PENDING: ['COMPLETED', 'DISPUTED'],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class DealService {
  // -------------------------------------------------------------------------
  // Core state-machine transition
  // -------------------------------------------------------------------------

  /**
   * Transition a deal to `targetStatus`, enforcing the state machine.
   * Runs inside a Prisma transaction so the read + write are atomic.
   */
  async transitionDealStatus(
    dealId: string,
    targetStatus: DealStatus,
    actorId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUnique({ where: { id: dealId } });

      if (!deal) {
        throw new Error(`Deal ${dealId} not found`);
      }

      const currentStatus = deal.status as DealStatus;
      const allowed = VALID_TRANSITIONS[currentStatus];

      if (!allowed || !allowed.includes(targetStatus)) {
        throw new Error(
          `Invalid status transition: ${currentStatus} -> ${targetStatus}. ` +
            `Allowed transitions from ${currentStatus}: ${allowed?.length ? allowed.join(', ') : 'none (terminal state)'}`,
        );
      }

      const updated = await tx.deal.update({
        where: { id: dealId },
        data: { status: targetStatus },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'deal',
          entityId: dealId,
          action: 'status_transition',
          actorId,
          changes: {
            from: currentStatus,
            to: targetStatus,
          },
        },
      });

      return updated;
    });
  }

  // -------------------------------------------------------------------------
  // Existing lock helpers — now delegate to transitionDealStatus where useful
  // -------------------------------------------------------------------------

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

    await this.transitionDealStatus(dealId, 'LOCKED', brandId);

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

    return this.transitionDealStatus(dealId, 'SCRIPT_PENDING', creatorId);
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

    if (deal.exclusiveNegotiations[0]) {
      await prisma.exclusiveNegotiation.update({
        where: { id: deal.exclusiveNegotiations[0].id },
        data: { isActive: false, releasedAt: new Date() },
      });
    }

    return this.transitionDealStatus(dealId, 'CANCELLED', creatorId);
  }
}

export const dealService = new DealService();
