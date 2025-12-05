import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionGuard } from './guard/subscription.guard';

@Module({
  imports: [PrismaModule],
  providers: [SubscriptionService, SubscriptionGuard],
  controllers: [SubscriptionController],
  exports: [SubscriptionService, SubscriptionGuard],
})
export class SubscriptionModule {}
