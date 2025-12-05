import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { SubscriptionLevel } from '@prisma/client';

@Injectable()
export class WatchlistService {
  constructor(private prisma: PrismaService) {}

  async getUserWatchlist(userId: string) {
    return this.prisma.userWatchlist.findMany({
      where: { userId },
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
    });
  }

  private getWatchlistLimit(level: SubscriptionLevel): number {
    switch (level) {
      case SubscriptionLevel.FREE:
        return 5;
      case SubscriptionLevel.BASIC:
        return 25;
      case SubscriptionLevel.PRO:
        return 100;
      case SubscriptionLevel.PREMIUM:
        return 250;
      default:
        return 10;
    }
  }

  async addToWatchlist(userId: string, dto: CreateWatchlistDto) {
    // Ensure coin exists
    const coin = await this.prisma.coin.findUnique({
      where: { id: dto.coinId },
    });

    if (!coin) {
      throw new BadRequestException('Coin not found');
    }

    // Check if already in watchlist
    const existing = await this.prisma.userWatchlist.findUnique({
      where: {
        userId_coinId: {
          userId,
          coinId: dto.coinId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Coin already in watchlist');
    }

    // Enforce subscription-based watchlist limits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const currentCount = await this.prisma.userWatchlist.count({
      where: { userId },
    });
    const limit = this.getWatchlistLimit(user.subscriptionLevel);

    if (currentCount >= limit) {
      throw new ForbiddenException('Watchlist limit reached (subscription tier)');
    }

    return this.prisma.userWatchlist.create({
      data: {
        userId,
        coinId: dto.coinId,
        thresholdUsd: dto.thresholdUsd,
        thresholdPercentage: dto.thresholdPercentage,
        notificationsEnabled:
          dto.notificationsEnabled === undefined
            ? true
            : dto.notificationsEnabled,
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
  }

  async removeFromWatchlist(userId: string, id: string) {
    const existing = await this.prisma.userWatchlist.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Watchlist item not found');
    }

    await this.prisma.userWatchlist.delete({
      where: { id },
    });

    return {
      message: 'Removed from watchlist',
    };
  }
}

