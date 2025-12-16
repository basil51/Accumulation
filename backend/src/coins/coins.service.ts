import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Chain } from '@prisma/client';

@Injectable()
export class CoinsService {
  constructor(private prisma: PrismaService) {}

  async findCoinById(id: string) {
    return this.prisma.coin.findUnique({
      where: { id },
    });
  }

  /**
   * Search coins by symbol (case-insensitive)
   * Optionally filter by chain
   */
  async searchCoinsBySymbol(symbol: string, chain?: Chain) {
    const where: any = {
      symbol: {
        equals: symbol.toUpperCase(),
        mode: 'insensitive',
      },
    };

    if (chain) {
      where.chain = chain;
    }

    return this.prisma.coin.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * List coins by chain with pagination
   * Now includes signal counts
   */
  async getCoinsByChain(
    chain: Chain,
    page: number = 1,
    limit: number = 50,
  ) {
    return this.getCoinsByChainWithSignals(chain, page, limit);
  }

  /**
   * Autocomplete coin search
   * Searches by symbol or name (case-insensitive, partial match)
   */
  async autocompleteCoins(
    query: string,
    chain?: Chain,
    limit: number = 10,
  ) {
    const searchTerm = query.trim();
    if (!searchTerm) {
      return [];
    }

    const where: any = {
      OR: [
        {
          symbol: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ],
    };

    if (chain) {
      where.chain = chain;
    }

    return this.prisma.coin.findMany({
      where,
      take: limit,
      orderBy: [
        {
          symbol: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  /**
   * Update coin count for a specific chain in chainInfo
   */
  private async updateChainCoinCount(chain: Chain) {
    const actualCount = await this.prisma.coin.count({
      where: { chain },
    });

    await this.prisma.chainInfo.upsert({
      where: { chain },
      update: { coinCount: actualCount },
      create: {
        chain,
        name: this.getChainDisplayName(chain),
        isActive: true,
        coinCount: actualCount,
        signalCount: 0,
      },
    });
  }

  /**
   * Recalculate and update coin counts for all chains
   * Useful for fixing incorrect cached values
   */
  async recalculateAllChainCoinCounts() {
    // Get all chains from chainInfo
    const chainInfos = await this.prisma.chainInfo.findMany();

    const results = await Promise.all(
      chainInfos.map(async (chainInfo) => {
        const actualCount = await this.prisma.coin.count({
          where: { chain: chainInfo.chain },
        });

        const updated = await this.prisma.chainInfo.update({
          where: { chain: chainInfo.chain },
          data: { coinCount: actualCount },
        });

        return {
          chain: chainInfo.chain,
          name: chainInfo.name,
          oldCount: chainInfo.coinCount,
          newCount: actualCount,
          updated: actualCount !== chainInfo.coinCount,
        };
      }),
    );

    return {
      totalChains: results.length,
      updated: results.filter((r) => r.updated).length,
      results,
    };
  }

  /**
   * Get chain display name
   */
  private getChainDisplayName(chain: Chain): string {
    const names: Partial<Record<Chain, string>> = {
      [Chain.ETHEREUM]: 'Ethereum',
      [Chain.BSC]: 'Binance Smart Chain',
      [Chain.POLYGON]: 'Polygon',
      [Chain.ARBITRUM]: 'Arbitrum',
      [Chain.BASE]: 'Base',
      [Chain.AVALANCHE]: 'Avalanche',
      [Chain.FANTOM]: 'Fantom',
      [Chain.SOLANA]: 'Solana',
      [Chain.BITCOIN]: 'Bitcoin',
    };
    return names[chain] || chain;
  }

  /**
   * Get all chains from chainInfo table
   * Includes counts for total, active, and famous coins
   * Calculates actual coin counts from the coins table (not cached values)
   */
  async getAvailableChains() {
    // Get all chains from chainInfo table
    const chainInfos = await this.prisma.chainInfo.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Get actual counts for each chain from the coins table
    const chainStats = await Promise.all(
      chainInfos.map(async (chainInfo) => {
        const [totalCount, activeCount, famousCount] = await Promise.all([
          this.prisma.coin.count({
            where: {
              chain: chainInfo.chain,
            },
          }),
          this.prisma.coin.count({
            where: {
              chain: chainInfo.chain,
              isActive: true,
            },
          }),
          this.prisma.coin.count({
            where: {
              chain: chainInfo.chain,
              isFamous: true,
            },
          }),
        ]);

        // Update chainInfo.coinCount if it's different (sync the cached value)
        if (chainInfo.coinCount !== totalCount) {
          await this.prisma.chainInfo.update({
            where: { chain: chainInfo.chain },
            data: { coinCount: totalCount },
          });
        }

        return {
          chain: chainInfo.chain,
          coinCount: totalCount, // Use actual count from coins table
          activeCount,
          famousCount,
          name: chainInfo.name, // Include chain name
          isActive: chainInfo.isActive, // Include chain active status
        };
      }),
    );

    return chainStats;
  }

  /**
   * Get coins by chain with signal counts
   * Optionally filter by active/famous
   */
  async getCoinsByChainWithSignals(
    chain: Chain,
    page: number = 1,
    limit: number = 50,
    options?: {
      activeOnly?: boolean;
      famousOnly?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { chain };

    if (options?.activeOnly) {
      where.isActive = true;
    }
    if (options?.famousOnly) {
      where.isFamous = true;
    }

    const [data, total] = await Promise.all([
      this.prisma.coin.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isFamous: 'desc' }, // Famous coins first
          { isActive: 'desc' }, // Then active coins
          { name: 'asc' },
        ],
        include: {
          _count: {
            select: {
              accumulationSignals: true,
              marketSignals: true,
            },
          },
        },
      }),
      this.prisma.coin.count({ where }),
    ]);

    // Transform to include signal counts
    const coinsWithSignals = data.map((coin) => ({
      ...coin,
      signalCounts: {
        accumulation: coin._count.accumulationSignals,
        market: coin._count.marketSignals,
        total: coin._count.accumulationSignals + coin._count.marketSignals,
      },
      _count: undefined, // Remove the _count field
    }));

    return {
      data: coinsWithSignals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get active and famous coins for a chain
   */
  async getActiveFamousCoins(chain: Chain, limit: number = 20) {
    const coins = await this.prisma.coin.findMany({
      where: {
        chain,
        OR: [
          { isActive: true },
          { isFamous: true },
        ],
      },
      take: limit,
      orderBy: [
        { isFamous: 'desc' },
        { isActive: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: {
            accumulationSignals: true,
            marketSignals: true,
          },
        },
      },
    });

    return coins.map((coin) => ({
      ...coin,
      signalCounts: {
        accumulation: coin._count.accumulationSignals,
        market: coin._count.marketSignals,
        total: coin._count.accumulationSignals + coin._count.marketSignals,
      },
      _count: undefined,
    }));
  }

  /**
   * Create a new coin
   */
  async createCoin(data: {
    name: string;
    symbol: string;
    contractAddress?: string | null;
    chain: Chain;
    totalSupply?: number;
    circulatingSupply?: number;
    priceUsd?: number;
    liquidityUsd?: number;
    isActive?: boolean;
    isFamous?: boolean;
  }) {
    const symbolUpper = data.symbol.toUpperCase();
    const contractAddress = data.contractAddress?.trim() || null;

    // Check if coin already exists
    // For coins with contract address, check by contractAddress+chain
    if (contractAddress) {
      const existingByAddress = await this.prisma.coin.findUnique({
        where: {
          contractAddress_chain: {
            contractAddress: contractAddress.toLowerCase(),
            chain: data.chain,
          },
        },
      });

      if (existingByAddress) {
        throw new BadRequestException(
          `Coin with contract address ${contractAddress} on ${data.chain} already exists`,
        );
      }
    }

    // For native coins (without contract address), check by symbol+chain
    // This prevents duplicate native coins on the same chain
    if (!contractAddress) {
      const existingNative = await this.prisma.coin.findFirst({
        where: {
          symbol: symbolUpper,
          chain: data.chain,
          contractAddress: null,
        },
      });

      if (existingNative) {
        throw new BadRequestException(
          `Native coin ${symbolUpper} on ${data.chain} already exists`,
        );
      }
    }

    const newCoin = await this.prisma.coin.create({
      data: {
        name: data.name,
        symbol: symbolUpper,
        contractAddress: contractAddress ? contractAddress.toLowerCase() : null,
        chain: data.chain,
        totalSupply: data.totalSupply,
        circulatingSupply: data.circulatingSupply,
        priceUsd: data.priceUsd,
        liquidityUsd: data.liquidityUsd,
        isActive: data.isActive || false,
        isFamous: data.isFamous || false,
      },
    });

    // Update chain coin count
    await this.updateChainCoinCount(data.chain);

    return newCoin;
  }

  /**
   * Update a coin
   */
  async updateCoin(
    coinId: string,
    data: {
      name?: string;
      symbol?: string;
      contractAddress?: string | null;
      chain?: Chain;
      totalSupply?: number | null;
      circulatingSupply?: number | null;
      priceUsd?: number | null;
      liquidityUsd?: number | null;
      isActive?: boolean;
      isFamous?: boolean;
    },
  ) {
    const coin = await this.prisma.coin.findUnique({
      where: { id: coinId },
    });

    if (!coin) {
      throw new NotFoundException('Coin not found');
    }

    const symbolUpper = data.symbol ? data.symbol.toUpperCase() : coin.symbol;
    const contractAddress = data.contractAddress !== undefined 
      ? (data.contractAddress?.trim() || null)
      : coin.contractAddress;
    const chain = data.chain || coin.chain;

    // Check for uniqueness conflicts if contractAddress or symbol/chain is being changed
    if (data.contractAddress !== undefined || data.chain !== undefined || data.symbol !== undefined) {
      // For coins with contract address, check by contractAddress+chain
      if (contractAddress) {
        const existingByAddress = await this.prisma.coin.findUnique({
          where: {
            contractAddress_chain: {
              contractAddress: contractAddress.toLowerCase(),
              chain: chain,
            },
          },
        });

        if (existingByAddress && existingByAddress.id !== coinId) {
          throw new BadRequestException(
            `Coin with contract address ${contractAddress} on ${chain} already exists`,
          );
        }
      }

      // For native coins (without contract address), check by symbol+chain
      if (!contractAddress) {
        const existingNative = await this.prisma.coin.findFirst({
          where: {
            symbol: symbolUpper,
            chain: chain,
            contractAddress: null,
            id: { not: coinId },
          },
        });

        if (existingNative) {
          throw new BadRequestException(
            `Native coin ${symbolUpper} on ${chain} already exists`,
          );
        }
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.symbol !== undefined) updateData.symbol = symbolUpper;
    if (data.contractAddress !== undefined) updateData.contractAddress = contractAddress;
    if (data.chain !== undefined) updateData.chain = data.chain;
    if (data.totalSupply !== undefined) updateData.totalSupply = data.totalSupply;
    if (data.circulatingSupply !== undefined) updateData.circulatingSupply = data.circulatingSupply;
    if (data.priceUsd !== undefined) updateData.priceUsd = data.priceUsd;
    if (data.liquidityUsd !== undefined) updateData.liquidityUsd = data.liquidityUsd;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isFamous !== undefined) updateData.isFamous = data.isFamous;

    const updatedCoin = await this.prisma.coin.update({
      where: { id: coinId },
      data: updateData,
    });

    // Update chain coin count if chain changed
    if (data.chain && data.chain !== coin.chain) {
      await this.updateChainCoinCount(coin.chain);
      await this.updateChainCoinCount(data.chain);
    }

    return updatedCoin;
  }

  /**
   * Delete a coin (only if no signals or watchlist items exist)
   */
  async deleteCoin(coinId: string) {
    const coin = await this.prisma.coin.findUnique({
      where: { id: coinId },
      include: {
        _count: {
          select: {
            accumulationSignals: true,
            marketSignals: true,
            watchlist: true,
            alerts: true,
          },
        },
      },
    });

    if (!coin) {
      throw new NotFoundException('Coin not found');
    }

    // Check if coin has any related data
    const hasRelatedData =
      coin._count.accumulationSignals > 0 ||
      coin._count.marketSignals > 0 ||
      coin._count.watchlist > 0 ||
      coin._count.alerts > 0;

    if (hasRelatedData) {
      throw new BadRequestException(
        'Cannot delete coin: it has signals, watchlist items, or alerts. Consider marking it as inactive instead.',
      );
    }

    const chain = coin.chain;
    const deletedCoin = await this.prisma.coin.delete({
      where: { id: coinId },
    });

    // Update chain coin count
    await this.updateChainCoinCount(chain);

    return deletedCoin;
  }

  /**
   * Get all coins with pagination and filtering
   */
  async getAllCoins(
    page: number = 1,
    limit: number = 50,
    filters?: {
      chain?: Chain;
      isActive?: boolean;
      isFamous?: boolean;
      search?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.chain) {
      where.chain = filters.chain;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.isFamous !== undefined) {
      where.isFamous = filters.isFamous;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { symbol: { contains: filters.search, mode: 'insensitive' } },
        { contractAddress: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.coin.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isFamous: 'desc' },
          { isActive: 'desc' },
          { name: 'asc' },
        ],
        include: {
          _count: {
            select: {
              accumulationSignals: true,
              marketSignals: true,
              watchlist: true,
            },
          },
        },
      }),
      this.prisma.coin.count({ where }),
    ]);

    const coinsWithCounts = data.map((coin) => ({
      ...coin,
      signalCounts: {
        accumulation: coin._count.accumulationSignals,
        market: coin._count.marketSignals,
        total: coin._count.accumulationSignals + coin._count.marketSignals,
      },
      watchlistCount: coin._count.watchlist,
      _count: undefined,
    }));

    return {
      data: coinsWithCounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
