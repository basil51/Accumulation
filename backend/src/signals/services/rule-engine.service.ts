import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IRule, RuleContext, RuleResult, DetectionConfig } from '../interfaces/rule.interface';
import { ScoringService } from './scoring.service';
import { SignalService } from './signal.service';
import { AlertsService } from '../../alerts/alerts.service';
import { HighVolumeRule } from '../rules/high-volume.rule';
import { PriceAnomalyRule } from '../rules/price-anomaly.rule';
import { AccumulationPatternRule } from '../rules/accumulation-pattern.rule';
import { WhaleClusterRule } from '../rules/whale-cluster.rule';
import { LpAddRule } from '../rules/lp-add.rule';
import { DexSwapSpikeRule } from '../rules/dex-swap-spike.rule';
import { MarketSignalType } from '@prisma/client';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);
  private readonly rules: IRule[];

  constructor(
    private prisma: PrismaService,
    private scoringService: ScoringService,
    private signalService: SignalService,
    private alertsService: AlertsService,
    private highVolumeRule: HighVolumeRule,
    private priceAnomalyRule: PriceAnomalyRule,
    private accumulationPatternRule: AccumulationPatternRule,
    private whaleClusterRule: WhaleClusterRule,
    private lpAddRule: LpAddRule,
    private dexSwapSpikeRule: DexSwapSpikeRule,
  ) {
    // Register all rules
    this.rules = [
      this.highVolumeRule,
      this.priceAnomalyRule,
      this.accumulationPatternRule,
      this.whaleClusterRule,
      this.lpAddRule,
      this.dexSwapSpikeRule,
    ];
  }

  /**
   * Process a normalized event through the detection engine
   */
  async processEvent(eventId: string) {
    try {
      // Fetch the normalized event
      const event = await this.prisma.normalizedEvent.findUnique({
        where: { eventId },
      });

      if (!event) {
        this.logger.warn(`Event not found: ${eventId}`);
        return null;
      }

      // Get or create coin
      const coin = await this.signalService.findOrCreateCoin(
        event.tokenContract,
        event.chain,
        event.tokenSymbol,
        event.tokenSymbol, // Use symbol as name if name not available
      );

      // Fetch token metadata
      const tokenMetadata = await this.prisma.coin.findUnique({
        where: { id: coin.id },
      });

      // Fetch baseline metrics (simplified - in production, calculate from historical data)
      const baseline = await this.getBaselineMetrics(coin.id);

      // Get configuration (in production, fetch from SystemSettings)
      const config = this.scoringService.getDefaultConfig();

      // Build rule context
      const context: RuleContext = {
        event,
        tokenMetadata: tokenMetadata
          ? {
              id: tokenMetadata.id,
              totalSupply: tokenMetadata.totalSupply || undefined,
              circulatingSupply: tokenMetadata.circulatingSupply || undefined,
              priceUsd: tokenMetadata.priceUsd || undefined,
              liquidityUsd: tokenMetadata.liquidityUsd || undefined,
            }
          : undefined,
        baseline,
        config,
      };

      // Evaluate all rules
      const ruleResults = await this.evaluateRules(context);

      // Calculate final score
      const { score, triggeredRules } = this.scoringService.calculateFinalScore(
        ruleResults,
        config,
      );

      this.logger.log(
        `Event ${eventId} evaluated: score=${score}, triggeredRules=${triggeredRules.length}`,
      );

      // Create signals if thresholds are met
      if (this.scoringService.isAlert(score, config)) {
        // Check for multi-evidence to reduce false positives
        if (this.scoringService.hasMultiEvidence(triggeredRules)) {
          await this.createAlertSignals(coin.id, event, score, triggeredRules, context);
        } else {
          this.logger.debug(
            `Score ${score} meets alert threshold but lacks multi-evidence, creating candidate only`,
          );
          await this.createCandidateSignal(coin.id, event, score, triggeredRules, context);
        }
      } else if (this.scoringService.isCandidate(score, config)) {
        await this.createCandidateSignal(coin.id, event, score, triggeredRules, context);
      }

      return {
        eventId,
        score,
        triggeredRules: triggeredRules.map((r) => r.ruleName),
      };
    } catch (error) {
      this.logger.error(`Error processing event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate all registered rules
   */
  private async evaluateRules(context: RuleContext): Promise<RuleResult[]> {
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      try {
        const result = await rule.evaluate(context);
        results.push(result);
        this.logger.debug(
          `Rule ${rule.name}: triggered=${result.triggered}, score=${result.score}`,
        );
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.name}:`, error);
        // Continue with other rules even if one fails
        results.push({
          triggered: false,
          score: 0,
          reason: `Error: ${error.message}`,
          evidence: {},
          ruleName: rule.name,
        });
      }
    }

    return results;
  }

  /**
   * Create alert-level signals (both MarketSignal and AccumulationSignal)
   */
  private async createAlertSignals(
    coinId: string,
    event: any,
    score: number,
    triggeredRules: RuleResult[],
    context: RuleContext,
  ): Promise<{ marketSignalId?: string; accumulationSignalId?: string }> {
    // Determine signal type based on triggered rules
    let signalType: MarketSignalType = MarketSignalType.VOLUME_SPIKE;
    if (triggeredRules.some((r) => r.ruleName === 'PriceAnomalyRule')) {
      signalType = MarketSignalType.PRICE_ANOMALY;
    } else if (triggeredRules.some((r) => r.ruleName === 'AccumulationPatternRule')) {
      signalType = MarketSignalType.TRENDING;
    }

    // Create MarketSignal
    const marketSignal = await this.signalService.createMarketSignal({
      coinId,
      signalType,
      score,
      evidence: triggeredRules,
      eventIds: [event.eventId],
    });

    // Create AccumulationSignal
    const supplyPercentage = context.tokenMetadata?.circulatingSupply
      ? (event.amount / context.tokenMetadata.circulatingSupply) * 100
      : undefined;

    const liquidityRatio = context.tokenMetadata?.liquidityUsd && event.amountUsd
      ? (event.amountUsd / context.tokenMetadata.liquidityUsd) * 100
      : undefined;

    const accumulationSignal = await this.signalService.createAccumulationSignal({
      coinId,
      amountUnits: event.amount,
      amountUsd: event.amountUsd || 0,
      supplyPercentage,
      liquidityRatio,
      score,
      evidence: triggeredRules,
      eventIds: [event.eventId],
    });

    this.logger.log(`Created alert signals for coin ${coinId} with score ${score}`);

    return {
      marketSignalId: marketSignal.id,
      accumulationSignalId: accumulationSignal.id,
    };
  }

  /**
   * Create alerts for users watching this coin
   */
  private async createAlertsForUsers(
    coinId: string,
    signals: { marketSignalId?: string; accumulationSignalId?: string },
    score: number,
    triggeredRules: RuleResult[],
  ) {
    // Get all users watching this coin
    const watchlistEntries = await this.prisma.userWatchlist.findMany({
      where: {
        coinId,
        notificationsEnabled: true,
      },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
        coin: true,
      },
    });

    const coin = watchlistEntries[0]?.coin;
    if (!coin) {
      return; // No users watching this coin
    }

    // Create alert message
    const topRule = triggeredRules
      .sort((a, b) => b.score - a.score)[0];
    const title = `🚨 ${coin.symbol} Accumulation Alert`;
    const message = `${coin.name} (${coin.symbol}) detected with score ${score}. ${topRule?.reason || 'Multiple indicators triggered'}`;

    // Create alerts for each user (respecting cooldowns)
    for (const entry of watchlistEntries) {
      const shouldSend = await this.alertsService.shouldSendAlert(
        entry.userId,
        coinId,
        score,
      );

      if (!shouldSend) {
        continue;
      }

      // Determine which signal to reference
      const signalType = signals.accumulationSignalId ? 'accumulation' : 'market';
      const signalId = signals.accumulationSignalId || signals.marketSignalId || '';

      await this.alertsService.createAlert({
        userId: entry.userId,
        signalType: signalType as 'market' | 'accumulation',
        signalId,
        title,
        message,
        coinId,
        score,
      });

      this.logger.log(`Created alert for user ${entry.userId} for coin ${coinId}`);
    }
  }

  /**
   * Create candidate-level signal (AccumulationSignal only)
   */
  private async createCandidateSignal(
    coinId: string,
    event: any,
    score: number,
    triggeredRules: RuleResult[],
    context: RuleContext,
  ) {
    const supplyPercentage = context.tokenMetadata?.circulatingSupply
      ? (event.amount / context.tokenMetadata.circulatingSupply) * 100
      : undefined;

    const liquidityRatio = context.tokenMetadata?.liquidityUsd && event.amountUsd
      ? (event.amountUsd / context.tokenMetadata.liquidityUsd) * 100
      : undefined;

    await this.signalService.createAccumulationSignal({
      coinId,
      amountUnits: event.amount,
      amountUsd: event.amountUsd || 0,
      supplyPercentage,
      liquidityRatio,
      score,
      evidence: triggeredRules,
      eventIds: [event.eventId],
    });

    this.logger.log(`Created candidate signal for coin ${coinId} with score ${score}`);
  }

  /**
   * Get baseline metrics for a coin
   * Calculates from historical NormalizedEvent data (last 7 days)
   */
  private async getBaselineMetrics(coinId: string) {
    const coin = await this.prisma.coin.findUnique({
      where: { id: coinId },
    });

    if (!coin) {
      return {
        avgVolumeUsd: undefined,
        avgSwapUsd: undefined,
        recentPrice: undefined,
      };
    }

    // Calculate baseline from last 7 days of events
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all events for this coin in the last 7 days
    const recentEvents = await this.prisma.normalizedEvent.findMany({
      where: {
        tokenContract: coin.contractAddress,
        chain: coin.chain,
        timestamp: {
          gte: sevenDaysAgo,
        },
        amountUsd: {
          not: null,
        },
      },
      select: {
        type: true,
        amountUsd: true,
        timestamp: true,
      },
    });

    // Calculate average volume (all transfer events)
    const transferEvents = recentEvents.filter((e) => e.type === 'transfer');
    const avgVolumeUsd =
      transferEvents.length > 0
        ? transferEvents.reduce((sum, e) => sum + (e.amountUsd || 0), 0) /
          transferEvents.length
        : undefined;

    // Calculate average swap volume
    const swapEvents = recentEvents.filter((e) => e.type === 'swap');
    const avgSwapUsd =
      swapEvents.length > 0
        ? swapEvents.reduce((sum, e) => sum + (e.amountUsd || 0), 0) /
          swapEvents.length
        : undefined;

    // Get most recent price from coin metadata
    // In production, this could also be calculated from price_update events
    const recentPrice = coin.priceUsd;

    // Fallback to liquidity-based estimates if no historical data
    const fallbackVolume = coin.liquidityUsd ? coin.liquidityUsd * 0.1 : undefined;
    const fallbackSwap = coin.liquidityUsd ? coin.liquidityUsd * 0.05 : undefined;

    return {
      avgVolumeUsd: avgVolumeUsd ?? fallbackVolume,
      avgSwapUsd: avgSwapUsd ?? fallbackSwap,
      recentPrice,
    };
  }
}

