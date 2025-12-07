import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface TokenSettingsInput {
  minLargeTransferUsd?: number;
  minUnits?: number;
  supplyPctSpecial?: number;
  liquidityRatioSpecial?: number;
}

@Injectable()
export class TokenSettingsService {
  private readonly logger = new Logger(TokenSettingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get token settings for a specific coin
   */
  async getTokenSettings(coinId: string) {
    const settings = await this.prisma.tokenSettings.findUnique({
      where: { coinId },
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

    return settings;
  }

  /**
   * Get all token settings with pagination
   */
  async getAllTokenSettings(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.tokenSettings.findMany({
        skip,
        take: limit,
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
          updatedAt: 'desc',
        },
      }),
      this.prisma.tokenSettings.count(),
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
   * Create or update token settings
   */
  async upsertTokenSettings(
    coinId: string,
    input: TokenSettingsInput,
    adminUserId: string,
  ) {
    // Verify coin exists
    const coin = await this.prisma.coin.findUnique({
      where: { id: coinId },
    });

    if (!coin) {
      throw new NotFoundException(`Coin with ID ${coinId} not found`);
    }

    const settings = await this.prisma.tokenSettings.upsert({
      where: { coinId },
      create: {
        coinId,
        minLargeTransferUsd: input.minLargeTransferUsd,
        minUnits: input.minUnits,
        supplyPctSpecial: input.supplyPctSpecial,
        liquidityRatioSpecial: input.liquidityRatioSpecial,
      },
      update: {
        minLargeTransferUsd: input.minLargeTransferUsd,
        minUnits: input.minUnits,
        supplyPctSpecial: input.supplyPctSpecial,
        liquidityRatioSpecial: input.liquidityRatioSpecial,
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

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: adminUserId,
        action: 'UPDATE_TOKEN_SETTINGS',
        meta: {
          coinId,
          coinName: coin.name,
          coinSymbol: coin.symbol,
          settings: input,
        } as any,
      },
    });

    this.logger.log(
      `Token settings updated for coin ${coin.name} (${coin.symbol}) by admin ${adminUserId}`,
    );

    return settings;
  }

  /**
   * Delete token settings (reset to system defaults)
   */
  async deleteTokenSettings(coinId: string, adminUserId: string) {
    const settings = await this.prisma.tokenSettings.findUnique({
      where: { coinId },
      include: { coin: true },
    });

    if (!settings) {
      throw new NotFoundException(
        `Token settings for coin ${coinId} not found`,
      );
    }

    await this.prisma.tokenSettings.delete({
      where: { coinId },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: adminUserId,
        action: 'DELETE_TOKEN_SETTINGS',
        meta: {
          coinId,
          coinName: settings.coin.name,
          coinSymbol: settings.coin.symbol,
        } as any,
      },
    });

    this.logger.log(
      `Token settings deleted for coin ${settings.coin.name} (${settings.coin.symbol}) by admin ${adminUserId}`,
    );
  }

  /**
   * Get effective thresholds for a coin (system defaults + token overrides)
   */
  async getEffectiveThresholds(coinId: string) {
    const tokenSettings = await this.prisma.tokenSettings.findUnique({
      where: { coinId },
    });

    // This will be used by the detection engine
    // For now, return token settings if they exist
    return tokenSettings;
  }
}

