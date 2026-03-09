import prisma from '@/lib/prisma';
import { inngest } from '@/lib/inngest/client';
import { triggerUserEvent } from '@/lib/pusher';
import type { NotificationType } from '@prisma/client';

interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Send a notification to a single user.
   * Routes through user's preferences: in-app (Pusher), email (Resend).
   */
  async send(input: SendNotificationInput): Promise<any> {
    // Check user's notification preferences
    const pref = await prisma.notificationPreference.findUnique({
      where: {
        userId_type: { userId: input.userId, type: input.type },
      },
    });

    // Default: all channels enabled
    const inApp = pref?.inApp ?? true;
    const email = pref?.email ?? true;

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data ?? {}) as any,
      },
    });

    // In-app: Pusher real-time delivery
    if (inApp) {
      await triggerUserEvent(input.userId, 'system-notification', {
        id: notification.id,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
        createdAt: notification.createdAt,
      });
    }

    // Email: async via Inngest (to avoid blocking)
    if (email) {
      await inngest.send({
        name: 'notification/send',
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          data: input.data,
        },
      });
    }

    return notification;
  }

  /**
   * Batch send notifications for campaign announcements.
   * Anti-thundering-herd: tiered delivery by creator rating.
   */
  async sendCampaignAnnouncement(
    campaignId: string,
    title: string,
    message: string
  ): Promise<void> {
    await inngest.send({
      name: 'notification/batch-send',
      data: { campaignId, type: 'CAMPAIGN_PUBLISHED', title, message },
    });
  }

  /** Get paginated notifications for a user */
  async list(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ notifications: any[]; total: number }> {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total };
  }

  /** Mark a single notification as read */
  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  /** Mark all notifications as read */
  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  /** Get unread count for badge */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /** Get user's notification preferences */
  async getPreferences(userId: string): Promise<any[]> {
    return prisma.notificationPreference.findMany({
      where: { userId },
    });
  }

  /** Update notification preferences */
  async updatePreference(
    userId: string,
    type: NotificationType,
    updates: { email?: boolean; push?: boolean; inApp?: boolean }
  ): Promise<any> {
    return prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: {
        userId,
        type,
        email: updates.email ?? true,
        push: updates.push ?? true,
        inApp: updates.inApp ?? true,
      },
      update: updates,
    });
  }
}

export const notificationService = new NotificationService();
