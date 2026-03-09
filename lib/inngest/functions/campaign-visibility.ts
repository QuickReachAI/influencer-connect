import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';

/**
 * 30-min cron: update campaign visibility tiers.
 * - Tier 1 (immediately): creators with rating >= 4.0
 * - Tier 2 (after 1h): creators with rating >= 3.0
 * - Tier 3 (after 2h): all creators
 */
export const campaignVisibilityFunction = inngest.createFunction(
  {
    id: 'campaign-visibility-update',
    name: 'Campaign Visibility Tier Update',
  },
  { cron: '*/30 * * * *' },
  async ({ step }) => {
    const now = new Date();

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
