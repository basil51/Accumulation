import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertsProcessor } from './alerts.processor';
import { EmailNotificationService } from './services/email-notification.service';
import { TelegramNotificationService } from './services/telegram-notification.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'alerts',
    }),
  ],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertsProcessor,
    EmailNotificationService,
    TelegramNotificationService,
  ],
  exports: [AlertsService, EmailNotificationService, TelegramNotificationService],
})
export class AlertsModule {}

