Alchemy Webhook Backend Setup Guide
Overview
This improved backend system is specifically designed to work with Alchemy webhooks and provides better signal detection through:

Proper USD value calculation - Fetches real-time prices from DexScreener and CoinGecko
Intelligent rule engine - 7 sophisticated detection rules with combo multipliers
Confidence scoring - Multi-factor confidence assessment
Optimized filtering - Reduces noise while catching real signals

Key Improvements
1. Webhook Handler

Validates Alchemy webhook signatures
Extracts all required data from Alchemy payload
Calculates USD values in real-time
Handles all transfer types (external, internal, token, NFT)

2. Better USD Calculation
typescript// The old system dropped events without USD values
// The new system fetches prices dynamically:

1. Check database for cached price
2. If not found, query DexScreener API
3. If still not found, query CoinGecko API
4. Cache the price for future events
5. Calculate amountUsd = amount * price
3. Improved Rules
RuleMax ScoreDescriptionHigh Volume20Detects large transfers vs baseline or absolute thresholdsSupply Concentration15Detects transfers representing significant % of supplyLiquidity Impact15Detects transfers that could move the marketVelocity10Detects rapid accumulation patternsWhale Cluster18Detects coordinated whale activityDEX Swap Spike12Detects unusual buying pressurePrice Momentum10Detects significant price movements
Total Max Score: 100 points
4. Combo Multipliers
Rules that trigger together get bonus scoring:

High Volume + Supply Concentration = 1.2x multiplier
High Volume + Liquidity Impact = 1.3x multiplier
Whale Cluster + Velocity = 1.25x multiplier
Price Momentum + High Volume = 1.15x multiplier

Installation
1. Install Dependencies
bashnpm install @nestjs/common @nestjs/config ioredis bullmq
2. Environment Variables
env# Alchemy
ALCHEMY_SIGNING_KEY=your_webhook_signing_key_here

# Redis for queue processing
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: API keys for price fetching
COINGECKO_API_KEY=your_key_here
DEXSCREENER_API_KEY=your_key_here
3. Update Module Registration
Add to your signals.module.ts:
typescriptimport { AlchemyWebhookService } from './services/alchemy-webhook.service';
import { AlchemyWebhookController } from './controllers/alchemy-webhook.controller';
import { ImprovedScoringService } from './services/improved-scoring.service';

// Import all improved rules
import { ImprovedHighVolumeRule } from './rules/improved-high-volume.rule';
import { SupplyConcentrationRule } from './rules/supply-concentration.rule';
import { LiquidityImpactRule } from './rules/liquidity-impact.rule';
import { VelocityRule } from './rules/velocity.rule';
import { ImprovedWhaleClusterRule } from './rules/improved-whale-cluster.rule';
import { ImprovedDexSwapSpikeRule } from './rules/improved-dex-swap-spike.rule';
import { PriceMomentumRule } from './rules/price-momentum.rule';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    CompressionModule,
    AuthModule,
    SubscriptionModule,
    AlertsModule,
    AdminModule,
  ],
  controllers: [
    SignalsController,
    AlchemyWebhookController, // Add this
  ],
  providers: [
    RuleEngineService,
    ImprovedScoringService, // Replace old ScoringService
    SignalService,
    AlchemyWebhookService, // Add this
    
    // Improved rules
    ImprovedHighVolumeRule,
    SupplyConcentrationRule,
    LiquidityImpactRule,
    VelocityRule,
    ImprovedWhaleClusterRule,
    ImprovedDexSwapSpikeRule,
    PriceMomentumRule,
    
    DetectionProcessor,
  ],
  exports: [RuleEngineService, ImprovedScoringService, SignalService],
})
export class SignalsModule {}
4. Update Rule Engine
Replace the old rules array in rule-engine.service.ts:
typescriptconstructor(
  private prisma: PrismaService,
  private scoringService: ImprovedScoringService, // Updated
  private signalService: SignalService,
  private alertsService: AlertsService,
  private tokenSettingsService: TokenSettingsService,
  
  // Inject improved rules
  private improvedHighVolumeRule: ImprovedHighVolumeRule,
  private supplyConcentrationRule: SupplyConcentrationRule,
  private liquidityImpactRule: LiquidityImpactRule,
  private velocityRule: VelocityRule,
  private improvedWhaleClusterRule: ImprovedWhaleClusterRule,
  private improvedDexSwapSpikeRule: ImprovedDexSwapSpikeRule,
  private priceMomentumRule: PriceMomentumRule,
) {
  this.rules = [
    this.improvedHighVolumeRule,
    this.supplyConcentrationRule,
    this.liquidityImpactRule,
    this.velocityRule,
    this.improvedWhaleClusterRule,
    this.improvedDexSwapSpikeRule,
    this.priceMomentumRule,
  ];
}
Setting Up Alchemy Webhooks
1. Create Webhook in Alchemy Dashboard

Go to https://dashboard.alchemy.com/
Navigate to "Notify" tab
Click "Create Webhook"
Select "Address Activity"
Choose your network (Ethereum, Polygon, etc.)
Enter your webhook URL: https://your-domain.com/webhooks/alchemy
Add addresses to track (or leave empty to track all activity)
Save and copy the Signing Key

2. Configure Your Backend
Add the signing key to your .env:
envALCHEMY_SIGNING_KEY=whsec_xxxxxxxxxxxxx
3. Test Your Webhook
Use Alchemy's test button or send a test payload:
bashcurl -X POST https://your-domain.com/webhooks/alchemy/test \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": "wh_test",
    "id": "whevt_test",
    "createdAt": "2024-01-01T00:00:00Z",
    "type": "ADDRESS_ACTIVITY",
    "event": {
      "network": "ETH_MAINNET",
      "activity": [{
        "blockNum": "0x1234567",
        "hash": "0xabc123...",
        "fromAddress": "0x123...",
        "toAddress": "0x456...",
        "value": 100000,
        "asset": "USDC",
        "category": "token",
        "rawContract": {
          "rawValue": "0x...",
          "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          "decimals": 6
        }
      }]
    }
  }'
How It Works
Data Flow
Alchemy Webhook
    ↓
AlchemyWebhookController (verify signature)
    ↓
AlchemyWebhookService (process activities)
    ↓
Calculate USD values (fetch prices)
    ↓
Create NormalizedEvent in database
    ↓
Queue for detection processing
    ↓
RuleEngineService (evaluate all rules)
    ↓
ImprovedScoringService (calculate final score)
    ↓
Create MarketSignal & AccumulationSignal
    ↓
Send alerts to users
Signal Quality Assessment
typescript// Excellent Signal (Score 60+, Very High Confidence)
- Multiple rules triggered
- Strong combo multipliers
- Clear accumulation pattern
→ CREATE ALERT + NOTIFY USERS

// Good Signal (Score 45+, High Confidence)
- Several rules triggered
- Good evidence
- Likely accumulation
→ CREATE ALERT

// Fair Signal (Score 30+, Medium Confidence)
- Some rules triggered
- Worth tracking
→ CREATE CANDIDATE SIGNAL

// Poor Signal (Score < 30, Low Confidence)
- Weak evidence
- Likely noise
→ IGNORE
Monitoring & Debugging
Enable Debug Logging
typescript// In your main.ts or bootstrap
if (process.env.NODE_ENV === 'development') {
  app.useLogger(['log', 'error', 'warn', 'debug']);
}
Check What's Being Processed
sql-- Recent events
SELECT 
  eventId,
  tokenSymbol,
  amount,
  amountUsd,
  timestamp
FROM "NormalizedEvent"
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 20;

-- Recent signals
SELECT 
  id,
  score,
  createdAt,
  coin.symbol
FROM "AccumulationSignal" signal
JOIN "Coin" coin ON signal."coinId" = coin.id
WHERE signal."createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY score DESC
LIMIT 20;
Common Issues
Issue: No events being created

Check webhook signature verification
Verify Alchemy webhook is active
Check logs for errors

Issue: Events created but no signals

Check if USD values are being calculated
Verify rules are triggering (enable debug logs)
Lower thresholds for testing

Issue: Too many noise signals

Increase candidateThreshold and alertThreshold
Add more restrictive filters
Require higher confidence levels

Advanced Configuration
Adjust Thresholds by Market Cap
typescript// In your config or rule service
const getConfigForMarketCap = (marketCap: number) => {
  if (marketCap > 1_000_000_000) {
    // Large cap - stricter thresholds
    return {
      largeTransferUsd: 100000,
      candidateThreshold: 25,
      alertThreshold: 45,
    };
  } else if (marketCap > 100_000_000) {
    // Mid cap - moderate thresholds
    return {
      largeTransferUsd: 50000,
      candidateThreshold: 20,
      alertThreshold: 40,
    };
  } else {
    // Small cap - sensitive thresholds
    return {
      largeTransferUsd: 10000,
      candidateThreshold: 15,
      alertThreshold: 35,
    };
  }
};
Track Specific Whale Addresses
typescript// Add to your database
const KNOWN_WHALES = [
  '0x123...', // Whale 1
  '0x456...', // Whale 2
];

// In your rule, boost score if known whale
if (KNOWN_WHALES.includes(event.from) || KNOWN_WHALES.includes(event.to)) {
  score *= 1.5;
  evidence.isKnownWhale = true;
}
Testing
Unit Tests
typescriptdescribe('ImprovedHighVolumeRule', () => {
  it('should trigger on large transfer', async () => {
    const context = {
      event: { amountUsd: 100000, amount: 1000 },
      baseline: { avgVolumeUsd: 10000 },
      config: { largeTransferUsd: 50000 },
    };
    
    const result = await rule.evaluate(context);
    
    expect(result.triggered).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });
});
Integration Test
typescriptdescribe('Webhook to Signal Flow', () => {
  it('should create signal from webhook', async () => {
    const webhookPayload = createTestPayload();
    
    await webhookService.processWebhook(webhookPayload);
    
    // Wait for async processing
    await sleep(1000);
    
    const signals = await signalService.findAccumulationSignals({
      symbol: 'TEST',
      minScore: 1,
    });
    
    expect(signals.data.length).toBeGreaterThan(0);
  });
});
Performance Tips

Cache Prices: Store token prices in Redis with 5-minute TTL
Batch Processing: Process multiple activities in parallel
Database Indexes: Add indexes on frequently queried fields
Rate Limiting: Implement rate limits on external API calls
Queue Processing: Use BullMQ for async event processing

Support
For issues or questions:

Check logs in your application
Verify webhook payload matches Alchemy format
Test with /webhooks/alchemy/test endpoint
Review signal creation logic in rule-engine.service.ts
