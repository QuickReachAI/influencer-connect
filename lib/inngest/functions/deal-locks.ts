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
  { cron: '0 * * * *' },
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
