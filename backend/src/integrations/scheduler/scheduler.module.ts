import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestionSchedulerService } from './ingestion-scheduler.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AlchemyModule } from '../alchemy/alchemy.module';
import { NormalizationModule } from '../../normalization/normalization.module';
import { QueuesModule } from '../../queues/queues.module';
import { AdminModule } from '../../admin/admin.module';
import { CoinGeckoModule } from '../coingecko/coingecko.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AlchemyModule,
    NormalizationModule,
    QueuesModule,
    AdminModule,
    CoinGeckoModule,
  ],
  providers: [IngestionSchedulerService],
  exports: [IngestionSchedulerService],
})
export class SchedulerModule {}

