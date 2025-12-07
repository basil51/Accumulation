import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SystemSettingsService } from './system-settings.service';
import { TokenSettingsService } from './token-settings.service';
import { CoinsService } from '../coins/coins.service';
import { CoinGeckoService } from '../integrations/coingecko/coingecko.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { UserRole, SubscriptionLevel, PaymentStatus, Chain } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly systemSettingsService: SystemSettingsService,
    private readonly tokenSettingsService: TokenSettingsService,
    private readonly coinsService: CoinsService,
    private readonly coinGeckoService: CoinGeckoService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/admin/analytics
   * Get dashboard analytics
   */
  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  /**
   * GET /api/admin/analytics/false-positives
   * Get false positive analytics
   */
  @Get('analytics/false-positives')
  async getFalsePositiveAnalytics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.adminService.getFalsePositiveAnalytics(days);
  }

  /**
   * GET /api/admin/users
   * Get all users with pagination
   */
  @Get('users')
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getUsers(page, limit);
  }

  /**
   * GET /api/admin/users/:id
   * Get user by ID
   */
  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  /**
   * PUT /api/admin/users/:id/subscription
   * Update user subscription
   */
  @Put('users/:id/subscription')
  async updateUserSubscription(
    @Param('id') id: string,
    @Body('subscriptionLevel') subscriptionLevel: SubscriptionLevel,
    @Body('subscriptionExpiry') subscriptionExpiry?: string,
  ) {
    const expiryDate = subscriptionExpiry
      ? new Date(subscriptionExpiry)
      : undefined;
    return this.adminService.updateUserSubscription(
      id,
      subscriptionLevel,
      expiryDate,
    );
  }

  /**
   * PUT /api/admin/users/:id/role
   * Update user role
   */
  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @GetUser() admin: { id: string },
  ) {
    return this.adminService.updateUserRole(id, role, admin.id);
  }

  /**
   * GET /api/admin/payments
   * Get all payments with filters
   */
  @Get('payments')
  async getPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.adminService.getPayments(page, limit, status);
  }

  /**
   * GET /api/admin/payments/:id
   * Get payment by ID
   */
  @Get('payments/:id')
  async getPaymentById(@Param('id') id: string) {
    return this.adminService.getPaymentById(id);
  }

  /**
   * PUT /api/admin/payments/:id/approve
   * Approve payment
   */
  @Put('payments/:id/approve')
  async approvePayment(
    @Param('id') id: string,
    @GetUser() admin: { id: string },
  ) {
    return this.adminService.approvePayment(id, admin.id);
  }

  /**
   * PUT /api/admin/payments/:id/reject
   * Reject payment
   */
  @Put('payments/:id/reject')
  async rejectPayment(
    @Param('id') id: string,
    @GetUser() admin: { id: string },
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectPayment(id, admin.id, reason);
  }

  /**
   * GET /api/admin/settings
   * Get all system settings
   */
  @Get('settings')
  async getSystemSettings() {
    return this.systemSettingsService.getAllSettings();
  }

  /**
   * GET /api/admin/settings/:key
   * Get a specific system setting
   */
  @Get('settings/:key')
  async getSystemSetting(@Param('key') key: string) {
    return this.systemSettingsService.getSetting(key);
  }

  /**
   * PUT /api/admin/settings/:key
   * Update a specific system setting
   */
  @Put('settings/:key')
  async updateSystemSetting(
    @Param('key') key: string,
    @Body('value') value: any,
    @GetUser() admin: { id: string },
  ) {
    const setting = await this.systemSettingsService.setSetting(
      key,
      value,
      admin.id,
    );

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_SYSTEM_SETTING',
        meta: {
          key,
          value,
        },
      },
    });

    return {
      message: 'System setting updated successfully',
      setting,
    };
  }

  /**
   * PUT /api/admin/settings
   * Update multiple system settings at once
   */
  @Put('settings')
  async updateSystemSettings(
    @Body() settings: Record<string, any>,
    @GetUser() admin: { id: string },
  ) {
    const updated = await this.systemSettingsService.setSettings(
      settings,
      admin.id,
    );

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_SYSTEM_SETTINGS',
        meta: {
          keys: Object.keys(settings),
        },
      },
    });

    return {
      message: 'System settings updated successfully',
      updated: updated.length,
    };
  }

  /**
   * POST /api/admin/settings/initialize
   * Initialize default system settings
   */
  @Post('settings/initialize')
  async initializeSystemSettings() {
    const created = await this.systemSettingsService.initializeDefaults();
    return {
      message: 'Default system settings initialized',
      created: created.length,
    };
  }

  /**
   * GET /api/admin/signals
   * Get signals with filters
   */
  @Get('signals')
  async getSignals(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('type') type?: 'accumulation' | 'market',
    @Query('falsePositive') falsePositive?: string,
  ) {
    const falsePositiveBool =
      falsePositive === 'true'
        ? true
        : falsePositive === 'false'
          ? false
          : undefined;
    return this.adminService.getSignals(page, limit, type, falsePositiveBool);
  }

  /**
   * PUT /api/admin/signals/accumulation/:id/false-positive
   * Mark accumulation signal as false positive
   */
  @Put('signals/accumulation/:id/false-positive')
  async markAccumulationSignalFalsePositive(
    @Param('id') id: string,
    @GetUser() admin: { id: string },
  ) {
    return this.adminService.markAccumulationSignalFalsePositive(id, admin.id);
  }

  /**
   * PUT /api/admin/signals/market/:id/false-positive
   * Mark market signal as false positive
   */
  @Put('signals/market/:id/false-positive')
  async markMarketSignalFalsePositive(
    @Param('id') id: string,
    @GetUser() admin: { id: string },
  ) {
    return this.adminService.markMarketSignalFalsePositive(id, admin.id);
  }

  /**
   * GET /api/admin/token-settings
   * Get all token settings with pagination
   */
  @Get('token-settings')
  async getTokenSettings(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.tokenSettingsService.getAllTokenSettings(page, limit);
  }

  /**
   * GET /api/admin/token-settings/:coinId
   * Get token settings for a specific coin
   */
  @Get('token-settings/:coinId')
  async getTokenSettingsByCoin(@Param('coinId') coinId: string) {
    return this.tokenSettingsService.getTokenSettings(coinId);
  }

  /**
   * PUT /api/admin/token-settings/:coinId
   * Create or update token settings
   */
  @Put('token-settings/:coinId')
  async upsertTokenSettings(
    @Param('coinId') coinId: string,
    @Body()
    body: {
      minLargeTransferUsd?: number;
      minUnits?: number;
      supplyPctSpecial?: number;
      liquidityRatioSpecial?: number;
    },
    @GetUser() admin: { id: string },
  ) {
    return this.tokenSettingsService.upsertTokenSettings(
      coinId,
      body,
      admin.id,
    );
  }

  /**
   * DELETE /api/admin/token-settings/:coinId
   * Delete token settings (reset to system defaults)
   */
  @Delete('token-settings/:coinId')
  async deleteTokenSettings(
    @Param('coinId') coinId: string,
    @GetUser() admin: { id: string },
  ) {
    await this.tokenSettingsService.deleteTokenSettings(coinId, admin.id);
    return { message: 'Token settings deleted successfully' };
  }

  /**
   * PUT /api/admin/coins/:coinId/status
   * Update coin active/famous status
   */
  @Put('coins/:coinId/status')
  async updateCoinStatus(
    @Param('coinId') coinId: string,
    @Body() body: { isActive?: boolean; isFamous?: boolean },
    @GetUser() admin: { id: string },
  ) {
    return this.adminService.updateCoinStatus(coinId, admin.id, body);
  }

  /**
   * GET /api/admin/coins
   * Get all coins with pagination and filtering
   */
  @Get('coins')
  async getAllCoins(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
    @Query('chain') chain?: Chain,
    @Query('isActive') isActive?: string,
    @Query('isFamous') isFamous?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (chain) filters.chain = chain;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isFamous !== undefined) filters.isFamous = isFamous === 'true';
    if (search) filters.search = search;

    return this.coinsService.getAllCoins(page, limit, filters);
  }

  /**
   * POST /api/admin/coins
   * Create a new coin
   */
  @Post('coins')
  async createCoin(
    @Body() body: {
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
    },
    @GetUser() admin: { id: string },
  ) {
    const coin = await this.coinsService.createCoin(body);
    
    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_COIN',
        meta: {
          coinId: coin.id,
          coinSymbol: coin.symbol,
          coinName: coin.name,
        },
      },
    });

    return coin;
  }

  /**
   * DELETE /api/admin/coins/:coinId
   * Delete a coin
   */
  @Delete('coins/:coinId')
  async deleteCoin(
    @Param('coinId') coinId: string,
    @GetUser() admin: { id: string },
  ) {
    const coin = await this.coinsService.findCoinById(coinId);
    if (!coin) {
      throw new NotFoundException('Coin not found');
    }

    await this.coinsService.deleteCoin(coinId);
    
    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'DELETE_COIN',
        meta: {
          coinId,
          coinSymbol: coin.symbol,
          coinName: coin.name,
        },
      },
    });

    return { message: 'Coin deleted successfully' };
  }

  /**
   * POST /api/admin/coins/import-coingecko
   * Import top coins from CoinGecko
   */
  @Post('coins/import-coingecko')
  async importCoinsFromCoinGecko(
    @Body() body: { limit?: number; minMarketCap?: number; batchSize?: number; batchDelayMinutes?: number; reset?: boolean },
    @GetUser() admin: { id: string },
  ) {
    const limit = body.limit || 1000;
    const minMarketCap = body.minMarketCap || 25000; // $25k minimum
    const batchSize = body.batchSize || 50;
    const batchDelayMinutes = body.batchDelayMinutes || 5;

    // Reset progress if requested
    if (body.reset) {
      await this.prisma.systemSettings.upsert({
        where: { key: 'coingecko_import_last_index' },
        update: { value: 0 },
        create: {
          key: 'coingecko_import_last_index',
          value: 0,
        },
      });
    }

    const result = await this.coinGeckoService.importCoinsFromCoinGecko(
      limit,
      minMarketCap,
      batchSize,
      batchDelayMinutes,
    );

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'IMPORT_COINS_COINGECKO',
        meta: {
          limit,
          minMarketCap,
          batchSize,
          batchDelayMinutes,
          reset: body.reset || false,
          result,
        },
      },
    });

    return {
      message: 'Coin import batch completed',
      ...result,
    };
  }

  /**
   * GET /api/admin/chains
   * Get all chains with statistics
   */
  @Get('chains')
  async getAllChains() {
    const chains = await this.prisma.chainInfo.findMany({
      orderBy: [
        { coinCount: 'desc' },
        { chain: 'asc' },
      ],
    });

    return { data: chains };
  }

  /**
   * POST /api/admin/chains
   * Create a new chain
   */
  @Post('chains')
  async createChain(
    @Body() body: { chain: string; name: string; isActive?: boolean },
    @GetUser() admin: { id: string },
  ) {
    // Validate required fields
    if (!body.chain || !body.name) {
      throw new BadRequestException('Chain and name are required fields');
    }

    // Validate chain is a valid Chain enum value
    const chainUpper = body.chain.trim().toUpperCase();
    if (!chainUpper) {
      throw new BadRequestException('Chain value cannot be empty');
    }

    if (!Object.values(Chain).includes(chainUpper as Chain)) {
      throw new BadRequestException(
        `Invalid chain value: "${body.chain}". Valid values are: ${Object.values(Chain).join(', ')}`,
      );
    }

    const chainEnum = chainUpper as Chain;

    // Check if chain already exists
    const existing = await this.prisma.chainInfo.findUnique({
      where: { chain: chainEnum },
    });

    if (existing) {
      throw new BadRequestException(`Chain ${chainEnum} already exists`);
    }

    try {
      const chainInfo = await this.prisma.chainInfo.create({
        data: {
          chain: chainEnum,
          name: body.name.trim(),
          isActive: body.isActive ?? true,
          coinCount: 0,
          signalCount: 0,
        },
      });

      // Log admin action
      await this.prisma.adminLog.create({
        data: {
          adminId: admin.id,
          action: 'CREATE_CHAIN',
          meta: {
            chain: chainEnum,
            name: body.name,
          },
        },
      }).catch((err) => {
        // Log error but don't fail the request
        console.error('Failed to log admin action:', err);
      });

      return chainInfo;
    } catch (error: any) {
      // Provide more detailed error message
      if (error.code === 'P2002') {
        throw new BadRequestException(`Chain ${chainEnum} already exists`);
      }
      if (error.message?.includes('invalid input value for enum')) {
        throw new BadRequestException(
          `Invalid chain value: "${body.chain}". The database enum may not include this value. Please ensure the migration has been applied.`,
        );
      }
      throw error;
    }
  }

  /**
   * PUT /api/admin/chains/:chain
   * Update chain information (name, isActive)
   */
  @Put('chains/:chain')
  async updateChain(
    @Param('chain') chain: Chain,
    @Body() body: { name?: string; isActive?: boolean },
    @GetUser() admin: { id: string },
  ) {
    const chainInfo = await this.prisma.chainInfo.findUnique({
      where: { chain },
    });

    if (!chainInfo) {
      throw new NotFoundException(`Chain ${chain} not found`);
    }

    const updated = await this.prisma.chainInfo.update({
      where: { chain },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_CHAIN',
        meta: {
          chain,
          updates: body,
        },
      },
    });

    return updated;
  }

  /**
   * DELETE /api/admin/chains/:chain
   * Delete a chain (only if it has no coins)
   */
  @Delete('chains/:chain')
  async deleteChain(
    @Param('chain') chain: Chain,
    @GetUser() admin: { id: string },
  ) {
    const chainInfo = await this.prisma.chainInfo.findUnique({
      where: { chain },
    });

    if (!chainInfo) {
      throw new NotFoundException(`Chain ${chain} not found`);
    }

    // Check if chain has coins
    const coinCount = await this.prisma.coin.count({
      where: { chain },
    });

    if (coinCount > 0) {
      throw new BadRequestException(
        `Cannot delete chain: it has ${coinCount} coin(s). Remove all coins first.`,
      );
    }

    await this.prisma.chainInfo.delete({
      where: { chain },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'DELETE_CHAIN',
        meta: {
          chain,
          name: chainInfo.name,
        },
      },
    });

    return { message: `Chain ${chain} deleted successfully` };
  }

  /**
   * PUT /api/admin/chains/:chain/status
   * Update chain active status
   */
  @Put('chains/:chain/status')
  async updateChainStatus(
    @Param('chain') chain: Chain,
    @Body() body: { isActive: boolean },
    @GetUser() admin: { id: string },
  ) {
    const chainInfo = await this.prisma.chainInfo.findUnique({
      where: { chain },
    });

    if (!chainInfo) {
      throw new NotFoundException(`Chain ${chain} not found`);
    }

    const updated = await this.prisma.chainInfo.update({
      where: { chain },
      data: { isActive: body.isActive },
    });

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_CHAIN_STATUS',
        meta: {
          chain,
          isActive: body.isActive,
        },
      },
    });

    return updated;
  }

  /**
   * POST /api/admin/chains/recalculate-counts
   * Recalculate and update coin counts for all chains
   */
  @Post('chains/recalculate-counts')
  async recalculateChainCoinCounts(@GetUser() admin: { id: string }) {
    const result = await this.coinsService.recalculateAllChainCoinCounts();

    // Log admin action
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'RECALCULATE_CHAIN_COIN_COUNTS',
        meta: {
          totalChains: result.totalChains,
          updated: result.updated,
        },
      },
    });

    return {
      message: `Recalculated coin counts for ${result.totalChains} chains. ${result.updated} chains were updated.`,
      ...result,
    };
  }
}

