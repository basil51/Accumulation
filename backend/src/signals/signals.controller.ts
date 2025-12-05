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
import { QuerySignalsDto } from './dto/query-signals.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/guard/subscription.guard';
import { RequireSubscription } from '../subscription/decorator/require-subscription.decorator';
import { SubscriptionLevel } from '@prisma/client';

@Controller('signals')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class SignalsController {
  constructor(private signalService: SignalService) {}

  /**
   * GET /api/signals/accumulation
   * Get list of accumulation signals
   * Requires: BASIC subscription or higher (FREE tier has no accumulation alerts)
   */
  @Get('accumulation')
  @RequireSubscription(SubscriptionLevel.BASIC)
  @HttpCode(HttpStatus.OK)
  async getAccumulationSignals(@Query() query: QuerySignalsDto) {
    return await this.signalService.findAccumulationSignals(query);
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
    return await this.signalService.findMarketSignals(query);
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
    return await this.signalService.findSignalsByCoin(coinId, limit);
  }
}

