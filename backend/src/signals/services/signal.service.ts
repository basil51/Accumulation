import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MarketSignalType, Chain, Prisma } from '@prisma/client';
import { RuleResult } from '../interfaces/rule.interface';
import { QuerySignalsDto } from '../dto/query-signals.dto';

export interface CreateAccumulationSignalInput {
  coinId: string;
  amountUnits: number;
  amountUsd: number;
  supplyPercentage?: number;
  liquidityRatio?: number;
  score: number;
  evidence: RuleResult[];
  eventIds: string[];
}

export interface CreateMarketSignalInput {
  coinId: string;
  signalType: MarketSignalType;
  score: number;
  evidence: RuleResult[];
  eventIds: string[];
}

@Injectable()
export class SignalService {
  private readonly logger = new Logger(SignalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an AccumulationSignal record
   */
  async createAccumulationSignal(input: CreateAccumulationSignalInput) {
    try {
      const signal = await this.prisma.accumulationSignal.create({
        data: {
          coinId: input.coinId,
          amountUnits: input.amountUnits,
          amountUsd: input.amountUsd,
          supplyPercentage: input.supplyPercentage,
          liquidityRatio: input.liquidityRatio,
          score: input.score,
        },
      });

      this.logger.log(
        `Created AccumulationSignal ${signal.id} for coin ${input.coinId} with score ${input.score}`,
      );

      return signal;
    } catch (error) {
      this.logger.error(`Error creating AccumulationSignal:`, error);
      throw error;
    }
  }

  /**
   * Create a MarketSignal record
   */
  async createMarketSignal(input: CreateMarketSignalInput) {
    try {
      const details = {
        evidence: input.evidence.map((r) => ({
          rule: r.ruleName,
          score: r.score,
          reason: r.reason,
          evidence: r.evidence,
        })),
        eventIds: input.eventIds,
        timestamp: new Date().toISOString(),
      };

      const signal = await this.prisma.marketSignal.create({
        data: {
          coinId: input.coinId,
          signalType: input.signalType,
          score: input.score,
          details: details,
        },
      });

      this.logger.log(
        `Created MarketSignal ${signal.id} for coin ${input.coinId} with type ${input.signalType} and score ${input.score}`,
      );

      return signal;
    } catch (error) {
      this.logger.error(`Error creating MarketSignal:`, error);
      throw error;
    }
  }

  /**
   * Find or create a Coin record from event data
   */
  async findOrCreateCoin(
    contractAddress: string,
    chain: Chain,
    symbol?: string,
    name?: string,
  ) {
    const coin = await this.prisma.coin.findUnique({
      where: {
        contractAddress_chain: {
          contractAddress,
          chain,
        },
      },
    });

    if (coin) {
      return coin;
    }

    // Create new coin if not found
    return await this.prisma.coin.create({
      data: {
        contractAddress,
        chain,
        symbol: symbol || 'UNKNOWN',
        name: name || symbol || 'Unknown Token',
      },
    });
  }

  /**
   * Get all accumulation signals with filtering and pagination
   */
  async findAccumulationSignals(query: QuerySignalsDto) {
    const { coinId, minScore, startDate, endDate, page = 1, limit = 50 } = query;

    const where: Prisma.AccumulationSignalWhereInput = {};

    if (coinId) {
      where.coinId = coinId;
    }

    if (minScore !== undefined) {
      where.score = { gte: minScore };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.accumulationSignal.findMany({
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
      this.prisma.accumulationSignal.count({ where }),
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
   * Get all market signals with filtering and pagination
   */
  async findMarketSignals(query: QuerySignalsDto) {
    const {
      coinId,
      signalType,
      minScore,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.MarketSignalWhereInput = {};

    if (coinId) {
      where.coinId = coinId;
    }

    if (signalType) {
      where.signalType = signalType;
    }

    if (minScore !== undefined) {
      where.score = { gte: minScore };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.marketSignal.findMany({
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
      this.prisma.marketSignal.count({ where }),
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
   * Get accumulation signal by ID
   */
  async findAccumulationSignalById(id: string) {
    return await this.prisma.accumulationSignal.findUnique({
      where: { id },
      include: {
        coin: true,
      },
    });
  }

  /**
   * Get market signal by ID
   */
  async findMarketSignalById(id: string) {
    return await this.prisma.marketSignal.findUnique({
      where: { id },
      include: {
        coin: true,
      },
    });
  }

  /**
   * Get signals for a specific coin
   */
  async findSignalsByCoin(coinId: string, limit: number = 50) {
    const [accumulationSignals, marketSignals] = await Promise.all([
      this.prisma.accumulationSignal.findMany({
        where: { coinId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          coin: {
            select: {
              id: true,
              name: true,
              symbol: true,
            },
          },
        },
      }),
      this.prisma.marketSignal.findMany({
        where: { coinId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          coin: {
            select: {
              id: true,
              name: true,
              symbol: true,
            },
          },
        },
      }),
    ]);

    return {
      accumulationSignals,
      marketSignals,
    };
  }
}

