import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { SignalService } from './services/signal.service';
import { CacheService } from '../common/cache/cache.service';
import { QuerySignalsDto } from './dto/query-signals.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/guard/subscription.guard';
import { RequireSubscription } from '../subscription/decorator/require-subscription.decorator';
import { SubscriptionLevel } from '@prisma/client';

@Controller('signals')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class SignalsController {
  constructor(
    private signalService: SignalService,
    private cacheService: CacheService,
  ) {}

  /**
   * GET /api/signals/accumulation
   * Get list of accumulation signals
   * Requires: BASIC subscription or higher (FREE tier has no accumulation alerts)
   */
  @Get('accumulation')
  @RequireSubscription(SubscriptionLevel.BASIC)
  @HttpCode(HttpStatus.OK)
  async getAccumulationSignals(@Query() query: QuerySignalsDto) {
    const cacheKey = `signals:accumulation:${this.cacheService.generateSignalsKey(query)}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const result = await this.signalService.findAccumulationSignals(query);
    
    // Cache for 2 minutes
    await this.cacheService.set(cacheKey, result, 120);
    
    return result;
  }

  /**
   * GET /api/signals/market
   * Get list of market signals
   * Requires: BASIC subscription or higher (FREE tier has delayed signals only)
   */
  @Get('market')
  @RequireSubscription(SubscriptionLevel.BASIC)
  @HttpCode(HttpStatus.OK)
  async getMarketSignals(@Query() query: QuerySignalsDto) {
    const cacheKey = `signals:market:${this.cacheService.generateSignalsKey(query)}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const result = await this.signalService.findMarketSignals(query);
    
    // Cache for 2 minutes
    await this.cacheService.set(cacheKey, result, 120);
    
    return result;
  }

  /**
   * GET /api/signals/accumulation/:id
   * Get accumulation signal by ID
   * Requires: BASIC subscription or higher
   */
  @Get('accumulation/:id')
  @RequireSubscription(SubscriptionLevel.BASIC)
  @HttpCode(HttpStatus.OK)
  async getAccumulationSignalById(@Param('id') id: string) {
    const signal = await this.signalService.findAccumulationSignalById(id);
    if (!signal) {
      throw new NotFoundException(`Accumulation signal with ID ${id} not found`);
    }
    return signal;
  }

  /**
   * GET /api/signals/market/:id
   * Get market signal by ID
   * Requires: BASIC subscription or higher
   */
  @Get('market/:id')
  @RequireSubscription(SubscriptionLevel.BASIC)
  @HttpCode(HttpStatus.OK)
  async getMarketSignalById(@Param('id') id: string) {
    const signal = await this.signalService.findMarketSignalById(id);
    if (!signal) {
      throw new NotFoundException(`Market signal with ID ${id} not found`);
    }
    return signal;
  }

  /**
   * GET /api/signals/coin/:coinId
   * Get all signals for a specific coin
   * Requires: BASIC subscription or higher
   */
  @Get('coin/:coinId')
  @RequireSubscription(SubscriptionLevel.BASIC)
  @HttpCode(HttpStatus.OK)
  async getSignalsByCoin(
    @Param('coinId') coinId: string,
    @Query('limit') limit?: number,
  ) {
    const limitNum = limit || 50;
    const cacheKey = `signals:coin:${coinId}:${limitNum}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const result = await this.signalService.findSignalsByCoin(coinId, limitNum);
    
    // Cache for 2 minutes
    await this.cacheService.set(cacheKey, result, 120);
    
    return result;
  }
}

