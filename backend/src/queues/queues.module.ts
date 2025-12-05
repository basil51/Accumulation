import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsProcessor } from './events.processor';
import { NormalizationModule } from '../normalization/normalization.module';
import { SignalsModule } from '../signals/signals.module';
import { DetectionProcessor } from '../signals/detection.processor';
import { AlertsModule } from '../alerts/alerts.module';
import { AlertsProcessor } from '../alerts/alerts.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'events',
    }),
    BullModule.registerQueue({
      name: 'detection',
    }),
    BullModule.registerQueue({
      name: 'alerts',
    }),
    NormalizationModule,
    SignalsModule,
    AlertsModule,
  ],
  providers: [EventsProcessor, DetectionProcessor, AlertsProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
