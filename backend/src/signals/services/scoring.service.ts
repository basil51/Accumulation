import { Injectable, Logger } from '@nestjs/common';
import { RuleResult } from '../interfaces/rule.interface';
import { DetectionConfig } from '../interfaces/rule.interface';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  /**
   * Normalize raw score to 0-100 range
   */
  normalizeScore(rawScore: number, maxPossibleScore: number): number {
    const normalized = Math.min(100, Math.round((rawScore / maxPossibleScore) * 100));
    return normalized;
  }

  /**
   * Calculate final score from rule results
   */
  calculateFinalScore(
    ruleResults: RuleResult[],
    config: DetectionConfig,
  ): { score: number; triggeredRules: RuleResult[] } {
    const triggeredRules = ruleResults.filter((r) => r.triggered);
    const rawScore = triggeredRules.reduce((sum, result) => sum + result.score, 0);
    const normalizedScore = this.normalizeScore(rawScore, config.maxPossibleScore);

    this.logger.debug(
      `Score calculation: raw=${rawScore}, normalized=${normalizedScore}, rules=${triggeredRules.length}`,
    );

    return {
      score: normalizedScore,
      triggeredRules,
    };
  }

  /**
   * Check if score meets candidate threshold
   */
  isCandidate(score: number, config: DetectionConfig): boolean {
    return score >= config.candidateThreshold;
  }

  /**
   * Check if score meets alert threshold
   */
  isAlert(score: number, config: DetectionConfig): boolean {
    return score >= config.alertThreshold;
  }

  /**
   * Check if we have multi-evidence (at least 2 strong rules triggered)
   * This helps reduce false positives
   */
  hasMultiEvidence(triggeredRules: RuleResult[]): boolean {
    // Strong rules are those with score >= 15
    const strongRules = triggeredRules.filter((r) => r.score >= 15);
    return strongRules.length >= 2;
  }

  /**
   * Get default detection configuration
   * Max possible score calculation:
   * - HighVolumeRule (A): 20
   * - AccumulationPatternRule (B+C+D): 40 (15+15+10)
   * - WhaleClusterRule (E): 18
   * - DexSwapSpikeRule (G): 12
   * - PriceAnomalyRule (I): 10
   * - LpAddRule (H): 8
   * Total: 108
   * Note: Rule F (Exchange Outflow) not yet implemented
   */
  getDefaultConfig(): DetectionConfig {
    return {
      largeTransferUsd: 50000,
      supplyPctThreshold: 0.05,
      liquidityRatioThreshold: 1.0,
      swapSpikeFactor: 3.0,
      exchangeOutflowUsd: 100000,
      lpAddUsd: 10000,
      unitsThreshold: 100000,
      candidateThreshold: 60,
      alertThreshold: 75,
      maxPossibleScore: 108, // Updated: added RULE G (12 points)
    };
  }
}

