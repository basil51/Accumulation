import { Injectable } from '@nestjs/common';
import { IRule, RuleContext, RuleResult } from '../interfaces/rule.interface';

/**
 * RULE A — Large Transfer (USD)
 * Detects single large on-chain transfers likely to represent whale accumulation.
 */
@Injectable()
export class HighVolumeRule implements IRule {
  readonly name = 'HighVolumeRule';
  readonly maxScore = 20;

  evaluate(context: RuleContext): RuleResult {
    const { event, tokenMetadata, config } = context;

    // Skip if amountUSD is not available
    if (!event.amountUsd || event.amountUsd <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing or invalid amountUSD',
        evidence: {},
        ruleName: this.name,
      };
    }

    // Get threshold (use token-specific override if available)
    const threshold = tokenMetadata?.liquidityUsd
      ? Math.max(config.largeTransferUsd, tokenMetadata.liquidityUsd * 0.01) // At least 1% of liquidity
      : config.largeTransferUsd;

    const triggered = event.amountUsd >= threshold;

    if (!triggered) {
      return {
        triggered: false,
        score: 0,
        reason: `Transfer amount ($${event.amountUsd.toFixed(2)}) below threshold ($${threshold.toFixed(2)})`,
        evidence: {
          amountUsd: event.amountUsd,
          threshold,
        },
        ruleName: this.name,
      };
    }

    return {
      triggered: true,
      score: this.maxScore,
      reason: `Large transfer detected: $${event.amountUsd.toFixed(2)} (threshold: $${threshold.toFixed(2)})`,
      evidence: {
        amountUsd: event.amountUsd,
        threshold,
        txHash: event.txHash,
        from: event.fromAddress,
        to: event.toAddress,
        tokenPrice: tokenMetadata?.priceUsd,
      },
      ruleName: this.name,
    };
  }
}

