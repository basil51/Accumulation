import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FeedbackType, FeedbackStatus } from '@prisma/client';

export interface CreateFeedbackInput {
  type: FeedbackType;
  category?: string;
  subject: string;
  message: string;
  metadata?: any;
}

export interface UpdateFeedbackStatusInput {
  status: FeedbackStatus;
  adminNotes?: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new feedback
   */
  async createFeedback(userId: string, input: CreateFeedbackInput) {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        type: input.type,
        category: input.category,
        subject: input.subject,
        message: input.message,
        metadata: input.metadata || {},
        status: FeedbackStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            subscriptionLevel: true,
          },
        },
      },
    });

    this.logger.log(`Feedback created: ${feedback.id} by user ${userId}`);

    return feedback;
  }

  /**
   * Get user's feedback
   */
  async getUserFeedback(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.feedback.count({
        where: { userId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(id: string, userId?: string) {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const feedback = await this.prisma.feedback.findUnique({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            subscriptionLevel: true,
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  /**
   * Get all feedback (admin only)
   */
  async getAllFeedback(
    page: number = 1,
    limit: number = 50,
    type?: FeedbackType,
    status?: FeedbackStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              subscriptionLevel: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update feedback status (admin only)
   */
  async updateFeedbackStatus(
    id: string,
    input: UpdateFeedbackStatusInput,
    adminId: string,
  ) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    const updated = await this.prisma.feedback.update({
      where: { id },
      data: {
        status: input.status,
        adminNotes: input.adminNotes,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(
      `Feedback ${id} status updated to ${input.status} by admin ${adminId}`,
    );

    return updated;
  }

  /**
   * Get feedback statistics (admin only)
   */
  async getFeedbackStats() {
    const [total, byType, byStatus] = await Promise.all([
      this.prisma.feedback.count(),
      this.prisma.feedback.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.feedback.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<FeedbackType, number>,
      ),
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<FeedbackStatus, number>,
      ),
    };
  }
}

