// apps/api/src/modules/notifications/notifications.service.ts
import { prisma } from '@hbms/database';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  metadata?: any;
}

export class NotificationsService {
  /**
   * Creates a notification for a user.
   */
  async createNotification(params: CreateNotificationParams) {
    return await prisma.notification.create({
      data: {
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link || null,
        metadata: params.metadata || null,
        is_read: false,
      },
    });
  }

  /**
   * Retrieves notifications for a user, sorted newest first.
   */
  async getUserNotifications(userId: string, limit: number = 30) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    // Check which reservations or hotels have already been reviewed by this user
    const userReviews = await prisma.review.findMany({
      where: { user_id: userId },
      select: { reservation_id: true, hotel_id: true },
    });
    const reviewedResIds = new Set(userReviews.map((r) => r.reservation_id).filter(Boolean));
    const reviewedHotelIds = new Set(userReviews.map((r) => r.hotel_id));

    const enrichedNotifications = notifications.map((n) => {
      const resId = (n.metadata as any)?.reservationId;
      const hotelId = (n.metadata as any)?.hotelId;
      const isAlreadyReviewed = Boolean(
        (resId && reviewedResIds.has(resId)) || (hotelId && reviewedHotelIds.has(hotelId))
      );
      return {
        ...n,
        isReviewed: isAlreadyReviewed,
      };
    });

    return {
      notifications: enrichedNotifications,
      unreadCount,
    };
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        is_read: true,
      },
    });
  }

  /**
   * Marks all notifications for a user as read.
   */
  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
  }
}

export const notificationsService = new NotificationsService();

