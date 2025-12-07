import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole, SubscriptionLevel, PaymentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all users with pagination
   */
  async getUsers(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          subscriptionLevel: true,
          subscriptionExpiry: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionLevel: true,
        subscriptionExpiry: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
        _count: {
          select: {
            payments: true,
            watchlist: true,
            alerts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user subscription
   */
  async updateUserSubscription(
    userId: string,
    subscriptionLevel: SubscriptionLevel,
    subscriptionExpiry?: Date,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionLevel,
        subscriptionExpiry,
      },
      select: {
        id: true,
        email: true,
        subscriptionLevel: true,
        subscriptionExpiry: true,
      },
    });
  }

  /**
   * Update user role
   */
  async updateUserRole(
    userId: string,
    role: UserRole,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent demoting yourself
    if (userId === adminId && role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new Error('Cannot demote yourself from admin role');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionLevel: true,
      },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_USER_ROLE',
        meta: {
          userId,
          oldRole: user.role,
          newRole: role,
        },
      },
    });

    return updatedUser;
  }

  /**
   * Get all payments with filters
   */
  async getPayments(
    page: number = 1,
    limit: number = 50,
    status?: PaymentStatus,
  ) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
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
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
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

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Approve payment
   */
  async approvePayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new Error('Payment already confirmed');
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CONFIRMED },
    });

    // Update user subscription based on payment amount
    // Basic: $10, Pro: $30, Premium: $100
    let newSubscriptionLevel: SubscriptionLevel = SubscriptionLevel.BASIC;
    if (payment.amountUsdt >= 100) {
      newSubscriptionLevel = SubscriptionLevel.PREMIUM;
    } else if (payment.amountUsdt >= 30) {
      newSubscriptionLevel = SubscriptionLevel.PRO;
    }

    // Set expiry to 30 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await this.prisma.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionLevel: newSubscriptionLevel,
        subscriptionExpiry: expiryDate,
      },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'APPROVE_PAYMENT',
        meta: {
          paymentId,
          userId: payment.userId,
          amount: payment.amountUsdt,
          subscriptionLevel: newSubscriptionLevel,
        },
      },
    });

    return {
      message: 'Payment approved and subscription updated',
      payment: await this.getPaymentById(paymentId),
    };
  }

  /**
   * Reject payment
   */
  async rejectPayment(paymentId: string, adminId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.REJECTED) {
      throw new Error('Payment already rejected');
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REJECTED },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'REJECT_PAYMENT',
        meta: {
          paymentId,
          userId: payment.userId,
          reason,
        },
      },
    });

    return {
      message: 'Payment rejected',
      payment: await this.getPaymentById(paymentId),
    };
  }

  /**
   * Get dashboard analytics
   */
  async getAnalytics() {
    const [
      totalUsers,
      activeSubscriptions,
      pendingPayments,
      signalsToday,
      usersByRole,
      subscriptionsByTier,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          subscriptionLevel: { not: SubscriptionLevel.FREE },
          subscriptionExpiry: { gte: new Date() },
        },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.PENDING },
      }),
      this.prisma.accumulationSignal.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['subscriptionLevel'],
        _count: true,
      }),
    ]);

    return {
      totalUsers,
      activeSubscriptions,
      pendingPayments,
      signalsToday,
      usersByRole: usersByRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<UserRole, number>,
      ),
      subscriptionsByTier: subscriptionsByTier.reduce(
        (acc, item) => {
          acc[item.subscriptionLevel] = item._count;
          return acc;
        },
        {} as Record<SubscriptionLevel, number>,
      ),
    };
  }

  /**
   * Get false positive analytics
   */
  async getFalsePositiveAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Overall statistics
    const [
      totalAccumulationSignals,
      falsePositiveAccumulation,
      totalMarketSignals,
      falsePositiveMarket,
    ] = await Promise.all([
      this.prisma.accumulationSignal.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.accumulationSignal.count({
        where: {
          createdAt: { gte: startDate },
          falsePositive: true,
        },
      }),
      this.prisma.marketSignal.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.marketSignal.count({
        where: {
          createdAt: { gte: startDate },
          falsePositive: true,
        },
      }),
    ]);

    const totalSignals = totalAccumulationSignals + totalMarketSignals;
    const totalFalsePositives = falsePositiveAccumulation + falsePositiveMarket;
    const overallFalsePositiveRate =
      totalSignals > 0 ? (totalFalsePositives / totalSignals) * 100 : 0;

    // False positive rate by signal type
    const accumulationFalsePositiveRate =
      totalAccumulationSignals > 0
        ? (falsePositiveAccumulation / totalAccumulationSignals) * 100
        : 0;
    const marketFalsePositiveRate =
      totalMarketSignals > 0 ? (falsePositiveMarket / totalMarketSignals) * 100 : 0;

    // False positive rate by score range
    const scoreRanges = [
      { min: 0, max: 59, label: '0-59 (Low)' },
      { min: 60, max: 74, label: '60-74 (Medium)' },
      { min: 75, max: 100, label: '75-100 (High)' },
    ];

    const scoreRangeStats = await Promise.all(
      scoreRanges.map(async (range) => {
        const [accumulationTotal, marketTotal, accumulationFalse, marketFalse] = await Promise.all([
          this.prisma.accumulationSignal.count({
            where: {
              createdAt: { gte: startDate },
              score: { gte: range.min, lte: range.max },
            },
          }),
          this.prisma.marketSignal.count({
            where: {
              createdAt: { gte: startDate },
              score: { gte: range.min, lte: range.max },
            },
          }),
          this.prisma.accumulationSignal.count({
            where: {
              createdAt: { gte: startDate },
              score: { gte: range.min, lte: range.max },
              falsePositive: true,
            },
          }),
          this.prisma.marketSignal.count({
            where: {
              createdAt: { gte: startDate },
              score: { gte: range.min, lte: range.max },
              falsePositive: true,
            },
          }),
        ]);

        const total = accumulationTotal + marketTotal;
        const falsePositives = accumulationFalse + marketFalse;

        return {
          range: range.label,
          total,
          falsePositives,
          rate: total > 0 ? (falsePositives / total) * 100 : 0,
        };
      }),
    );

    // False positive rate by coin (top 10)
    const topCoinsFalsePositive = await this.prisma.accumulationSignal.groupBy({
      by: ['coinId'],
      where: { createdAt: { gte: startDate } },
      _count: true,
      _sum: {
        score: true,
      },
      orderBy: {
        _count: {
          coinId: 'desc',
        },
      },
      take: 10,
    });

    const coinStats = await Promise.all(
      topCoinsFalsePositive.map(async (coinGroup) => {
        const [accumulationTotal, marketTotal, accumulationFalse, marketFalse, coin] = await Promise.all([
          this.prisma.accumulationSignal.count({
            where: {
              coinId: coinGroup.coinId,
              createdAt: { gte: startDate },
            },
          }),
          this.prisma.marketSignal.count({
            where: {
              coinId: coinGroup.coinId,
              createdAt: { gte: startDate },
            },
          }),
          this.prisma.accumulationSignal.count({
            where: {
              coinId: coinGroup.coinId,
              createdAt: { gte: startDate },
              falsePositive: true,
            },
          }),
          this.prisma.marketSignal.count({
            where: {
              coinId: coinGroup.coinId,
              createdAt: { gte: startDate },
              falsePositive: true,
            },
          }),
          this.prisma.coin.findUnique({
            where: { id: coinGroup.coinId },
            select: { name: true, symbol: true },
          }),
        ]);

        const total = accumulationTotal + marketTotal;
        const falsePositives = accumulationFalse + marketFalse;

        return {
          coinId: coinGroup.coinId,
          coinName: coin?.name || 'Unknown',
          coinSymbol: coin?.symbol || 'N/A',
          total,
          falsePositives,
          rate: total > 0 ? (falsePositives / total) * 100 : 0,
        };
      }),
    );

    // Daily trends (last 30 days)
    const dailyTrends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [accumulationTotal, marketTotal, accumulationFalse, marketFalse] = await Promise.all([
        this.prisma.accumulationSignal.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        this.prisma.marketSignal.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        this.prisma.accumulationSignal.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
            falsePositive: true,
          },
        }),
        this.prisma.marketSignal.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
            falsePositive: true,
          },
        }),
      ]);

      const total = accumulationTotal + marketTotal;
      const falsePositives = accumulationFalse + marketFalse;

      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        total,
        falsePositives,
        rate: total > 0 ? (falsePositives / total) * 100 : 0,
      });
    }

    return {
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      overall: {
        totalSignals,
        totalFalsePositives,
        falsePositiveRate: overallFalsePositiveRate,
      },
      byType: {
        accumulation: {
          total: totalAccumulationSignals,
          falsePositives: falsePositiveAccumulation,
          rate: accumulationFalsePositiveRate,
        },
        market: {
          total: totalMarketSignals,
          falsePositives: falsePositiveMarket,
          rate: marketFalsePositiveRate,
        },
      },
      byScoreRange: scoreRangeStats,
      byCoin: coinStats,
      dailyTrends,
    };
  }

  /**
   * Get signals with pagination and filters
   */
  async getSignals(
    page: number = 1,
    limit: number = 50,
    type?: 'accumulation' | 'market',
    falsePositive?: boolean,
  ) {
    const skip = (page - 1) * limit;

    if (type === 'accumulation') {
      const where: any = {};
      if (falsePositive !== undefined) {
        where.falsePositive = falsePositive;
      }

      const [signals, total] = await Promise.all([
        this.prisma.accumulationSignal.findMany({
          where,
          skip,
          take: limit,
          include: {
            coin: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.accumulationSignal.count({ where }),
      ]);

      return {
        data: signals,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else if (type === 'market') {
      const where: any = {};
      if (falsePositive !== undefined) {
        where.falsePositive = falsePositive;
      }

      const [signals, total] = await Promise.all([
        this.prisma.marketSignal.findMany({
          where,
          skip,
          take: limit,
          include: {
            coin: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.marketSignal.count({ where }),
      ]);

      return {
        data: signals,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else {
      // Get both types
      const [accumulationSignals, marketSignals, accumulationTotal, marketTotal] =
        await Promise.all([
          this.prisma.accumulationSignal.findMany({
            where: falsePositive !== undefined ? { falsePositive } : {},
            skip,
            take: limit,
            include: { coin: true },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.marketSignal.findMany({
            where: falsePositive !== undefined ? { falsePositive } : {},
            skip,
            take: limit,
            include: { coin: true },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.accumulationSignal.count({
            where: falsePositive !== undefined ? { falsePositive } : {},
          }),
          this.prisma.marketSignal.count({
            where: falsePositive !== undefined ? { falsePositive } : {},
          }),
        ]);

      return {
        data: {
          accumulation: accumulationSignals,
          market: marketSignals,
        },
        meta: {
          total: accumulationTotal + marketTotal,
          page,
          limit,
          totalPages: Math.ceil((accumulationTotal + marketTotal) / limit),
        },
      };
    }
  }

  /**
   * Mark accumulation signal as false positive
   */
  async markAccumulationSignalFalsePositive(
    signalId: string,
    adminId: string,
  ) {
    const signal = await this.prisma.accumulationSignal.findUnique({
      where: { id: signalId },
    });

    if (!signal) {
      throw new NotFoundException('Accumulation signal not found');
    }

    const updated = await this.prisma.accumulationSignal.update({
      where: { id: signalId },
      data: {
        falsePositive: true,
        markedFalsePositiveAt: new Date(),
        markedFalsePositiveBy: adminId,
      },
      include: {
        coin: true,
      },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'MARK_SIGNAL_FALSE_POSITIVE',
        meta: {
          signalType: 'accumulation',
          signalId,
          coinId: signal.coinId,
        },
      },
    });

    return updated;
  }

  /**
   * Mark market signal as false positive
   */
  async markMarketSignalFalsePositive(signalId: string, adminId: string) {
    const signal = await this.prisma.marketSignal.findUnique({
      where: { id: signalId },
    });

    if (!signal) {
      throw new NotFoundException('Market signal not found');
    }

    const updated = await this.prisma.marketSignal.update({
      where: { id: signalId },
      data: {
        falsePositive: true,
        markedFalsePositiveAt: new Date(),
        markedFalsePositiveBy: adminId,
      },
      include: {
        coin: true,
      },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'MARK_SIGNAL_FALSE_POSITIVE',
        meta: {
          signalType: 'market',
          signalId,
          coinId: signal.coinId,
        },
      },
    });

    return updated;
  }

  /**
   * Update coin active/famous status
   */
  async updateCoinStatus(
    coinId: string,
    adminId: string,
    data: { isActive?: boolean; isFamous?: boolean },
  ) {
    const coin = await this.prisma.coin.findUnique({
      where: { id: coinId },
    });

    if (!coin) {
      throw new NotFoundException('Coin not found');
    }

    const updated = await this.prisma.coin.update({
      where: { id: coinId },
      data: {
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isFamous !== undefined && { isFamous: data.isFamous }),
      },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_COIN_STATUS',
        meta: {
          coinId,
          coinSymbol: coin.symbol,
          coinName: coin.name,
          changes: data,
        },
      },
    });

    return updated;
  }
}

