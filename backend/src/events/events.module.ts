import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CacheModule } from '../common/cache/cache.module';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [PrismaModule, CacheModule, QueuesModule],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
