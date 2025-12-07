import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Reset entire cache
   * Note: cache-manager v7 doesn't have reset method
   * This is a placeholder for future implementation
   */
  async reset(): Promise<void> {
    try {
      // cache-manager v7 doesn't support reset directly
      // Would need to access the underlying store to implement this
      this.logger.warn('Cache reset not implemented in cache-manager v7');
    } catch (error) {
      this.logger.warn('Cache reset error:', error);
    }
  }

  /**
   * Generate cache key for signals
   */
  generateSignalsKey(query: any): string {
    const params = new URLSearchParams(
      Object.entries(query)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)]),
    );
    return `signals:${params.toString()}`;
  }

  /**
   * Generate cache key for coin
   */
  generateCoinKey(coinId: string): string {
    return `coin:${coinId}`;
  }

  /**
   * Generate cache key for events
   */
  generateEventsKey(coinId: string, limit: number): string {
    return `events:${coinId}:${limit}`;
  }
}

