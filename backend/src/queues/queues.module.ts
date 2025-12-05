import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsProcessor } from './events.processor';
import { NormalizationModule } from '../normalization/normalization.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'events',
    }),
    NormalizationModule,
  ],
  providers: [EventsProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
