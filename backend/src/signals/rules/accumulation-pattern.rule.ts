import { Injectable } from '@nestjs/common';
import { IRule, RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Accumulation Pattern Rule
 * Combines multiple indicators to detect accumulation patterns:
 * - Supply percentage threshold (RULE C)
 * - Liquidity ratio (RULE D)
 * - Units-based large transfer (RULE B)
 */
@Injectable()
export class AccumulationPatternRule implements IRule {
  readonly name = 'AccumulationPatternRule';
  readonly maxScore = 40; // Combined score from multiple sub-rules

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { event, tokenMetadata, config } = context;

    const subResults: Array<{ name: string; triggered: boolean; score: number; evidence: any }> = [];

    // RULE C — Supply Percentage Threshold
    const supplyPctResult = this.evaluateSupplyPercentage(context);
    subResults.push({
      name: 'supply_percentage',
      triggered: supplyPctResult.triggered,
      score: supplyPctResult.score,
      evidence: supplyPctResult.evidence,
    });

    // RULE D — Liquidity Ratio
    const liquidityRatioResult = this.evaluateLiquidityRatio(context);
    subResults.push({
      name: 'liquidity_ratio',
      triggered: liquidityRatioResult.triggered,
      score: liquidityRatioResult.score,
      evidence: liquidityRatioResult.evidence,
    });

    // RULE B — Units-Based Large Transfer
    const unitsResult = this.evaluateUnitsThreshold(context);
    subResults.push({
      name: 'units_threshold',
      triggered: unitsResult.triggered,
      score: unitsResult.score,
      evidence: unitsResult.evidence,
    });

    const triggeredSubRules = subResults.filter((r) => r.triggered);
    const totalScore = Math.min(
      this.maxScore,
      triggeredSubRules.reduce((sum, r) => sum + r.score, 0),
    );

    const triggered = triggeredSubRules.length > 0;

    return {
      triggered,
      score: totalScore,
      reason: triggered
        ? `Accumulation pattern detected: ${triggeredSubRules.length} sub-rule(s) triggered`
        : 'No accumulation pattern indicators met',
      evidence: {
        subRules: subResults,
        triggeredCount: triggeredSubRules.length,
      },
      ruleName: this.name,
    };
  }

  /**
   * RULE C — Supply Percentage Threshold
   */
  private evaluateSupplyPercentage(context: RuleContext): RuleResult {
    const { event, tokenMetadata, config } = context;

    if (!tokenMetadata?.circulatingSupply || tokenMetadata.circulatingSupply <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing circulating supply data',
        evidence: {},
        ruleName: 'supply_percentage',
      };
    }

    const pctSupply = (event.amount / tokenMetadata.circulatingSupply) * 100;
    const triggered = pctSupply >= config.supplyPctThreshold;

    return {
      triggered,
      score: triggered ? 15 : 0,
      reason: triggered
        ? `Supply percentage threshold met: ${pctSupply.toFixed(4)}% (threshold: ${config.supplyPctThreshold}%)`
        : `Supply percentage below threshold: ${pctSupply.toFixed(4)}% (threshold: ${config.supplyPctThreshold}%)`,
      evidence: {
        supplyPercentage: pctSupply,
        threshold: config.supplyPctThreshold,
        amount: event.amount,
        circulatingSupply: tokenMetadata.circulatingSupply,
      },
      ruleName: 'supply_percentage',
    };
  }

  /**
   * RULE D — Liquidity Ratio
   */
  private evaluateLiquidityRatio(context: RuleContext): RuleResult {
    const { event, tokenMetadata, config } = context;

    if (!event.amountUsd || event.amountUsd <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing amountUSD',
        evidence: {},
        ruleName: 'liquidity_ratio',
      };
    }

    if (!tokenMetadata?.liquidityUsd || tokenMetadata.liquidityUsd <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing liquidity data',
        evidence: {},
        ruleName: 'liquidity_ratio',
      };
    }

    const liquidityRatio = (event.amountUsd / tokenMetadata.liquidityUsd) * 100;
    const triggered = liquidityRatio >= config.liquidityRatioThreshold;

    return {
      triggered,
      score: triggered ? 10 : 0,
      reason: triggered
        ? `Liquidity ratio threshold met: ${liquidityRatio.toFixed(2)}% (threshold: ${config.liquidityRatioThreshold}%)`
        : `Liquidity ratio below threshold: ${liquidityRatio.toFixed(2)}% (threshold: ${config.liquidityRatioThreshold}%)`,
      evidence: {
        liquidityRatio,
        threshold: config.liquidityRatioThreshold,
        amountUsd: event.amountUsd,
        liquidityUsd: tokenMetadata.liquidityUsd,
      },
      ruleName: 'liquidity_ratio',
    };
  }

  /**
   * RULE B — Units-Based Large Transfer
   */
  private evaluateUnitsThreshold(context: RuleContext): RuleResult {
    const { event, tokenMetadata, config } = context;

    const threshold = config.unitsThreshold;
    const triggered = event.amount >= threshold;

    return {
      triggered,
      score: triggered ? 15 : 0,
      reason: triggered
        ? `Units threshold met: ${event.amount.toLocaleString()} (threshold: ${threshold.toLocaleString()})`
        : `Units below threshold: ${event.amount.toLocaleString()} (threshold: ${threshold.toLocaleString()})`,
      evidence: {
        amount: event.amount,
        threshold,
        supplyRatio: tokenMetadata?.circulatingSupply
          ? (event.amount / tokenMetadata.circulatingSupply) * 100
          : null,
      },
      ruleName: 'units_threshold',
    };
  }
}

