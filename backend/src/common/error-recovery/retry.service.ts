import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryable?: (error: any) => boolean;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Retry a function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryable = this.defaultRetryable,
    } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors
        if (!retryable(error)) {
          this.logger.debug(`Non-retryable error: ${error}`);
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        this.logger.warn(
          `Attempt ${attempt + 1}/${maxRetries + 1} failed. Retrying in ${delay}ms...`,
        );

        // Wait before retry
        await this.sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    this.logger.error(`All ${maxRetries + 1} attempts failed`);
    throw lastError!;
  }

  /**
   * Default retryable check - retry on network errors, timeouts, and rate limits
   */
  private defaultRetryable(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP errors
    if (error.response) {
      const status = error.response.status;
      // Retry on 429 (rate limit), 500, 502, 503, 504
      if ([429, 500, 502, 503, 504].includes(status)) {
        return true;
      }
    }

    // Timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
      return true;
    }

    // Rate limit errors
    if (error.message?.includes('rate limit') || error.message?.includes('RATE_LIMIT')) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

