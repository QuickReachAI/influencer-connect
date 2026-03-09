import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/services/notification.service';

/**
 * Hourly cron: Monitor creator inactivity on active deals.
 * 24h without a message → warn creator.
 * 48h without a message → notify brand of cancel option.
 *
 * Fix: Prisma doesn't support nested field references in where clauses,
 * so we fetch deals first, then query chatMessages per deal separately.
 */
export const inactivityCheckFunction = inngest.createFunction(
  {
    id: 'creator-inactivity-check',
    name: 'Hourly Creator Inactivity Check',
  },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    const result = await step.run('check-inactivity', async () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Get active deals in production or delivery stages
      const activeDeals = await prisma.deal.findMany({
        where: {
          status: {
            in: ['PRODUCTION', 'DELIVERY_PENDING', 'REVISION_PENDING'],
          },
        },
        select: {
          id: true,
          creatorId: true,
          brandId: true,
          title: true,
        },
      });

      let warned = 0;
      let brandNotified = 0;

      for (const deal of activeDeals) {
        // Find the most recent message from the creator on this deal
        const lastCreatorMessage = await prisma.chatMessage.findFirst({
          where: {
            dealId: deal.id,
            senderId: deal.creatorId,
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        if (!lastCreatorMessage) {
          // No messages at all — check deal creation date
          continue;
        }

        const lastMessageTime = lastCreatorMessage.createdAt;

        if (lastMessageTime < fortyEightHoursAgo) {
          // 48h+ inactivity: notify brand of cancel option
          await notificationService.send({
            userId: deal.brandId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Creator Inactivity Alert',
            message: `The creator on deal "${deal.title}" has been inactive for over 48 hours. You may request cancellation if needed.`,
            data: { dealId: deal.id, inactivityHours: 48 },
          });
          brandNotified++;
        } else if (lastMessageTime < twentyFourHoursAgo) {
          // 24h+ inactivity: warn creator
          await notificationService.send({
            userId: deal.creatorId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Inactivity Warning',
            message: `You haven't responded on deal "${deal.title}" for over 24 hours. Please update the brand on your progress.`,
            data: { dealId: deal.id, inactivityHours: 24 },
          });
          warned++;
        }
      }

      return { dealsChecked: activeDeals.length, warned, brandNotified };
    });

    return result;
  }
);
