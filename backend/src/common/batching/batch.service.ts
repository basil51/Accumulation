import { Injectable, Logger } from '@nestjs/common';
import pLimit from 'p-limit';

export interface BatchRequest<T, R> {
  key: string;
  request: () => Promise<R>;
  data: T;
}

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  /**
   * Execute requests in batches with concurrency limit
   */
  async batch<T, R>(
    requests: BatchRequest<T, R>[],
    options: {
      concurrency?: number;
      batchSize?: number;
    } = {},
  ): Promise<Map<string, R>> {
    const { concurrency = 10, batchSize = 50 } = options;
    const limit = pLimit(concurrency);
    const results = new Map<string, R>();

    // Process in batches
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map((req) =>
        limit(async () => {
          try {
            const result = await req.request();
            results.set(req.key, result);
            return { key: req.key, success: true, result };
          } catch (error) {
            this.logger.warn(`Batch request failed for key ${req.key}:`, error);
            return { key: req.key, success: false, error };
          }
        }),
      );

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Group requests by a key and execute in parallel batches
   */
  async batchByKey<T, R>(
    requests: BatchRequest<T, R>[],
    groupBy: (req: BatchRequest<T, R>) => string,
    options: {
      concurrency?: number;
      batchSize?: number;
    } = {},
  ): Promise<Map<string, R[]>> {
    // Group requests
    const grouped = new Map<string, BatchRequest<T, R>[]>();
    for (const req of requests) {
      const groupKey = groupBy(req);
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(req);
    }

    // Execute each group
    const results = new Map<string, R[]>();
    for (const [groupKey, groupRequests] of grouped.entries()) {
      const groupResults = await this.batch(groupRequests, options);
      results.set(groupKey, Array.from(groupResults.values()));
    }

    return results;
  }
}

