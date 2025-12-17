import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlchemyService } from '../alchemy/alchemy.service';
import { AlchemyMapper } from '../../normalization/mappers/alchemy.mapper';
import { NormalizationService } from '../../normalization/normalization.service';
import { SystemSettingsService } from '../../admin/system-settings.service';
import { Chain } from '@prisma/client';
import { CoinGeckoService } from '../coingecko/coingecko.service';

interface CoinBlockTracking {
  coinId: string;
  chain: Chain;
  contractAddress: string;
  lastProcessedBlock: number;
}

@Injectable()
export class IngestionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(IngestionSchedulerService.name);
  private readonly isEnabled: boolean;
  private isRunning = false;
  private readonly PRICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private priceCache = new Map<string, { price: number; expiresAt: number }>();

  // Rate limiting for free tier Alchemy API
  // Free tier: ~330M compute units/month, ~10-15 calls/second
  private readonly DELAY_BETWEEN_COINS_MS = 2000; // 2 seconds between coins
  private readonly MAX_COINS_PER_CYCLE = 5; // Process max 5 coins per cycle to stay within limits
  private readonly INITIAL_BLOCK_RANGE = 20; // Reduced from 100 to 20 blocks for first run
  private readonly MAX_EVENTS_PER_COIN = 50; // Limit events processed per coin per cycle
  // Accumulation scanning (top-down) config (see step2.doc)
  private readonly DISCOVERY_BLOCK_RANGE = 50_000;
  private readonly DETECTION_BLOCK_RANGE = 200_000;
  private readonly DISCOVERY_MAX_TRANSFERS = 1000;
  private readonly DETECTION_MAX_TRANSFERS_PER_SIDE = 1000; // incoming + outgoing per wallet
  private readonly DISCOVERY_TOP_WALLETS = 5;
  private readonly ACCUMULATION_MIN_NET_USD = 50_000;
  private readonly ACCUMULATION_MIN_TX_COUNT = 3;
  private readonly ACCUMULATION_MIN_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

  // Supported chains for Alchemy
  private readonly supportedChains: Chain[] = [
    Chain.ETHEREUM,
    Chain.POLYGON,
    Chain.ARBITRUM,
    Chain.BASE,
  ];

  constructor(
    private prisma: PrismaService,
    private alchemyService: AlchemyService,
    private alchemyMapper: AlchemyMapper,
    private normalizationService: NormalizationService,
    private systemSettings: SystemSettingsService,
    private coinGeckoService: CoinGeckoService,
    @InjectQueue('detection') private detectionQueue: Queue,
  ) {
    // Enable/disable via environment variable (default: enabled)
    this.isEnabled =
      process.env.ENABLE_EVENT_INGESTION !== 'false' &&
      !!process.env.ALCHEMY_API_KEY;
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn(
        'Event ingestion is disabled. Set ENABLE_EVENT_INGESTION=true and ALCHEMY_API_KEY to enable.',
      );
      return;
    }

    // Verify Alchemy connection
    const isHealthy = await this.alchemyService.healthCheck(Chain.ETHEREUM);
    if (!isHealthy) {
      this.logger.error(
        'Alchemy health check failed. Ingestion scheduler will not run.',
      );
      return;
    }

    this.logger.log('Event ingestion scheduler initialized');
  }

  /**
   * Poll Alchemy for new events every 5 minutes
   * Cron: Every 5 minutes
   * This batches events from the last 5 minutes, reducing API calls and terminal noise
   */
  @Cron('*/5 * * * *', {
    name: 'poll-alchemy',
    disabled: false,
  })
  async pollAlchemy() {
    if (!this.isEnabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.debug('Alchemy Debug ====> Starting Alchemy ingestion cycle');

      // Process each supported chain
      for (const chain of this.supportedChains) {
        if (!this.alchemyService.isChainSupported(chain)) {
          continue;
        }

        try {
          await this.processChain(chain);
        } catch (error: any) {
          this.logger.error(
            `Error processing chain ${chain}:`,
            error.message,
          );
          // Continue with other chains even if one fails
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Alchemy Debug ====> ingestion cycle completed in ${duration}ms`);
    } catch (error: any) {
      this.logger.error('Error in Alchemy ingestion cycle:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a specific chain
   */
  private async processChain(chain: Chain) {
    // Get all active/famous coins OR coins in user watchlists for this chain that have contract addresses
    const coins = await this.prisma.coin.findMany({
      where: {
        chain,
        contractAddress: { not: null },
        OR: [
          { isActive: true },
          { isFamous: true },
          { watchlist: { some: {} } }, // Include coins that are in any user's watchlist
        ],
      },
      select: {
        id: true,
        symbol: true,
        contractAddress: true,
        chain: true,
      },
    });

    if (coins.length === 0) {
      this.logger.debug(`Alchemy Debug ====> No active/famous/watchlist coins found for chain ${chain}`);
      return;
    }

    // Limit coins processed per cycle to stay within API rate limits
    const coinsToProcess = coins.slice(0, this.MAX_COINS_PER_CYCLE);
    
    this.logger.log(
      `Processing ${coinsToProcess.length} of ${coins.length} coins for chain ${chain} (limited to ${this.MAX_COINS_PER_CYCLE} per cycle)`,
    );
 
    // Get latest block for this chain
    let latestBlock: number;
    try {
      latestBlock = await this.alchemyService.getLatestBlock(chain);
    } catch (error: any) {
      this.logger.error(
        `Failed to get latest block for ${chain}:`,
        error.message,
      );
      return; 
    }

    // Process each coin with delay to respect rate limits
    for (let i = 0; i < coinsToProcess.length; i++) {
      const coin = coinsToProcess[i];
      if (!coin.contractAddress) {
        continue;
      }

      try {
        await this.processCoin(coin.id, coin.contractAddress, chain, latestBlock);
        
        // Add delay between coins to respect Alchemy rate limits (except for last coin)
        if (i < coinsToProcess.length - 1) {
          await this.delay(this.DELAY_BETWEEN_COINS_MS);
        }
      } catch (error: any) {
        this.logger.error(
          `Error processing coin ${coin.symbol} (${coin.id}):`,
          error.message,
        );
        // Continue with other coins
      }
    }
  }

  /**
   * Process a specific coin
   */
  private async processCoin(
    coinId: string,
    contractAddress: string,
    chain: Chain,
    latestBlock: number,
  ) {
    // Fetch coin metadata (price may be backfilled below)
    const coinMeta = await this.prisma.coin.findUnique({
      where: { id: coinId },
      select: { priceUsd: true },
    });
    const priceUsd = await this.resolveCoinPriceUsd(
      coinId,
      chain,
      contractAddress,
      coinMeta?.priceUsd ?? null,
    );

    // Stage 1/2 accumulation scan (top-down). This is what actually produces
    // accumulation signals per step2.doc (wallet discovery -> per-wallet net inflow).
    try {
      await this.scanAccumulationTopDown({
        coinId,
        contractAddress,
        chain,
        latestBlock,
        priceUsd,
      });
    } catch (error: any) {
      this.logger.warn(
        `Accumulation scan failed for coin ${coinId} (${contractAddress}) on ${chain}: ${error.message}`,
      );
    }

    // Get last processed block for this coin
    const lastProcessedBlock = await this.getLastProcessedBlock(coinId, chain);

    // Calculate block range (process last N blocks or from last processed)
    const fromBlock = lastProcessedBlock
      ? lastProcessedBlock + 1
      : Math.max(0, latestBlock - this.INITIAL_BLOCK_RANGE); // Start from N blocks ago if first run

    if (fromBlock > latestBlock) {
      // Already up to date
      return;
    }

    // Fetch transfers from Alchemy
    let transfers;
    try {
      transfers = await this.alchemyService.fetchTokenTransfers(
        chain,
        contractAddress,
        fromBlock,
        latestBlock,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch transfers for coin ${coinId}:`,
        error.message,
      );
      return;
    }

    if (transfers.length === 0) {
      // Update last processed block even if no transfers
      await this.setLastProcessedBlock(coinId, chain, latestBlock);
      return;
    }

    // Limit transfers processed per coin to avoid overwhelming the system
    const transfersToProcess = transfers.slice(0, this.MAX_EVENTS_PER_COIN);
    
    if (transfers.length > this.MAX_EVENTS_PER_COIN) {
      this.logger.log(
        `Found ${transfers.length} transfers for coin ${coinId}, processing first ${this.MAX_EVENTS_PER_COIN} (limited per cycle)`,
      );
    } else {
      this.logger.log(
        `Found ${transfers.length} transfers for coin ${coinId} (${contractAddress})`,
      );
    }

    // Process each transfer
    let processedCount = 0;
    let highestBlock = lastProcessedBlock || fromBlock;

    for (const transfer of transfersToProcess) {
      try {
        // Convert Alchemy transfer to mapper format
        const mapperData = this.alchemyService.convertTransferToMapperFormat(
          transfer,
          chain,
        );

        // Normalize the event
        const normalizedEvent = await this.alchemyMapper.normalize(mapperData);

        // Set token contract from coin
        normalizedEvent.tokenContract = contractAddress;

        // Enrich amountUsd using stored price, if available
        if (
          priceUsd !== null &&
          typeof normalizedEvent.amount === 'number' &&
          normalizedEvent.amount > 0
        ) {
          const calculatedAmountUsd = normalizedEvent.amount * priceUsd;
          
          // Log calculation details for very small amounts (potential dust)
          if (calculatedAmountUsd < 0.01) {
            this.logger.debug(
              `Alchemy Debug ====> [Dust] Enriching amountUsd: amount=${normalizedEvent.amount.toExponential()} * price=$${priceUsd} = $${calculatedAmountUsd.toExponential()} (will be skipped as dust)`,
            );
          }
          
          if (Number.isFinite(calculatedAmountUsd) && calculatedAmountUsd > 0) {
            normalizedEvent.amountUsd = calculatedAmountUsd;
            if (calculatedAmountUsd >= 1) {
              // Only log non-dust transactions to reduce noise
              this.logger.debug(
                `Alchemy Debug ====> Enriched amountUsd: ${normalizedEvent.amount} * $${priceUsd} = $${calculatedAmountUsd.toFixed(2)}`,
              );
            }
          } else {
            this.logger.warn(
              `Invalid amountUsd calculation for ${contractAddress}: ${normalizedEvent.amount.toExponential()} * ${priceUsd} = ${calculatedAmountUsd}`,
            );
          }
        } else {
          this.logger.debug(
            `Alchemy Debug ====> ⚠️ Missing price for coin ${coinId} (${contractAddress}) on ${chain}; amountUsd will be null (will attempt backfill in rule engine)`,
          );
        }

        // Save normalized event
        const savedEvent = await this.normalizationService.saveNormalizedEvent(
          normalizedEvent,
        );

        if (savedEvent) {
          // Queue for detection
          await this.detectionQueue.add('process-event', {
            eventId: savedEvent.eventId,
          });

          processedCount++;
        }

        // Track highest block processed (even if duplicate)
        const blockNum = parseInt(transfer.blockNum, 16);
        if (blockNum > highestBlock) {
          highestBlock = blockNum;
        }
      } catch (error: any) {
        this.logger.error(
          `Error processing transfer ${transfer.hash}:`,
          error.message,
        );
        // Continue with other transfers
      }
    }

    // Update last processed block
    if (highestBlock > (lastProcessedBlock || 0)) {
      await this.setLastProcessedBlock(coinId, chain, highestBlock);
    }

    if (processedCount > 0) {
      this.logger.log(
        `Processed ${processedCount} new events for coin ${coinId}`,
      );
    }
  }

  private async scanAccumulationTopDown(input: {
    coinId: string;
    contractAddress: string;
    chain: Chain;
    latestBlock: number;
    priceUsd: number | null;
  }) {
    const { coinId, contractAddress, chain, latestBlock, priceUsd } = input;

    // If we have no price, we can't do USD-based thresholds reliably.
    if (!Number.isFinite(priceUsd) || (priceUsd as number) <= 0) {
      this.logger.debug(
        `Alchemy Debug ====> [AccumulationScan] Skipping ${coinId} on ${chain} (missing priceUsd)`,
      );
      return;
    }

    const discoveryFromBlock = Math.max(0, latestBlock - this.DISCOVERY_BLOCK_RANGE);
    const detectionFromBlock = Math.max(0, latestBlock - this.DETECTION_BLOCK_RANGE);

    // Stage 1 — Wallet discovery (MANDATORY per step2.doc)
    const discoveryTransfers = await this.alchemyService.fetchTransfers({
      chain,
      contractAddress,
      fromBlock: discoveryFromBlock,
      toBlock: latestBlock,
      maxCount: this.DISCOVERY_MAX_TRANSFERS,
    });

    if (discoveryTransfers.length === 0) {
      return;
    }

    type WalletAgg = { to: string; receivedRaw: bigint; txCount: number };
    const walletAgg = new Map<string, WalletAgg>();

    for (const t of discoveryTransfers) {
      const to = (t.to || '').toLowerCase();
      if (!to) continue;

      const raw = this.parseRawContractValueToBigInt(t.rawContract?.value);
      if (raw <= 0n) continue;

      const cur = walletAgg.get(to);
      if (cur) {
        cur.receivedRaw += raw;
        cur.txCount += 1;
      } else {
        walletAgg.set(to, { to, receivedRaw: raw, txCount: 1 });
      }
    }

    const topWallets = [...walletAgg.values()]
      .sort((a, b) => (a.receivedRaw === b.receivedRaw ? 0 : a.receivedRaw > b.receivedRaw ? -1 : 1))
      .slice(0, this.DISCOVERY_TOP_WALLETS);

    if (topWallets.length === 0) {
      return;
    }

    // Stage 2 — Accumulation detection (PER WALLET)
    for (const w of topWallets) {
      const wallet = w.to;

      // IMPORTANT: pageKey must never be reused across different scans/windows.
      // We do NOT pass pageKey in; each scan starts fresh with undefined.
      const [incoming, outgoing] = await Promise.all([
        this.alchemyService.fetchTransfers({
          chain,
          contractAddress,
          fromBlock: detectionFromBlock,
          toBlock: latestBlock,
          toAddress: wallet,
          maxCount: this.DETECTION_MAX_TRANSFERS_PER_SIDE,
        }),
        this.alchemyService.fetchTransfers({
          chain,
          contractAddress,
          fromBlock: detectionFromBlock,
          toBlock: latestBlock,
          fromAddress: wallet,
          maxCount: this.DETECTION_MAX_TRANSFERS_PER_SIDE,
        }),
      ]);

      const receivedRaw = incoming.reduce(
        (sum, t) => sum + this.parseRawContractValueToBigInt(t.rawContract?.value),
        0n,
      );
      const sentRaw = outgoing.reduce(
        (sum, t) => sum + this.parseRawContractValueToBigInt(t.rawContract?.value),
        0n,
      );

      const netRaw = receivedRaw - sentRaw;
      if (netRaw <= 0n) {
        continue;
      }

      const txCount = incoming.length + outgoing.length;

      const durationMs = this.computeDurationMsFromTransfers([...incoming, ...outgoing]);

      const decimals =
        incoming[0]?.rawContract?.decimals ??
        outgoing[0]?.rawContract?.decimals ??
        18;
      const netUnits = this.bigIntToApproxUnits(netRaw, decimals);
      const netUsd = netUnits * (priceUsd as number);

      if (
        Number.isFinite(netUsd) &&
        netUsd >= this.ACCUMULATION_MIN_NET_USD &&
        txCount >= this.ACCUMULATION_MIN_TX_COUNT &&
        durationMs >= this.ACCUMULATION_MIN_DURATION_MS
      ) {
        // Avoid spamming: if we already created a strong signal very recently for this coin,
        // skip creating another one.
        const recent = await this.prisma.accumulationSignal.findFirst({
          where: {
            coinId,
            createdAt: {
              gte: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours
            },
            amountUsd: {
              gte: this.ACCUMULATION_MIN_NET_USD,
            },
          },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        });

        if (recent) {
          continue;
        }

        const coin = await this.prisma.coin.findUnique({
          where: { id: coinId },
          select: { circulatingSupply: true, liquidityUsd: true },
        });

        const supplyPercentage =
          coin?.circulatingSupply && coin.circulatingSupply > 0
            ? (netUnits / coin.circulatingSupply) * 100
            : undefined;

        const liquidityRatio =
          coin?.liquidityUsd && coin.liquidityUsd > 0
            ? (netUsd / coin.liquidityUsd) * 100
            : undefined;

        await this.prisma.accumulationSignal.create({
          data: {
            coinId,
            amountUnits: netUnits,
            amountUsd: netUsd,
            supplyPercentage,
            liquidityRatio,
            score: 90, // strong signal; scoring engine is event-based today
          },
        });

        this.logger.log(
          `[AccumulationScan] ✅ Accumulation detected for coin=${coinId} wallet=${wallet} netUsd=$${netUsd.toFixed(
            2,
          )} txCount=${txCount} durationHrs=${(durationMs / 3600000).toFixed(1)}`,
        );
      }
    }
  }

  private parseRawContractValueToBigInt(value?: string): bigint {
    if (!value) return 0n;
    try {
      const v = value.trim();
      if (!v) return 0n;
      // Alchemy may return hex ("0x...") or decimal strings; BigInt supports both.
      return BigInt(v);
    } catch {
      return 0n;
    }
  }

  private bigIntToApproxUnits(raw: bigint, decimals: number): number {
    if (raw === 0n) return 0;
    const d = Number.isFinite(decimals) && decimals >= 0 ? Math.floor(decimals) : 18;
    const s = raw.toString();

    if (d === 0) return Number(s);

    const negative = s.startsWith('-');
    const digits = negative ? s.slice(1) : s;
    const padded = digits.padStart(d + 1, '0');
    const intPart = padded.slice(0, padded.length - d);
    const fracPart = padded.slice(padded.length - d);

    // Limit fractional digits for safe parseFloat while preserving scale
    const fracTrimmed = fracPart.slice(0, 12).replace(/0+$/, '');
    const composed =
      fracTrimmed.length > 0 ? `${negative ? '-' : ''}${intPart}.${fracTrimmed}` : `${negative ? '-' : ''}${intPart}`;
    const n = Number(composed);
    return Number.isFinite(n) ? n : 0;
  }

  private computeDurationMsFromTransfers(transfers: Array<{ blockNum: string; metadata?: { blockTimestamp?: string } }>): number {
    const timestamps = transfers
      .map((t) => t.metadata?.blockTimestamp)
      .filter((ts): ts is string => typeof ts === 'string' && ts.length > 0)
      .map((ts) => Date.parse(ts))
      .filter((ms) => Number.isFinite(ms));

    if (timestamps.length >= 2) {
      const min = Math.min(...timestamps);
      const max = Math.max(...timestamps);
      return Math.max(0, max - min);
    }

    // Fallback: approximate from blocks if timestamps missing
    const blocks = transfers
      .map((t) => parseInt(t.blockNum, 16))
      .filter((n) => Number.isFinite(n));
    if (blocks.length >= 2) {
      const minB = Math.min(...blocks);
      const maxB = Math.max(...blocks);
      // Rough ETH-like approximation: 12s per block
      return Math.max(0, (maxB - minB) * 12_000);
    }

    return 0;
  }

  /**
   * Get last processed block for a coin
   */
  private async getLastProcessedBlock(
    coinId: string,
    chain: Chain,
  ): Promise<number | null> {
    const key = `ingestion:last_block:${coinId}:${chain}`;
    try {
      const setting = await this.systemSettings.getSetting(key);
      if (!setting.value) {
        return null;
      }
      // Handle different value types
      const valueStr =
        typeof setting.value === 'string'
          ? setting.value
          : String(setting.value);
      return parseInt(valueStr, 10) || null;
    } catch {
      // Setting doesn't exist yet
      return null;
    }
  }

  /**
   * Set last processed block for a coin
   */
  private async setLastProcessedBlock(
    coinId: string,
    chain: Chain,
    blockNumber: number,
  ): Promise<void> {
    const key = `ingestion:last_block:${coinId}:${chain}`;
    await this.systemSettings.setSetting(key, blockNumber.toString());
  }

  /**
   * Resolve coin price for enrichment (cache + CoinGecko simple price fallback)
   * Enhanced with detailed logging for debugging price resolution issues
   */
  private async resolveCoinPriceUsd(
    coinId: string,
    chain: Chain,
    contractAddress: string,
    storedPrice: number | null,
  ): Promise<number | null> {
    const cacheKey = this.getPriceCacheKey(chain, contractAddress);
    const isNative =
      !contractAddress ||
      contractAddress === '0x0000000000000000000000000000000000000000';

    // Use stored price first (and cache it for this cycle)
    if (Number.isFinite(storedPrice) && (storedPrice as number) > 0) {
      this.setPriceCache(cacheKey, storedPrice as number);
      this.logger.debug(
        `Alchemy Debug ====> Using stored price for ${contractAddress} on ${chain}: $${storedPrice}`,
      );
      return storedPrice as number;
    }

    // Check in-memory cache
    const cached = this.getCachedPrice(cacheKey);
    if (cached !== null) {
      this.logger.debug(
        `Alchemy Debug ====> Using cached price for ${contractAddress} on ${chain}: $${cached}`,
      );
      return cached;
    }

    // Log price resolution attempt
    this.logger.debug(
      `Alchemy Debug ====> Resolving price for coin ${coinId} (${contractAddress}) on ${chain} - stored: ${storedPrice}, native: ${isNative}`,
    );

    try {
      // Fallback to live CoinGecko lookup
      const freshPrice = isNative
        ? await this.coinGeckoService.fetchNativePriceUsd(chain)
        : await this.coinGeckoService.fetchTokenPriceUsd(chain, contractAddress);

      if (freshPrice !== null && Number.isFinite(freshPrice) && freshPrice > 0) {
        this.setPriceCache(cacheKey, freshPrice);

        // Persist so downstream processors (rule engine) can reuse it
        await this.prisma.coin.update({
          where: { id: coinId },
          data: { priceUsd: freshPrice },
        });

        this.logger.log(
          `✅ Fetched and cached price for ${contractAddress} on ${chain}: $${freshPrice}`,
        );
        return freshPrice;
      } else {
        this.logger.warn(
          `CoinGecko returned invalid price for ${contractAddress} on ${chain}: ${freshPrice}`,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch price for ${contractAddress} on ${chain}: ${
          error.message || error
        }`,
      );
    }

    this.logger.warn(
      `❌ No price available for coin ${coinId} (${contractAddress}) on ${chain} - events will be skipped unless price is backfilled later`,
    );
    return null;
  }

  private getPriceCacheKey(chain: Chain, contractAddress: string): string {
    const addr = contractAddress ? contractAddress.toLowerCase() : 'native';
    return `${chain}:${addr}`;
  }

  private getCachedPrice(key: string): number | null {
    const entry = this.priceCache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.priceCache.delete(key);
      return null;
    }

    return entry.price;
  }

  private setPriceCache(key: string, price: number) {
    this.priceCache.set(key, {
      price,
      expiresAt: Date.now() + this.PRICE_CACHE_TTL_MS,
    });
  }

  /**
   * Manually trigger ingestion for a specific coin
   * Useful for testing or manual triggers
   */
  async triggerIngestionForCoin(coinId: string) {
    const coin = await this.prisma.coin.findUnique({
      where: { id: coinId },
      select: {
        id: true,
        symbol: true,
        contractAddress: true,
        chain: true,
      },
    });

    if (!coin || !coin.contractAddress) {
      throw new Error(`Coin ${coinId} not found or has no contract address`);
    }

    if (!this.alchemyService.isChainSupported(coin.chain)) {
      throw new Error(`Chain ${coin.chain} is not supported by Alchemy`);
    }

    const latestBlock = await this.alchemyService.getLatestBlock(coin.chain);
    await this.processCoin(
      coin.id,
      coin.contractAddress,
      coin.chain,
      latestBlock,
    );
  }

  /**
   * Helper: delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

