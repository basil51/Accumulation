import { Injectable, Logger } from '@nestjs/common';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';

export interface SignalDebugSummary {
  eventId: string;
  skipReason?: string;
  ruleEvaluations: Array<{
    rule: string;
    triggered: boolean;
    score: number;
    reason: string;
    evidence?: Record<string, any>;
  }>;
  finalScore?: number;
  triggeredRules?: string[];
  notes: string[];
  dataAvailability?: {
    hasPrice?: boolean;
    hasLiquidity?: boolean;
    hasBaselineVolume?: boolean;
    hasBaselineSwap?: boolean;
  };
}

class SignalDebugSession {
  private readonly evaluations: SignalDebugSummary['ruleEvaluations'] = [];
  private skipReason?: string;
  private finalScore?: number;
  private triggeredRules?: string[];
  private readonly notes: string[] = [];

  constructor(
    private readonly eventId: string,
    private readonly logger: Logger,
    private readonly dataAvailability?: SignalDebugSummary['dataAvailability'],
  ) {}

  addNote(note: string) {
    this.notes.push(note);
  }

  setSkipReason(reason: string) {
    this.skipReason = reason;
    this.logger.debug(`[SignalDebug] Event ${this.eventId} skipped: ${reason}`);
    // Also add as note for summary
    this.notes.push(`⏭️ SKIPPED: ${reason}`);
  }

  recordRule(result: RuleResult) {
    const normalizedScore = Math.max(0, result.score || 0);
    const triggered = result.triggered && normalizedScore > 0;
    this.evaluations.push({
      rule: result.ruleName,
      triggered,
      score: normalizedScore,
      reason: result.reason,
      evidence: result.evidence,
    });
    
    // Enhanced logging with more context
    const status = triggered ? '✅ TRIGGERED' : '❌ NOT TRIGGERED';
    this.logger.debug(
      `[SignalDebug] Event ${this.eventId} | Rule ${result.ruleName} -> ${status} score=${normalizedScore} | reason="${result.reason}"`,
    );
    
    // Log evidence if available
    if (result.evidence && Object.keys(result.evidence).length > 0) {
      this.logger.debug(
        `[SignalDebug] Event ${this.eventId} | Rule ${result.ruleName} evidence: ${JSON.stringify(result.evidence)}`,
      );
    }
  }

  finalize(score: number, triggeredRules: RuleResult[]) {
    this.finalScore = score;
    this.triggeredRules = triggeredRules.map((r) => r.ruleName);
    
    const ruleCount = triggeredRules.length;
    const status = score > 0 ? '✅ SIGNAL CREATED' : '❌ NO SIGNAL';
    
    this.logger.debug(
      `[SignalDebug] Event ${this.eventId} | ${status} | Final score=${score} | Triggered rules=${ruleCount} [${this.triggeredRules.join(',')}]`,
    );
    
    if (score === 0 && ruleCount === 0) {
      this.notes.push(`ℹ️ No rules triggered - score remains 0`);
    } else if (score > 0) {
      this.notes.push(`✅ Signal created with score ${score} from ${ruleCount} rule(s)`);
    }
  }

  buildSummary(): SignalDebugSummary {
    return {
      eventId: this.eventId,
      skipReason: this.skipReason,
      ruleEvaluations: this.evaluations,
      finalScore: this.finalScore,
      triggeredRules: this.triggeredRules,
      notes: this.notes,
      dataAvailability: this.dataAvailability,
    };
  }
}

@Injectable()
export class SignalDebugInspector {
  private readonly logger = new Logger(SignalDebugInspector.name);

  createSession(eventId: string, context?: RuleContext): SignalDebugSession {
    const dataAvailability = context
      ? {
          hasPrice: Number.isFinite(context.tokenMetadata?.priceUsd),
          hasLiquidity: Number.isFinite(context.tokenMetadata?.liquidityUsd),
          hasBaselineVolume: Number.isFinite(context.baseline?.avgVolumeUsd),
          hasBaselineSwap: Number.isFinite(context.baseline?.avgSwapUsd),
        }
      : undefined;

    return new SignalDebugSession(eventId, this.logger, dataAvailability);
  }
}
