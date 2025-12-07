import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventsService } from './events.service';
import { CacheService } from '../common/cache/cache.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('events')
export class EventsController {
  constructor(
    @InjectQueue('events') private eventsQueue: Queue,
    private readonly eventsService: EventsService,
    private readonly cacheService: CacheService,
  ) {}

  @Post('alchemy')
  @HttpCode(HttpStatus.OK)
  async handleAlchemyWebhook(@Body() payload: any) {
    if (!payload || !payload.event) {
        throw new BadRequestException('Invalid Alchemy payload');
    }
    
    await this.eventsQueue.add('process-alchemy-webhook', payload);
    return { status: 'processing' };
  }

  @Post('covalent')
  @HttpCode(HttpStatus.OK)
  async handleCovalentWebhook(@Body() payload: any) {
    // Covalent webhook validation logic would go here (e.g., signature check)
    
    await this.eventsQueue.add('process-covalent-webhook', payload);
    return { status: 'processing' };
  }

  /**
   * GET /api/events/coin/:coinId
   * Get recent normalized events for a specific coin.
   * Requires authentication.
   */
  @Get('coin/:coinId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCoinEvents(
    @Param('coinId') coinId: string,
    @Query('limit') limit?: string,
  ) {
    const numericLimit = limit ? parseInt(limit, 10) : 50;
    const cacheKey = this.cacheService.generateEventsKey(coinId, numericLimit);
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const events = await this.eventsService.getRecentEventsForCoin(
      coinId,
      numericLimit,
    );
    const result = { data: events };
    
    // Cache for 1 minute (events change frequently)
    await this.cacheService.set(cacheKey, result, 60);
    
    return result;
  }
}
