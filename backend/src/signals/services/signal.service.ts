import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CompressionService } from '../../common/compression/compression.service';
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

  constructor(
    private prisma: PrismaService,
    private compressionService: CompressionService,
  ) {}

  /**
   * Create an AccumulationSignal record
   */
  async createAccumulationSignal(input: CreateAccumulationSignalInput) {
    try {
      // Guard against zero/negative or invalid USD amounts
      // TEMPORARY: Lowered to $0.10 for testing - change back to $1 after verifying signals work
      const minUsd = 0.10; // drop dust/zero signals (was 1, lowered for testing)
      if (!Number.isFinite(input.amountUsd) || input.amountUsd < minUsd) {
        this.logger.debug(`Skipping AccumulationSignal creation: amountUsd=$${input.amountUsd} < minUsd=$${minUsd}`);
        return null;
      }

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
      const evidenceData = {
        evidence: input.evidence.map((r) => ({
          rule: r.ruleName,
          score: r.score,
          reason: r.reason,
          evidence: r.evidence,
        })),
        eventIds: input.eventIds,
        timestamp: new Date().toISOString(),
      };

      // Compress evidence to reduce DB load
      const compressedEvidence = await this.compressionService.compressToBase64(
        evidenceData,
      );

      const details = {
        compressed: true,
        evidence: compressedEvidence,
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
    const { coinId, symbol, minScore, startDate, endDate, page = 1, limit = 50 } = query;

    const where: Prisma.AccumulationSignalWhereInput = {};

    // Exclude dust/zero USD signals
    // TEMPORARY: Lowered to $0.10 for testing - change back to $1 after verifying signals work
    where.amountUsd = { gte: 0.10 };

    // If symbol is provided, find coins by symbol (partial match) and filter by their IDs
    if (symbol && !coinId) {
      const coins = await this.prisma.coin.findMany({
        where: {
          symbol: {
            contains: symbol.toUpperCase(),
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      
      // Filter by matching coins (even if empty, this will show no results)
      if (coins.length > 0) {
        where.coinId = { in: coins.map((c) => c.id) };
      } else {
        // If no coins match the partial symbol, return empty result
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
    } else if (coinId) {
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
      symbol,
      signalType,
      minScore,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.MarketSignalWhereInput = {};

    // If symbol is provided, find coins by symbol (partial match) and filter by their IDs
    if (symbol && !coinId) {
      const coins = await this.prisma.coin.findMany({
        where: {
          symbol: {
            contains: symbol.toUpperCase(),
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      
      // Filter by matching coins (even if empty, this will show no results)
      if (coins.length > 0) {
        where.coinId = { in: coins.map((c) => c.id) };
      } else {
        // If no coins match the partial symbol, return empty result
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
    } else if (coinId) {
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
   * Get market signal by ID and decompress evidence if needed
   */
  async findMarketSignalById(id: string) {
    const signal = await this.prisma.marketSignal.findUnique({
      where: { id },
      include: {
        coin: true,
      },
    });

    if (!signal) {
      return null;
    }

    // Decompress evidence if it's compressed
    if (signal.details && typeof signal.details === 'object') {
      const details = signal.details as any;
      if (details.compressed && details.evidence) {
        try {
          const decompressed = await this.compressionService.decompressFromBase64(
            details.evidence,
          );
          signal.details = decompressed;
        } catch (error) {
          this.logger.warn(`Failed to decompress evidence for signal ${id}:`, error);
          // Keep original if decompression fails
        }
      }
    }

    return signal;
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

