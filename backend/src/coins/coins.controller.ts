import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CoinsService } from './coins.service';
import { CacheService } from '../common/cache/cache.service';
import { Chain } from '@prisma/client';

@Controller('coins')
export class CoinsController {
  constructor(
    private coinsService: CoinsService,
    private cacheService: CacheService,
  ) {}

  /**
   * GET /api/coins/search?symbol=ETH&chain=ETHEREUM
   * Search coins by symbol (case-insensitive)
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchCoins(
    @Query('symbol') symbol: string,
    @Query('chain') chain?: Chain,
  ) {
    if (!symbol) {
      return { data: [] };
    }

    const cacheKey = `coins:search:${symbol}:${chain || 'all'}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const coins = await this.coinsService.searchCoinsBySymbol(symbol, chain);
    const result = { data: coins };
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);
    
    return result;
  }

  /**
   * GET /api/coins?chain=ETHEREUM&page=1&limit=50
   * List coins by chain with pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getCoins(
    @Query('chain') chain?: Chain,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    if (!chain) {
      // If no chain specified, return empty or all coins (depending on requirements)
      return { data: [], meta: { total: 0, page: 1, limit, totalPages: 0 } };
    }

    const cacheKey = `coins:chain:${chain}:page:${page}:limit:${limit}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.coinsService.getCoinsByChain(chain, page, limit);
    
    // Cache for 2 minutes (coin lists change less frequently)
    await this.cacheService.set(cacheKey, result, 120);
    
    return result;
  }

  /**
   * GET /api/coins/autocomplete?q=ETH&chain=ETHEREUM&limit=10
   * Autocomplete coin search by symbol or name
   */
  @Get('autocomplete')
  @HttpCode(HttpStatus.OK)
  async autocompleteCoins(
    @Query('q') query: string,
    @Query('chain') chain?: Chain,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    if (!query || query.trim().length === 0) {
      return { data: [] };
    }

    const cacheKey = `coins:autocomplete:${query}:${chain || 'all'}:${limit}`;
    
    // Try cache first (shorter cache for autocomplete)
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const coins = await this.coinsService.autocompleteCoins(
      query,
      chain,
      limit,
    );
    const result = { data: coins };
    
    // Cache for 1 minute (autocomplete results change frequently)
    await this.cacheService.set(cacheKey, result, 60);
    
    return result;
  }

  /**
   * GET /api/coins/chains
   * Get all available chains that have coins in the database
   * Includes counts for total, active, and famous coins
   */
  @Get('chains')
  @HttpCode(HttpStatus.OK)
  async getAvailableChains() {
    const cacheKey = 'coins:available-chains';
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const chains = await this.coinsService.getAvailableChains();
    const result = { data: chains };
    
    // Cache for 10 minutes (chains don't change often)
    await this.cacheService.set(cacheKey, result, 600);
    
    return result;
  }

  /**
   * GET /api/coins/active-famous?chain=ETHEREUM&limit=20
   * Get active and famous coins for a chain
   */
  @Get('active-famous')
  @HttpCode(HttpStatus.OK)
  async getActiveFamousCoins(
    @Query('chain') chain: Chain,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    if (!chain) {
      return { data: [] };
    }

    const cacheKey = `coins:active-famous:${chain}:${limit}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const coins = await this.coinsService.getActiveFamousCoins(chain, limit);
    const result = { data: coins };
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);
    
    return result;
  }

  /**
   * GET /api/coins/:id
   * Get coin details by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getCoinById(@Param('id') id: string) {
    const cacheKey = this.cacheService.generateCoinKey(id);
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const coin = await this.coinsService.findCoinById(id);
    if (!coin) {
      throw new NotFoundException(`Coin with ID ${id} not found`);
    }
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, coin, 300);
    
    return coin;
  }
}
