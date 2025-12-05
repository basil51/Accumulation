import { Injectable } from '@nestjs/common';
import { IRule, RuleContext, RuleResult } from '../interfaces/rule.interface';

/**
 * RULE H — LP Add (Liquidity Increase)
 * Detects liquidity additions that often accompany accumulation events.
 * When liquidity is added, it can indicate confidence in the token.
 */
@Injectable()
export class LpAddRule implements IRule {
  readonly name = 'LpAddRule';
  readonly maxScore = 8;

  evaluate(context: RuleContext): RuleResult {
    const { event, tokenMetadata, config } = context;

    // Only evaluate LP add events
    if (event.type !== 'lp_add') {
      return {
        triggered: false,
        score: 0,
        reason: 'Event is not an LP add event',
        evidence: {},
        ruleName: this.name,
      };
    }

    // Skip if amountUSD is not available
    if (!event.amountUsd || event.amountUsd <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing or invalid amountUSD for LP add',
        evidence: {},
        ruleName: this.name,
      };
    }

    const threshold = config.lpAddUsd;
    let triggered = event.amountUsd >= threshold;

    // Also check percentage increase if liquidity data is available
    let liquidityIncreasePct: number | undefined;
    if (tokenMetadata?.liquidityUsd && tokenMetadata.liquidityUsd > 0) {
      liquidityIncreasePct = (event.amountUsd / tokenMetadata.liquidityUsd) * 100;
      // Trigger if LP add represents significant percentage (e.g., > 5%)
      if (liquidityIncreasePct >= 5) {
        triggered = true;
      }
    }

    if (!triggered) {
      return {
        triggered: false,
        score: 0,
        reason: `LP add amount ($${event.amountUsd.toFixed(2)}) below threshold ($${threshold.toFixed(2)})${liquidityIncreasePct ? ` and ${liquidityIncreasePct.toFixed(2)}% of liquidity` : ''}`,
        evidence: {
          amountUsd: event.amountUsd,
          threshold,
          liquidityIncreasePct,
        },
        ruleName: this.name,
      };
    }

    // Score based on significance
    let score = this.maxScore;
    if (liquidityIncreasePct && liquidityIncreasePct >= 10) {
      score = this.maxScore; // Very significant (>10% of liquidity)
    } else if (liquidityIncreasePct && liquidityIncreasePct >= 5) {
      score = Math.round(this.maxScore * 0.75); // Significant (5-10%)
    } else if (event.amountUsd >= threshold * 2) {
      score = Math.round(this.maxScore * 0.9); // Large absolute amount
    }

    return {
      triggered: true,
      score,
      reason: `LP add detected: $${event.amountUsd.toFixed(2)}${liquidityIncreasePct ? ` (${liquidityIncreasePct.toFixed(2)}% of liquidity)` : ''}`,
      evidence: {
        amountUsd: event.amountUsd,
        threshold,
        liquidityIncreasePct,
        currentLiquidityUsd: tokenMetadata?.liquidityUsd,
        txHash: event.txHash,
        from: event.fromAddress,
        to: event.toAddress,
      },
      ruleName: this.name,
    };
  }
}

