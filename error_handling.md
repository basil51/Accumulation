# error_handling.md — Error Handling Strategy

This document defines the **comprehensive error handling strategy** for the platform, including error types, handling patterns, retry strategies, circuit breakers, and monitoring.

---

## 1. Error Handling Philosophy

* **Fail fast** - Detect errors early
* **Fail gracefully** - Never crash the application
* **Log everything** - All errors should be logged
* **User-friendly messages** - Don't expose internal errors to users
* **Retry intelligently** - Retry transient errors, fail fast on permanent errors
* **Monitor and alert** - Track error rates and patterns

---

## 2. Error Types

### 2.1 Application Errors

**Validation Errors (400)**
* Invalid input data
* Missing required fields
* Type mismatches

**Authentication Errors (401)**
* Invalid credentials
* Expired tokens
* Missing authentication

**Authorization Errors (403)**
* Insufficient permissions
* Subscription tier restrictions

**Not Found Errors (404)**
* Resource doesn't exist
* Invalid IDs

**Conflict Errors (409)**
* Duplicate resources
* Concurrent modifications

**Rate Limit Errors (429)**
* Too many requests
* API quota exceeded

**Server Errors (500)**
* Unexpected errors
* Database failures
* External service failures

### 2.2 Provider Errors

**Rate Limit Errors**
* HTTP 429 from provider API
* Quota exceeded

**Timeout Errors**
* Request timeout
* Connection timeout

**Network Errors**
* Connection refused
* DNS resolution failure
* Network unreachable

**API Errors**
* Invalid API key
* Invalid request format
* Provider service unavailable

---

## 3. Error Response Format

### 3.1 Standard Error Response

All API errors return this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2025-01-15T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 3.2 Error Codes

**Format:** `CATEGORY_SUB_CATEGORY`

**Examples:**
* `VALIDATION_REQUIRED_FIELD` - Missing required field
* `AUTH_INVALID_CREDENTIALS` - Invalid email/password
* `AUTH_TOKEN_EXPIRED` - JWT token expired
* `PAYMENT_INSUFFICIENT_AMOUNT` - Payment amount too low
* `SUBSCRIPTION_TIER_RESTRICTED` - Feature requires higher tier
* `PROVIDER_RATE_LIMIT` - Provider API rate limited
* `PROVIDER_TIMEOUT` - Provider request timeout
* `DATABASE_CONNECTION_ERROR` - Database unavailable

---

## 4. Error Handling Implementation

### 4.1 NestJS Exception Filters

**Global Exception Filter:**
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = 500;
    let error: ErrorResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = this.formatHttpException(exception);
    } else if (exception instanceof ValidationError) {
      status = 400;
      error = this.formatValidationError(exception);
    } else {
      error = this.formatUnknownError(exception);
      // Log unexpected errors
      this.logger.error(exception, {
        requestId: request.id,
        url: request.url,
        method: request.method
      });
    }

    response.status(status).json({
      error: {
        ...error,
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    });
  }
}
```

### 4.2 Custom Exceptions

```typescript
export class PaymentRejectedException extends HttpException {
  constructor(reason: string) {
    super(
      {
        code: 'PAYMENT_REJECTED',
        message: 'Payment was rejected',
        details: { reason }
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class SubscriptionTierException extends HttpException {
  constructor(requiredTier: string, currentTier: string) {
    super(
      {
        code: 'SUBSCRIPTION_TIER_RESTRICTED',
        message: `This feature requires ${requiredTier} subscription`,
        details: { requiredTier, currentTier }
      },
      HttpStatus.FORBIDDEN
    );
  }
}
```

---

## 5. Provider Error Handling

### 5.1 Provider Error Types

```typescript
export class ProviderError extends Error {
  constructor(
    public provider: string,
    public code: string,
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(
      provider,
      'RATE_LIMIT',
      `Rate limit exceeded for ${provider}`,
      429,
      true
    );
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class TimeoutError extends ProviderError {
  constructor(provider: string) {
    super(
      provider,
      'TIMEOUT',
      `Request to ${provider} timed out`,
      undefined,
      true
    );
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string) {
    super(
      provider,
      'UNAVAILABLE',
      `${provider} service is unavailable`,
      503,
      true
    );
  }
}
```

### 5.2 Provider Error Handler

```typescript
export class ProviderErrorHandler {
  async handleError(error: unknown, provider: string): Promise<void> {
    if (error instanceof RateLimitError) {
      await this.handleRateLimit(error, provider);
    } else if (error instanceof TimeoutError) {
      await this.handleTimeout(error, provider);
    } else if (error instanceof ProviderUnavailableError) {
      await this.handleUnavailable(error, provider);
    } else {
      await this.handleUnknownError(error, provider);
    }

    // Log to ApiUsageLog
    await this.logError(provider, error);
  }

  private async handleRateLimit(error: RateLimitError, provider: string) {
    // Implement exponential backoff
    const delay = error.retryAfter || this.calculateBackoff(provider);
    await this.scheduleRetry(provider, delay);
    
    // Trigger circuit breaker if too many rate limits
    if (this.getRateLimitCount(provider) > 5) {
      await this.triggerCircuitBreaker(provider);
    }
  }
}
```

---

## 6. Retry Strategies

### 6.1 Exponential Backoff

```typescript
export class RetryStrategy {
  async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2
    } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await this.sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError!;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof TimeoutError) return true;
    if (error instanceof ProviderUnavailableError) return true;
    
    // Network errors are retryable
    if (error instanceof NetworkError) return true;
    
    return false;
  }
}
```

### 6.2 Retry Configuration

```typescript
// Retry configuration per provider
const retryConfig = {
  alchemy: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2
  },
  covalent: {
    maxRetries: 2,
    initialDelay: 2000,
    backoffMultiplier: 1.5
  },
  coingecko: {
    maxRetries: 2,
    initialDelay: 500,
    backoffMultiplier: 2
  }
};
```

---

## 7. Circuit Breaker Pattern

### 7.1 Circuit Breaker Implementation

```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return elapsed >= this.timeout;
  }
}
```

### 7.2 Provider Circuit Breakers

```typescript
// One circuit breaker per provider
const circuitBreakers = {
  alchemy: new CircuitBreaker(5, 60000),
  covalent: new CircuitBreaker(5, 60000),
  coingecko: new CircuitBreaker(3, 30000)
};

// Usage
try {
  const result = await circuitBreakers.alchemy.execute(() =>
    alchemyService.fetchTransfers(params)
  );
} catch (error) {
  // Handle circuit breaker error
  logger.warn('Alchemy circuit breaker is OPEN');
  // Fallback to alternative provider or cached data
}
```

---

## 8. Dead Letter Queue

### 8.1 Failed Job Handling

```typescript
// BullMQ job failure handler
export class JobErrorHandler {
  async handleFailedJob(job: Job, error: Error) {
    // Log error
    logger.error('Job failed', {
      jobId: job.id,
      jobName: job.name,
      error: error.message,
      attempts: job.attemptsMade
    });

    // If max retries exceeded, move to dead letter queue
    if (job.attemptsMade >= job.opts.attempts) {
      await this.moveToDeadLetterQueue(job, error);
    }

    // Alert if critical
    if (this.isCriticalError(error)) {
      await this.sendAlert(job, error);
    }
  }

  private async moveToDeadLetterQueue(job: Job, error: Error) {
    await deadLetterQueue.add(job.name, {
      originalJob: job.data,
      error: error.message,
      failedAt: new Date()
    });
  }
}
```

---

## 9. Error Logging

### 9.1 Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log errors with context
logger.error('Provider error', {
  provider: 'alchemy',
  endpoint: '/transfers',
  error: error.message,
  stack: error.stack,
  requestId: request.id,
  userId: request.user?.id
});
```

### 9.2 Sentry Integration

```typescript
import * as Sentry from '@sentry/node';

// Capture exceptions
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      provider: 'alchemy',
      operation: 'fetchTransfers'
    },
    extra: {
      requestId: request.id,
      userId: request.user?.id
    }
  });
  throw error;
}
```

---

## 10. User-Facing Error Messages

### 10.1 Error Message Mapping

```typescript
const errorMessages = {
  VALIDATION_REQUIRED_FIELD: 'Please fill in all required fields',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  PAYMENT_REJECTED: 'Your payment was rejected. Please contact support.',
  SUBSCRIPTION_TIER_RESTRICTED: 'This feature requires a higher subscription tier.',
  PROVIDER_RATE_LIMIT: 'Service is temporarily unavailable. Please try again later.',
  PROVIDER_TIMEOUT: 'Request timed out. Please try again.',
  DATABASE_ERROR: 'An error occurred. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please contact support if this persists.'
};

export function getUserFriendlyMessage(errorCode: string): string {
  return errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
}
```

### 10.2 Frontend Error Handling

```typescript
// React error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack }
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

## 11. Error Monitoring & Alerting

### 11.1 Error Rate Monitoring

```typescript
// Track error rates
const errorMetrics = {
  totalErrors: 0,
  errorsByType: {},
  errorsByProvider: {},
  errorRate: 0
};

// Update metrics on error
function recordError(error: Error, context: ErrorContext) {
  errorMetrics.totalErrors++;
  errorMetrics.errorsByType[error.constructor.name] = 
    (errorMetrics.errorsByType[error.constructor.name] || 0) + 1;
  
  if (context.provider) {
    errorMetrics.errorsByProvider[context.provider] = 
      (errorMetrics.errorsByProvider[context.provider] || 0) + 1;
  }

  // Alert if error rate too high
  if (errorMetrics.errorRate > 0.1) { // 10% error rate
    sendAlert('High error rate detected', errorMetrics);
  }
}
```

### 11.2 Alerting Rules

* **Error rate > 10%** - Send alert
* **Provider unavailable > 5 minutes** - Send alert
* **Circuit breaker opened** - Send alert
* **Database connection errors** - Send critical alert
* **Payment processing errors** - Send critical alert

---

## 12. Error Recovery

### 12.1 Graceful Degradation

```typescript
// Fallback to cached data if provider fails
async function fetchTokenPrice(contract: string, chain: string) {
  try {
    return await coingeckoService.getPrice(contract, chain);
  } catch (error) {
    logger.warn('CoinGecko failed, using cache', { contract, chain });
    return await priceCache.get(contract, chain);
  }
}
```

### 12.2 Alternative Providers

```typescript
// Try alternative provider if primary fails
async function fetchTransfers(params: FetchParams) {
  try {
    return await alchemyService.fetchTransfers(params);
  } catch (error) {
    logger.warn('Alchemy failed, trying Covalent', { params });
    return await covalentService.fetchTransfers(params);
  }
}
```

---

## 13. Testing Error Handling

### 13.1 Error Scenario Tests

```typescript
describe('Error Handling', () => {
  it('should handle rate limit errors', async () => {
    mockAlchemyApi.mockRateLimit();
    
    await expect(
      alchemyService.fetchTransfers(params)
    ).rejects.toThrow(RateLimitError);
    
    expect(circuitBreaker.state).toBe('OPEN');
  });

  it('should retry on timeout', async () => {
    mockProvider.mockTimeout();
    
    const result = await retryStrategy.retry(() =>
      providerService.fetch()
    );
    
    expect(mockProvider.calls).toBeGreaterThan(1);
  });
});
```

---

**End of error_handling.md**

