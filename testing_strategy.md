# testing_strategy.md — Testing Strategy & Guidelines

This document defines the **comprehensive testing strategy** for the platform, including unit tests, integration tests, E2E tests, and backtesting approaches.

---

## 1. Testing Philosophy

* **Test-driven development (TDD)** for critical business logic (detection engine)
* **High coverage** for core features (detection rules, normalization, scoring)
* **Integration tests** for API endpoints and workflows
* **E2E tests** for critical user flows (auth, payment, alerts)
* **Backtesting** for detection engine accuracy

---

## 2. Testing Stack

### Backend (NestJS)

* **Jest** - Test runner and assertion library
* **Supertest** - HTTP assertion library for API tests
* **@nestjs/testing** - NestJS testing utilities
* **Prisma Mock** - Mock Prisma client for unit tests

### Frontend (Next.js)

* **Jest** - Unit tests
* **React Testing Library** - Component testing
* **Playwright** or **Cypress** - E2E tests

### Test Databases

* **PostgreSQL** - Use separate test database
* **Redis** - Use separate test Redis instance or mock

---

## 3. Test Structure

```
/backend
  /src
    /modules
      /detection
        /detection.service.spec.ts
        /rules
          /large-transfer.rule.spec.ts
      /integrations
        /alchemy
          /alchemy.service.spec.ts
    /test
      /e2e
        /auth.e2e-spec.ts
        /payments.e2e-spec.ts
      /integration
        /api
          /signals.integration-spec.ts
      /fixtures
        /events.ts
        /users.ts
      /helpers
        /test-db.ts
        /test-redis.ts
```

---

## 4. Unit Tests

### 4.1 Detection Engine Rules

Each detection rule must have comprehensive unit tests.

**Example: Large Transfer Rule**

```typescript
describe('LargeTransferRule', () => {
  it('should trigger for transfers above threshold', () => {
    const event = createMockEvent({ amountUsd: 60000 });
    const config = { large_transfer_usd: 50000 };
    
    const result = largeTransferRule.evaluate(event, config);
    
    expect(result.score).toBe(20);
    expect(result.triggered).toBe(true);
  });

  it('should not trigger for transfers below threshold', () => {
    const event = createMockEvent({ amountUsd: 30000 });
    const config = { large_transfer_usd: 50000 };
    
    const result = largeTransferRule.evaluate(event, config);
    
    expect(result.score).toBe(0);
    expect(result.triggered).toBe(false);
  });

  it('should respect token-specific overrides', () => {
    const event = createMockEvent({ amountUsd: 150000 });
    const config = { large_transfer_usd: 50000 };
    const tokenSettings = { minLargeTransferUsd: 200000 };
    
    const result = largeTransferRule.evaluate(event, config, tokenSettings);
    
    expect(result.triggered).toBe(false);
  });
});
```

**Coverage Requirements:**
* All rule conditions
* Edge cases (zero values, null values, very large numbers)
* Token-specific overrides
* User-specific overrides

---

### 4.2 Scoring Engine

```typescript
describe('ScoringEngine', () => {
  it('should normalize scores to 0-100 range', () => {
    const ruleResults = [
      { rule: 'large_transfer', score: 20 },
      { rule: 'supply_pct', score: 15 },
      { rule: 'liquidity_ratio', score: 10 }
    ];
    
    const finalScore = scoringEngine.compute(ruleResults);
    
    expect(finalScore).toBeGreaterThanOrEqual(0);
    expect(finalScore).toBeLessThanOrEqual(100);
  });

  it('should apply candidate threshold correctly', () => {
    const score = 65;
    const candidateThreshold = 60;
    
    expect(scoringEngine.isCandidate(score, candidateThreshold)).toBe(true);
  });
});
```

---

### 4.3 Event Normalization

```typescript
describe('EventNormalizer', () => {
  it('should normalize Alchemy events', () => {
    const alchemyEvent = createAlchemyEvent();
    
    const normalized = normalizer.normalize(alchemyEvent, 'alchemy');
    
    expect(normalized.provider).toBe('alchemy');
    expect(normalized.type).toBe('transfer');
    expect(normalized.amountUsd).toBeDefined();
  });

  it('should normalize Covalent events', () => {
    const covalentEvent = createCovalentEvent();
    
    const normalized = normalizer.normalize(covalentEvent, 'covalent');
    
    expect(normalized.provider).toBe('covalent');
    expect(normalized.amountUsd).toBeDefined();
  });

  it('should handle missing price data', () => {
    const event = createEventWithoutPrice();
    
    const normalized = normalizer.normalize(event, 'alchemy');
    
    expect(normalized.amountUsd).toBe(0); // or fetch from CoinGecko
  });
});
```

---

### 4.4 Settings Service

```typescript
describe('SettingsService', () => {
  it('should return system defaults when user has no overrides', () => {
    const settings = settingsService.getUserSettings(userId);
    
    expect(settings.useSystemDefaults).toBe(true);
  });

  it('should merge user overrides with system defaults', () => {
    const userSettings = { overrideLargeTransferUsd: 10000 };
    
    const merged = settingsService.mergeSettings(userSettings);
    
    expect(merged.largeTransferUsd).toBe(10000);
  });
});
```

---

## 5. Integration Tests

### 5.1 API Endpoints

```typescript
describe('Signals API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    
    // Create test user and get token
    authToken = await createTestUserAndLogin(app);
  });

  it('GET /api/signals should return signals', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/signals')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/signals should require authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/signals')
      .expect(401);
  });

  it('GET /api/signals should filter by coinId', async () => {
    const coinId = await createTestCoin(app);
    
    const response = await request(app.getHttpServer())
      .get(`/api/signals?coinId=${coinId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data.every(s => s.coin.id === coinId)).toBe(true);
  });
});
```

---

### 5.2 Payment Flow

```typescript
describe('Payment Flow (e2e)', () => {
  it('should create pending payment', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ plan: 'PRO', network: 'TRC20' })
      .expect(201);

    expect(response.body.status).toBe('PENDING');
    expect(response.body.walletAddress).toBeDefined();
  });

  it('should upload payment proof', async () => {
    const payment = await createPendingPayment(app, authToken);
    
    const response = await request(app.getHttpServer())
      .post(`/api/payments/${payment.id}/upload-proof`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('screenshot', './test/fixtures/payment-screenshot.png')
      .field('txHash', '0xabc...')
      .expect(200);

    expect(response.body.screenshotUrl).toBeDefined();
  });

  it('should activate subscription on admin approval', async () => {
    const payment = await createPaymentWithProof(app, authToken);
    const adminToken = await getAdminToken(app);
    
    await request(app.getHttpServer())
      .post(`/api/admin/payments/${payment.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const user = await getUser(app, userId);
    expect(user.subscriptionLevel).toBe('PRO');
    expect(user.subscriptionExpiry).toBeDefined();
  });
});
```

---

### 5.3 Provider Integrations

```typescript
describe('Alchemy Integration', () => {
  it('should fetch transfers', async () => {
    const fetcher = new AlchemyFetcher(mockConfig);
    
    const events = await fetcher.fetchTransfers({
      chain: 'eth-mainnet',
      fromBlock: 18000000,
      toBlock: 18000100
    });

    expect(events).toBeInstanceOf(Array);
    expect(events[0]).toHaveProperty('txHash');
  });

  it('should handle rate limit errors', async () => {
    mockAlchemyApi.mockRateLimitError();
    
    await expect(
      fetcher.fetchTransfers({ chain: 'eth-mainnet' })
    ).rejects.toThrow(RateLimitError);
  });

  it('should retry on transient errors', async () => {
    mockAlchemyApi.mockTransientError();
    
    const events = await fetcher.fetchTransfers({
      chain: 'eth-mainnet'
    });

    expect(mockAlchemyApi.calls).toBeGreaterThan(1); // Retried
  });
});
```

---

## 6. End-to-End Tests

### 6.1 User Registration & Subscription Flow

```typescript
describe('User Registration & Subscription (E2E)', () => {
  it('should complete full user journey', async () => {
    // 1. Register
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });
    
    const token = registerResponse.body.accessToken;

    // 2. Add to watchlist
    await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ coinId: testCoinId });

    // 3. Initiate payment
    const paymentResponse = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'PRO', network: 'TRC20' });

    // 4. Upload proof (simulated)
    await request(app)
      .post(`/api/payments/${paymentResponse.body.id}/upload-proof`)
      .set('Authorization', `Bearer ${token}`)
      .attach('screenshot', testScreenshot);

    // 5. Admin approves
    await request(app)
      .post(`/api/admin/payments/${paymentResponse.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 6. Verify subscription active
    const userResponse = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(userResponse.body.subscriptionLevel).toBe('PRO');
  });
});
```

---

### 6.2 Signal Detection Flow

```typescript
describe('Signal Detection Flow (E2E)', () => {
  it('should detect accumulation and create alert', async () => {
    // 1. Ingest event
    const event = createLargeTransferEvent();
    await eventIngester.ingest(event);

    // 2. Wait for detection
    await waitForDetection();

    // 3. Check signal created
    const signals = await signalRepository.findByCoin(testCoinId);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].score).toBeGreaterThanOrEqual(60);

    // 4. Check alert created for watchlist users
    const alerts = await alertRepository.findByUser(testUserId);
    expect(alerts.length).toBeGreaterThan(0);
  });
});
```

---

## 7. Backtesting

### 7.1 Historical Event Testing

```typescript
describe('Detection Engine Backtesting', () => {
  it('should detect known accumulation events', async () => {
    // Load historical events from test dataset
    const historicalEvents = await loadHistoricalEvents('2024-01-01', '2024-01-31');
    
    const results = [];
    for (const event of historicalEvents) {
      const signal = await detectionEngine.process(event);
      if (signal) {
        results.push({
          event,
          signal,
          expected: getExpectedSignal(event) // Known good signals
        });
      }
    }

    // Calculate precision and recall
    const metrics = calculateMetrics(results);
    
    expect(metrics.precision).toBeGreaterThan(0.7); // 70% precision
    expect(metrics.recall).toBeGreaterThan(0.6); // 60% recall
  });

  it('should have low false positive rate', async () => {
    const falsePositives = results.filter(r => 
      r.signal && !r.expected
    );
    
    const fpr = falsePositives.length / results.length;
    expect(fpr).toBeLessThan(0.1); // Less than 10% false positives
  });
});
```

---

### 7.2 Threshold Tuning

```typescript
describe('Threshold Tuning', () => {
  it('should find optimal thresholds', async () => {
    const testCases = [
      { large_transfer_usd: 30000, expectedPrecision: 0.65 },
      { large_transfer_usd: 50000, expectedPrecision: 0.75 },
      { large_transfer_usd: 70000, expectedPrecision: 0.80 },
    ];

    for (const testCase of testCases) {
      const metrics = await backtestWithThresholds(testCase);
      expect(metrics.precision).toBeGreaterThanOrEqual(testCase.expectedPrecision);
    }
  });
});
```

---

## 8. Performance Tests

### 8.1 Load Testing

```typescript
describe('API Load Testing', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app)
        .get('/api/signals')
        .set('Authorization', `Bearer ${token}`)
    );

    const responses = await Promise.all(requests);
    
    const successRate = responses.filter(r => r.status === 200).length / 100;
    expect(successRate).toBeGreaterThan(0.95); // 95% success rate
  });

  it('should process events at required rate', async () => {
    const eventsPerSecond = 10;
    const duration = 60; // seconds
    
    const startTime = Date.now();
    let processed = 0;
    
    while (Date.now() - startTime < duration * 1000) {
      await eventProcessor.processBatch(eventsPerSecond);
      processed += eventsPerSecond;
    }

    expect(processed).toBeGreaterThanOrEqual(eventsPerSecond * duration);
  });
});
```

---

## 9. Test Data & Fixtures

### 9.1 Test Event Fixtures

```typescript
// test/fixtures/events.ts
export const createMockTransferEvent = (overrides = {}) => ({
  eventId: uuid(),
  provider: 'alchemy',
  chain: 'ETHEREUM',
  type: 'transfer',
  txHash: '0xabc...',
  timestamp: new Date(),
  token: {
    contract: '0xdef...',
    symbol: 'ETH',
    decimals: 18
  },
  from: '0x111...',
  to: '0x222...',
  amount: 10,
  amountUsd: 25000,
  raw: {},
  ...overrides
});
```

---

### 9.2 Database Seeding

```typescript
// test/helpers/seed-db.ts
export async function seedTestDatabase() {
  await prisma.user.createMany({
    data: testUsers
  });
  
  await prisma.coin.createMany({
    data: testCoins
  });
}

export async function cleanupTestDatabase() {
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Coin", "Signal" CASCADE`;
}
```

---

## 10. Test Coverage Goals

* **Detection Engine**: 90%+ coverage
* **API Endpoints**: 80%+ coverage
* **Integration Tests**: All critical flows
* **E2E Tests**: All user journeys

---

## 11. Continuous Integration

### 11.1 GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:coverage
```

---

## 12. Manual Testing Checklist

Before each release, manually test:

- [ ] User registration and login
- [ ] Payment flow (initiate, upload, approve)
- [ ] Watchlist management
- [ ] Signal viewing (with different subscription tiers)
- [ ] Alert delivery (email, Telegram)
- [ ] Admin panel (payment approval, settings)
- [ ] Mobile responsiveness

---

## 13. Test Maintenance

* **Update tests** when features change
* **Review coverage reports** regularly
* **Fix flaky tests** immediately
* **Add tests** for every bug fix
* **Refactor tests** when they become hard to maintain

---

**End of testing_strategy.md**

