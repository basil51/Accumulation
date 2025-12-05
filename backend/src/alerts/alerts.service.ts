import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateAlertInput {
  userId: string;
  signalType: 'market' | 'accumulation';
  signalId: string;
  title: string;
  message: string;
  coinId?: string;
  score: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('alerts') private alertsQueue: Queue,
  ) {}

  /**
   * Create a new alert for a user
   */
  async createAlert(input: CreateAlertInput) {
    try {
      const alert = await this.prisma.alert.create({
        data: {
          userId: input.userId,
          signalType: input.signalType,
          signalId: input.signalId,
          title: input.title,
          message: input.message,
          coinId: input.coinId,
          score: input.score,
        },
        include: {
          coin: {
            select: {
              id: true,
              name: true,
              symbol: true,
              contractAddress: true,
              chain: true,
            },
          },
        },
      });

      this.logger.log(`Created alert ${alert.id} for user ${input.userId}`);

      // Enqueue notification job
      await this.alertsQueue.add('send-notifications', {
        alertId: alert.id,
      });

      return alert;
    } catch (error) {
      this.logger.error(`Error creating alert:`, error);
      throw error;
    }
  }

  /**
   * Get alerts for a user with filtering and pagination
   */
  async findUserAlerts(
    userId: string,
    options: {
      unread?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { unread, page = 1, limit = 50 } = options;

    const where: Prisma.AlertWhereInput = {
      userId,
    };

    if (unread !== undefined) {
      where.read = !unread;
    }

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          coin: {
            select: {
              id: true,
              name: true,
              symbol: true,
              contractAddress: true,
              chain: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        unread: unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark an alert as read
   */
  async markAsRead(alertId: string, userId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    if (alert.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (alert.read) {
      return alert;
    }

    return await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all alerts as read for a user
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.alert.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'All alerts marked as read',
      count: result.count,
    };
  }

  /**
   * Update notification delivery status
   */
  async updateNotificationStatus(
    alertId: string,
    channel: 'email' | 'telegram',
    sent: boolean,
  ) {
    const updateData: Prisma.AlertUpdateInput = {};

    if (channel === 'email') {
      updateData.emailSent = sent;
      updateData.emailSentAt = sent ? new Date() : null;
    } else {
      updateData.telegramSent = sent;
      updateData.telegramSentAt = sent ? new Date() : null;
    }

    return await this.prisma.alert.update({
      where: { id: alertId },
      data: updateData,
    });
  }

  /**
   * Check if user should receive alert based on cooldown and preferences
   */
  async shouldSendAlert(
    userId: string,
    coinId: string | undefined,
    signalScore: number,
  ): Promise<boolean> {
    // Get user settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
      },
    });

    if (!user) {
      return false;
    }

    // Check if notifications are enabled
    if (user.settings && !user.settings.notificationsEnabled) {
      return false;
    }

    // Check minimum score threshold
    const minScore = user.settings?.minSignalScore || 65;
    if (signalScore < minScore) {
      return false;
    }

    // Check cooldown window (default 30 minutes)
    const cooldownMinutes = user.settings?.cooldownMinutes || 30;
    const cooldownWindow = new Date();
    cooldownWindow.setMinutes(cooldownWindow.getMinutes() - cooldownMinutes);

    // Check if there's a recent alert for this coin
    if (coinId) {
      const recentAlert = await this.prisma.alert.findFirst({
        where: {
          userId,
          coinId,
          createdAt: {
            gte: cooldownWindow,
          },
        },
      });

      if (recentAlert) {
        this.logger.debug(
          `Skipping alert for user ${userId}, coin ${coinId} due to cooldown`,
        );
        return false;
      }
    }

    return true;
  }
}

