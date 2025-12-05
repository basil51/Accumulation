import { Injectable } from '@nestjs/common';
import { IRule, RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * RULE G — DEX Swap Spike
 * Detects abnormal swap volume on DEX for token.
 * Compares swap volume in a time window to baseline average.
 */
@Injectable()
export class DexSwapSpikeRule implements IRule {
  readonly name = 'DexSwapSpikeRule';
  readonly maxScore = 12;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { event, tokenMetadata, baseline, config } = context;

    // Only evaluate swap events
    if (event.type !== 'swap') {
      return {
        triggered: false,
        score: 0,
        reason: 'Event is not a swap event',
        evidence: {},
        ruleName: this.name,
      };
    }

    // Skip if amountUSD is not available
    if (!event.amountUsd || event.amountUsd <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing or invalid amountUSD for swap',
        evidence: {},
        ruleName: this.name,
      };
    }

    // Need baseline swap volume for comparison
    if (!baseline?.avgSwapUsd || baseline.avgSwapUsd <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing baseline swap volume data',
        evidence: {},
        ruleName: this.name,
      };
    }

    // Calculate swap volume in the time window (1 hour)
    const oneHourAgo = new Date(event.timestamp);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const swapEventsInWindow = await this.prisma.normalizedEvent.findMany({
      where: {
        tokenContract: event.tokenContract,
        chain: event.chain,
        type: 'swap',
        timestamp: {
          gte: oneHourAgo,
          lte: event.timestamp,
        },
        amountUsd: {
          not: null,
        },
      },
      select: {
        amountUsd: true,
        txHash: true,
        timestamp: true,
      },
    });

    // Sum all swap volume in the window
    const swapVolumeUsd = swapEventsInWindow.reduce(
      (sum, e) => sum + (e.amountUsd || 0),
      0,
    );

    // Calculate spike factor
    const spikeFactor = swapVolumeUsd / baseline.avgSwapUsd;
    const requiredFactor = config.swapSpikeFactor;
    const triggered = spikeFactor >= requiredFactor;

    if (!triggered) {
      return {
        triggered: false,
        score: 0,
        reason: `Swap volume (${spikeFactor.toFixed(2)}x baseline) below spike threshold (${requiredFactor}x)`,
        evidence: {
          swapVolumeUsd,
          baselineSwapUsd: baseline.avgSwapUsd,
          spikeFactor,
          requiredFactor,
          swapCount: swapEventsInWindow.length,
          timeWindow: '1 hour',
        },
        ruleName: this.name,
      };
    }

    // Score based on spike magnitude
    // Base score for meeting threshold, increases for larger spikes
    let score = this.maxScore;
    if (spikeFactor >= requiredFactor * 2) {
      score = this.maxScore; // Very large spike (2x threshold)
    } else if (spikeFactor >= requiredFactor * 1.5) {
      score = Math.round(this.maxScore * 0.9); // Large spike (1.5x threshold)
    } else {
      score = Math.round(this.maxScore * 0.8); // Meets threshold
    }

    return {
      triggered: true,
      score,
      reason: `DEX swap spike detected: ${spikeFactor.toFixed(2)}x baseline (${swapVolumeUsd.toFixed(2)} USD in 1h vs ${baseline.avgSwapUsd.toFixed(2)} USD avg)`,
      evidence: {
        swapVolumeUsd,
        baselineSwapUsd: baseline.avgSwapUsd,
        spikeFactor,
        requiredFactor,
        swapCount: swapEventsInWindow.length,
        timeWindow: '1 hour',
        recentSwaps: swapEventsInWindow.slice(0, 5).map((s) => ({
          amountUsd: s.amountUsd,
          txHash: s.txHash,
          timestamp: s.timestamp,
        })),
      },
      ruleName: this.name,
    };
  }
}

