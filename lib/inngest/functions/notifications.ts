import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

/**
 * Send email notification for a single user.
 * Triggered by 'notification/send' event.
 */
export const notificationEmailFunction = inngest.createFunction(
  {
    id: 'notification-email',
    name: 'Send Notification Email',
    retries: 3,
  },
  { event: 'notification/send' },
  async ({ event, step }) => {
    const { userId, type, title, message } = event.data;

    const user = await step.run('get-user', async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
    });

    if (!user) return { skipped: true, reason: 'User not found' };

    await step.run('send-email', async () => {
      const r = getResend();
      if (!r) return { skipped: true, reason: 'Resend not configured' };
      await r.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: user.email,
        subject: title,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${title}</h2>
            <p>${message}</p>
            <hr />
            <p style="color: #666; font-size: 12px;">
              QuickConnects — You can manage your notification preferences in Settings.
            </p>
          </div>
        `,
      });
    });

    return { userId, type, sent: true };
  }
);

/**
 * Batch notification for campaign announcements.
 * Anti-thundering-herd: tiered delivery by creator rating.
 * Triggered by 'notification/batch-send' event.
 */
export const notificationBatchFunction = inngest.createFunction(
  {
    id: 'notification-batch',
    name: 'Batch Campaign Notification',
    retries: 2,
  },
  { event: 'notification/batch-send' },
  async ({ event, step }) => {
    const { campaignId, type, title, message } = event.data;

    // Tier 1: Platinum creators (rating >= 4.5) — immediately
    const tier1Count = await step.run('tier-1-platinum', async () => {
      return sendToTier(campaignId, 4.5, 5.0, title, message, type);
    });

    // Tier 2: Gold creators (rating 3.5-4.49) — after 60s
    await step.sleep('wait-tier-2', '60s');
    const tier2Count = await step.run('tier-2-gold', async () => {
      return sendToTier(campaignId, 3.5, 4.49, title, message, type);
    });

    // Tier 3: Silver creators (rating 2.5-3.49) — after 5min
    await step.sleep('wait-tier-3', '5m');
    const tier3Count = await step.run('tier-3-silver', async () => {
      return sendToTier(campaignId, 2.5, 3.49, title, message, type);
    });

    // Tier 4: Bronze creators (rating < 2.5) — after 10min
    await step.sleep('wait-tier-4', '10m');
    const tier4Count = await step.run('tier-4-bronze', async () => {
      return sendToTier(campaignId, 0, 2.49, title, message, type);
    });

    return {
      campaignId,
      totalNotified: tier1Count + tier2Count + tier3Count + tier4Count,
      tiers: { platinum: tier1Count, gold: tier2Count, silver: tier3Count, bronze: tier4Count },
    };
  }
);

/** Send notifications to creators in a rating tier, batched by 100 */
async function sendToTier(
  campaignId: string,
  minRating: number,
  maxRating: number,
  title: string,
  message: string,
  type: string
): Promise<number> {
  const entities = await prisma.socialEntity.findMany({
    where: {
      isActive: true,
      rating: { gte: minRating, lte: maxRating },
    },
    select: { masterId: true },
    distinct: ['masterId'],
  });

  // Process in batches of 100
  const batchSize = 100;
  let notified = 0;

  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (entity) => {
        await prisma.notification.create({
          data: {
            userId: entity.masterId,
            type: type as any,
            title,
            message,
            data: { campaignId },
          },
        });
      })
    );
    notified += batch.length;
  }

  return notified;
}
