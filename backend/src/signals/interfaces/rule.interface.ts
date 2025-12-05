import { NormalizedEvent } from '@prisma/client';

/**
 * Represents the result of evaluating a detection rule
 */
export interface RuleResult {
  /** Whether the rule condition was met */
  triggered: boolean;
  /** Score contribution (0-120, will be normalized to 0-100) */
  score: number;
  /** Human-readable reason for the score */
  reason: string;
  /** Evidence data for auditing */
  evidence: Record<string, any>;
  /** Rule identifier */
  ruleName: string;
}

/**
 * Context data needed for rule evaluation
 */
export interface RuleContext {
  /** The normalized event being evaluated */
  event: NormalizedEvent;
  /** Token metadata (from Coin model) */
  tokenMetadata?: {
    id: string;
    totalSupply?: number;
    circulatingSupply?: number;
    priceUsd?: number;
    liquidityUsd?: number;
  };
  /** Baseline metrics for comparison */
  baseline?: {
    avgVolumeUsd?: number;
    avgSwapUsd?: number;
    recentPrice?: number;
  };
  /** Configuration thresholds */
  config: DetectionConfig;
}

/**
 * Detection engine configuration
 */
export interface DetectionConfig {
  /** Large transfer threshold in USD (default: 50000) */
  largeTransferUsd: number;
  /** Supply percentage threshold (default: 0.05) */
  supplyPctThreshold: number;
  /** Liquidity ratio threshold (default: 1.0) */
  liquidityRatioThreshold: number;
  /** Swap spike factor (default: 3.0) */
  swapSpikeFactor: number;
  /** Exchange outflow threshold in USD (default: 100000) */
  exchangeOutflowUsd: number;
  /** LP add threshold in USD (default: 10000) */
  lpAddUsd: number;
  /** Units threshold for low-price tokens (default: 100000) */
  unitsThreshold: number;
  /** Candidate threshold (default: 60) */
  candidateThreshold: number;
  /** Alert threshold (default: 75) */
  alertThreshold: number;
  /** Max possible score for normalization (default: 120) */
  maxPossibleScore: number;
}

/**
 * Interface that all detection rules must implement
 */
export interface IRule {
  /** Unique identifier for this rule */
  readonly name: string;
  /** Maximum score this rule can contribute */
  readonly maxScore: number;

  /**
   * Evaluate the rule against the given context
   * @param context Rule evaluation context
   * @returns Rule result with score and evidence
   */
  evaluate(context: RuleContext): Promise<RuleResult> | RuleResult;
}

