import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IRule, RuleContext, RuleResult, DetectionConfig, TokenSettings } from '../interfaces/rule.interface';
import { ScoringService } from './scoring.service';
import { SignalService } from './signal.service';
import { AlertsService } from '../../alerts/alerts.service';
import { TokenSettingsService } from '../../admin/token-settings.service';
import { HighVolumeRule } from '../rules/high-volume.rule';
import { PriceAnomalyRule } from '../rules/price-anomaly.rule';
import { AccumulationPatternRule } from '../rules/accumulation-pattern.rule';
import { WhaleClusterRule } from '../rules/whale-cluster.rule';
import { LpAddRule } from '../rules/lp-add.rule';
import { DexSwapSpikeRule } from '../rules/dex-swap-spike.rule';
import { MarketSignalType } from '@prisma/client';
import { SignalDebugInspector } from './signal-debug-inspector.service';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);
  private readonly rules: IRule[];

  constructor(
    private prisma: PrismaService,
    private scoringService: ScoringService,
    private signalService: SignalService,
    private alertsService: AlertsService,
    private tokenSettingsService: TokenSettingsService,
    private highVolumeRule: HighVolumeRule,
    private priceAnomalyRule: PriceAnomalyRule,
    private accumulationPatternRule: AccumulationPatternRule,
    private whaleClusterRule: WhaleClusterRule,
    private lpAddRule: LpAddRule,
    private dexSwapSpikeRule: DexSwapSpikeRule,
    private debugInspector: SignalDebugInspector,
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
      const inspector = this.debugInspector.createSession(eventId);
      // Fetch the normalized event
      const event = await this.prisma.normalizedEvent.findUnique({
        where: { eventId },
      });

      if (!event) {
        this.logger.warn(`Event not found: ${eventId}`);
        inspector.setSkipReason('Event not found');
        return { eventId, score: 0, triggeredRules: [], debug: inspector.buildSummary() };
      }

      // Get or create coin FIRST (needed for price backfill)
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

      // CRITICAL FIX: Backfill amountUsd BEFORE skip check
      // This allows events with missing price during ingestion to be processed if price is now available
      if ((!event.amountUsd || event.amountUsd === 0) && tokenMetadata?.priceUsd) {
        const backfilledAmount = event.amount * tokenMetadata.priceUsd;
        
        // Log the calculation details for debugging
        this.logger.debug(
          `RuleEngine Debug ====> [Backfill] Event ${eventId}: amount=${event.amount} (${event.amount.toExponential()}) * price=$${tokenMetadata.priceUsd} = $${backfilledAmount.toExponential()}`,
        );
        
        if (Number.isFinite(backfilledAmount) && backfilledAmount > 0) {
          event.amountUsd = backfilledAmount;
          
          // Persist backfilled amountUsd to database for future queries
          try {
            await this.prisma.normalizedEvent.update({
              where: { eventId },
              data: { amountUsd: backfilledAmount },
            });
            inspector.addNote(
              `✅ Backfilled and persisted amountUsd: ${event.amount.toExponential()} * $${tokenMetadata.priceUsd} = $${backfilledAmount.toExponential()}`,
            );
          } catch (updateError) {
            // Log but don't fail - in-memory value is still correct
            this.logger.warn(
              `Failed to persist backfilled amountUsd for event ${eventId}: ${updateError.message}`,
            );
            inspector.addNote(
              `✅ Backfilled amountUsd (not persisted): ${event.amount.toExponential()} * $${tokenMetadata.priceUsd} = $${backfilledAmount.toExponential()}`,
            );
          }
        } else {
          inspector.addNote(
            `⚠️ Backfill calculation failed: amount=${event.amount.toExponential()} * price=$${tokenMetadata.priceUsd} = ${backfilledAmount}`,
          );
        }
      }

      // Skip stablecoins
      const symbol = (event.tokenSymbol || '').toUpperCase();
      if (symbol === 'USDC' || symbol === 'USDT') {
        inspector.setSkipReason('Stablecoin event ignored');
        return { eventId, score: 0, triggeredRules: [], debug: inspector.buildSummary() };
      }

      // Validate token units
      const hasValidUnits = Number.isFinite(event.amount) && (event.amount as number) > 0;
      if (!hasValidUnits) {
        inspector.setSkipReason('Invalid token units on event');
        return { eventId, score: 0, triggeredRules: [], debug: inspector.buildSummary() };
      }

      // Skip zero/invalid USD events AFTER backfill attempt
      // TEMPORARY: Lowered to $0.10 for testing - change back to $1 after verifying signals work
      const minUsd = 0.10; // drop dust/zero events (was 1, lowered for testing)
      const hasValidUsd =
        Number.isFinite(event.amountUsd) && (event.amountUsd as number) >= minUsd;

      if (!hasValidUsd) {
        let reason: string;
        if (tokenMetadata?.priceUsd && event.amountUsd !== null && event.amountUsd !== undefined) {
          // This is a dust transaction - amount is too small
          const amountUsdFormatted = event.amountUsd < 0.01 
            ? `$${event.amountUsd.toExponential()}` 
            : `$${event.amountUsd.toFixed(4)}`;
          reason = `Dust transaction: amountUsd (${amountUsdFormatted}) below minimum threshold ($${minUsd})`;
          inspector.addNote(
            `Dust detected: amount=${event.amount.toExponential()} tokens, price=$${tokenMetadata.priceUsd}, calculated=${amountUsdFormatted}`,
          );
        } else {
          reason = `Missing/invalid amountUsd after normalization (price unavailable: ${tokenMetadata?.priceUsd ?? 'null'})`;
          inspector.addNote(
            `Price status: ${tokenMetadata?.priceUsd ? `available ($${tokenMetadata.priceUsd})` : 'missing'}`,
          );
        }
        inspector.setSkipReason(reason);
        return { eventId, score: 0, triggeredRules: [], debug: inspector.buildSummary() };
      }

      // Fetch baseline metrics (simplified - in production, calculate from historical data)
      const baseline = await this.getBaselineMetrics(coin.id);

      // Get system default configuration
      const defaultConfig = this.scoringService.getDefaultConfig();

      // Fetch token-specific settings (if any)
      const tokenSettingsRecord = await this.tokenSettingsService.getTokenSettings(coin.id);
      const tokenSettings: TokenSettings | undefined = tokenSettingsRecord
        ? {
            minLargeTransferUsd: tokenSettingsRecord.minLargeTransferUsd || undefined,
            minUnits: tokenSettingsRecord.minUnits || undefined,
            supplyPctSpecial: tokenSettingsRecord.supplyPctSpecial || undefined,
            liquidityRatioSpecial: tokenSettingsRecord.liquidityRatioSpecial || undefined,
          }
        : undefined;

      // Merge token-specific settings with system defaults
      const config: DetectionConfig = {
        ...defaultConfig,
        // Override with token-specific thresholds if available
        largeTransferUsd: tokenSettings?.minLargeTransferUsd ?? defaultConfig.largeTransferUsd,
        unitsThreshold: tokenSettings?.minUnits ?? defaultConfig.unitsThreshold,
        supplyPctThreshold: tokenSettings?.supplyPctSpecial ?? defaultConfig.supplyPctThreshold,
        liquidityRatioThreshold: tokenSettings?.liquidityRatioSpecial ?? defaultConfig.liquidityRatioThreshold,
      };

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
        tokenSettings,
      };

      // Log data availability for debugging
      const dataStatus = {
        amountUsd: Number.isFinite(event.amountUsd) ? `$${event.amountUsd?.toFixed(2)}` : 'MISSING',
        priceUsd: tokenMetadata?.priceUsd ? `$${tokenMetadata.priceUsd}` : 'MISSING',
        liquidityUsd: tokenMetadata?.liquidityUsd ? `$${tokenMetadata.liquidityUsd.toFixed(2)}` : 'MISSING',
        baselineVolume: baseline?.avgVolumeUsd ? `$${baseline.avgVolumeUsd.toFixed(2)}` : 'MISSING',
      };
      inspector.addNote(`Data availability: ${JSON.stringify(dataStatus)}`);

      const inspectorWithContext = this.debugInspector.createSession(eventId, context);

      // Evaluate all rules
      const ruleResults = await this.evaluateRules(context, inspectorWithContext);

      // Calculate final score
      const { score, triggeredRules } = this.scoringService.calculateFinalScore(
        ruleResults,
        config,
      );

      inspectorWithContext.finalize(score, triggeredRules);

      // Log ALL events that pass amountUsd threshold for debugging
      this.logger.log(
        `Event ${eventId} evaluated: amountUsd=$${event.amountUsd?.toFixed(2)}, score=${score}, triggeredRules=${triggeredRules.length}, coin=${tokenMetadata?.symbol || 'unknown'}`,
      );

      // Create signals if thresholds are met
      if (this.scoringService.isAlert(score, config)) {
        // Check for multi-evidence to reduce false positives
        if (this.scoringService.hasMultiEvidence(triggeredRules)) {
          await this.createAlertSignals(coin.id, event, score, triggeredRules, context);
        } else {
          this.logger.debug(
            `RuleEngine Debug ====> Score ${score} meets alert threshold but lacks multi-evidence, creating candidate only`,
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
        debug: inspectorWithContext.buildSummary(),
      };
    } catch (error) {
      this.logger.error(`Error processing event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate all registered rules
   */
  private async evaluateRules(
    context: RuleContext,
    inspector: ReturnType<SignalDebugInspector['createSession']>,
  ): Promise<RuleResult[]> {
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      try {
        const guardrailResult = this.applyRuleGuardrails(rule, context);
        if (guardrailResult) {
          results.push(guardrailResult);
          inspector.recordRule(guardrailResult);
          continue;
        }

        const result = await rule.evaluate(context);
        const normalizedResult =
          result.triggered && (!result.score || result.score <= 0)
            ? {
                ...result,
                triggered: false,
                score: 0,
                reason: `${result.reason} (ignored because score was zero)`,
              }
            : result;
        results.push(normalizedResult);
        inspector.recordRule(normalizedResult);
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
   * Guardrails to avoid evaluating USD-dependent rules when data is missing.
   */
  private applyRuleGuardrails(rule: IRule, context: RuleContext): RuleResult | null {
    const { event, tokenMetadata, baseline } = context;
    const amountUsdValid = Number.isFinite(event.amountUsd) && (event.amountUsd as number) > 0;
    const hasPrice = Number.isFinite(tokenMetadata?.priceUsd);
    const hasLiquidity = Number.isFinite(tokenMetadata?.liquidityUsd);
    const hasBaselineVolume = Number.isFinite(baseline?.avgVolumeUsd);
    const hasBaselineSwap = Number.isFinite(baseline?.avgSwapUsd);

    const usdRules = ['HighVolumeRule', 'WhaleClusterRule', 'DexSwapSpikeRule', 'LpAddRule'];
    const liquidityRules = ['LpAddRule'];
    const priceRules = ['PriceAnomalyRule'];
    const baselineVolumeRules = ['PriceAnomalyRule'];
    const baselineSwapRules = ['DexSwapSpikeRule'];

    if (usdRules.includes(rule.name) && !amountUsdValid) {
      const reason = `Guardrail: USD amount unavailable (${event.amountUsd ?? 'null'}) - skipping USD-based rule`;
      this.logger.debug(`RuleEngine Debug ====> [Guardrail] ${rule.name}: ${reason}`);
      return {
        triggered: false,
        score: 0,
        reason,
        evidence: { 
          amountUsd: event.amountUsd,
          hasPrice: hasPrice,
          priceUsd: tokenMetadata?.priceUsd,
        },
        ruleName: rule.name,
      };
    }

    if (liquidityRules.includes(rule.name) && !hasLiquidity) {
      const reason = `Guardrail: Liquidity missing (${tokenMetadata?.liquidityUsd ?? 'null'}) - skipping liquidity-dependent rule`;
      this.logger.debug(`RuleEngine Debug ====> [Guardrail] ${rule.name}: ${reason}`);
      return {
        triggered: false,
        score: 0,
        reason,
        evidence: { liquidityUsd: tokenMetadata?.liquidityUsd },
        ruleName: rule.name,
      };
    }

    if (priceRules.includes(rule.name) && !hasPrice) {
      const reason = `Guardrail: Price missing (${tokenMetadata?.priceUsd ?? 'null'}) - skipping price-dependent rule`;
      this.logger.debug(`RuleEngine Debug ====> [Guardrail] ${rule.name}: ${reason}`);
      return {
        triggered: false,
        score: 0,
        reason,
        evidence: { priceUsd: tokenMetadata?.priceUsd },
        ruleName: rule.name,
      };
    }

    if (baselineVolumeRules.includes(rule.name) && !hasBaselineVolume) {
      const reason = `Guardrail: Baseline volume missing (${baseline?.avgVolumeUsd ?? 'null'}) - skipping volume comparison`;
      this.logger.debug(`RuleEngine Debug ====> [Guardrail] ${rule.name}: ${reason}`);
      return {
        triggered: false,
        score: 0,
        reason,
        evidence: { baselineVolumeUsd: baseline?.avgVolumeUsd },
        ruleName: rule.name,
      };
    }

    if (baselineSwapRules.includes(rule.name) && !hasBaselineSwap) {
      const reason = `Guardrail: Baseline swap volume missing (${baseline?.avgSwapUsd ?? 'null'}) - skipping swap spike rule`;
      this.logger.debug(`RuleEngine Debug ====> [Guardrail] ${rule.name}: ${reason}`);
      return {
        triggered: false,
        score: 0,
        reason,
        evidence: { baselineSwapUsd: baseline?.avgSwapUsd },
        ruleName: rule.name,
      };
    }

    return null;
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
