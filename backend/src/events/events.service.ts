import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get recent normalized events for a given coin.
   * Matches on the coin's contract address + chain.
   */
  async getRecentEventsForCoin(coinId: string, limit: number) {
    const coin = await this.prisma.coin.findUnique({
      where: { id: coinId },
    });

    if (!coin) {
      throw new NotFoundException(`Coin with ID ${coinId} not found`);
    }

    const safeLimit = Math.min(Math.max(limit || 1, 1), 100);

    const events = await this.prisma.normalizedEvent.findMany({
      where: {
        tokenContract: coin.contractAddress,
        chain: coin.chain,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: safeLimit,
    });

    return events;
  }
}

