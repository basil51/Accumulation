import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AlertsModule } from '../alerts/alerts.module';
import { RuleEngineService } from './services/rule-engine.service';
import { ScoringService } from './services/scoring.service';
import { SignalService } from './services/signal.service';
import { HighVolumeRule } from './rules/high-volume.rule';
import { PriceAnomalyRule } from './rules/price-anomaly.rule';
import { AccumulationPatternRule } from './rules/accumulation-pattern.rule';
import { WhaleClusterRule } from './rules/whale-cluster.rule';
import { LpAddRule } from './rules/lp-add.rule';
import { DexSwapSpikeRule } from './rules/dex-swap-spike.rule';
import { DetectionProcessor } from './detection.processor';
import { SignalsController } from './signals.controller';

@Module({
  imports: [PrismaModule, AuthModule, SubscriptionModule, AlertsModule],
  controllers: [SignalsController],
  providers: [
    RuleEngineService,
    ScoringService,
    SignalService,
    HighVolumeRule,
    PriceAnomalyRule,
    AccumulationPatternRule,
    WhaleClusterRule,
    LpAddRule,
    DexSwapSpikeRule,
    DetectionProcessor,
  ],
  exports: [RuleEngineService, ScoringService, SignalService],
})
export class SignalsModule {}

