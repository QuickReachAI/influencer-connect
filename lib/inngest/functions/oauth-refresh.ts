import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { oauthService } from '@/lib/services/oauth.service';
import { notificationService } from '@/lib/services/notification.service';

/**
 * Daily cron (4 AM IST): Refresh OAuth tokens expiring within 7 days.
 * Only deactivates + notifies if refresh fails (token revoked by user).
 */
export const oauthRefreshFunction = inngest.createFunction(
  {
    id: 'oauth-token-check',
    name: 'Daily OAuth Token Refresh',
  },
  { cron: '30 22 * * *' }, // 4 AM IST = 22:30 UTC previous day
  async ({ step }) => {
    const result = await step.run('refresh-expiring-tokens', async () => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringEntities = await prisma.socialEntity.findMany({
        where: {
          isActive: true,
          isVerified: true,
          oauthTokenEncrypted: { not: null },
          tokenExpiresAt: { lt: sevenDaysFromNow },
        },
        include: {
          master: { select: { id: true, email: true } },
        },
      });

      let refreshed = 0;
      let deactivated = 0;

      for (const entity of expiringEntities) {
        try {
          await oauthService.refreshToken(entity);
          refreshed++;
        } catch (error) {
          console.error(`Token refresh failed for entity ${entity.id}:`, error);

          // Token is revoked or invalid — deactivate
          await prisma.socialEntity.update({
            where: { id: entity.id },
            data: {
              isActive: false,
              isVerified: false,
              oauthTokenEncrypted: null,
              tokenExpiresAt: null,
            },
          });

          await notificationService.send({
            userId: entity.masterId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Social Account Disconnected',
            message: `Your ${entity.platform} account @${entity.handle} has been disconnected due to an expired token. Please re-link your account.`,
            data: { entityId: entity.id, platform: entity.platform },
          });

          deactivated++;
        }
      }

      return { checked: expiringEntities.length, refreshed, deactivated };
    });

    return result;
  }
);
