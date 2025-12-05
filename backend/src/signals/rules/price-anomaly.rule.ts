import { Injectable } from '@nestjs/common';
import { IRule, RuleContext, RuleResult } from '../interfaces/rule.interface';

/**
 * RULE I — Price-Volume Confirmation
 * Confirms accumulation with supportive price/volume action.
 * Detects price increases or stable price while volume increases.
 */
@Injectable()
export class PriceAnomalyRule implements IRule {
  readonly name = 'PriceAnomalyRule';
  readonly maxScore = 10;

  evaluate(context: RuleContext): RuleResult {
    const { event, tokenMetadata, baseline, config } = context;

    // Skip if we don't have price or volume data
    if (!tokenMetadata?.priceUsd || !baseline?.recentPrice || !baseline?.avgVolumeUsd) {
      return {
        triggered: false,
        score: 0,
        reason: 'Insufficient price/volume data for analysis',
        evidence: {},
        ruleName: this.name,
      };
    }

    const currentPrice = tokenMetadata.priceUsd;
    const baselinePrice = baseline.recentPrice;
    const currentVolume = event.amountUsd || 0;
    const avgVolume = baseline.avgVolumeUsd || 0;

    // Calculate price change percentage
    const priceChangePct = ((currentPrice - baselinePrice) / baselinePrice) * 100;

    // Calculate volume ratio
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0;

    // Conditions for positive signal:
    // 1. Price increase (> 2%) OR stable price (within ±1%) with volume spike (> 2x)
    // 2. Volume is above average
    const priceIncrease = priceChangePct > 2;
    const stablePrice = Math.abs(priceChangePct) <= 1;
    const volumeSpike = volumeRatio >= 2;

    const triggered = priceIncrease || (stablePrice && volumeSpike);

    if (!triggered) {
      return {
        triggered: false,
        score: 0,
        reason: `Price/volume pattern not supportive: price change ${priceChangePct.toFixed(2)}%, volume ratio ${volumeRatio.toFixed(2)}x`,
        evidence: {
          currentPrice,
          baselinePrice,
          priceChangePct,
          currentVolume,
          avgVolume,
          volumeRatio,
        },
        ruleName: this.name,
      };
    }

    // Score based on strength of signal
    let score = this.maxScore;
    if (priceIncrease && volumeSpike) {
      score = this.maxScore; // Strong signal
    } else if (priceIncrease) {
      score = Math.round(this.maxScore * 0.7); // Moderate signal
    } else if (stablePrice && volumeSpike) {
      score = Math.round(this.maxScore * 0.8); // Good signal
    }

    return {
      triggered: true,
      score,
      reason: `Price/volume confirmation: price ${priceChangePct > 0 ? '+' : ''}${priceChangePct.toFixed(2)}%, volume ${volumeRatio.toFixed(2)}x average`,
      evidence: {
        currentPrice,
        baselinePrice,
        priceChangePct,
        currentVolume,
        avgVolume,
        volumeRatio,
        pattern: priceIncrease ? 'price_increase' : 'stable_price_volume_spike',
      },
      ruleName: this.name,
    };
  }
}

