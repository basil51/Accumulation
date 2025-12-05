import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailNotificationService } from './services/email-notification.service';
import { TelegramNotificationService } from './services/telegram-notification.service';

/**
 * Processor for the alerts queue
 * Handles sending notifications (email, telegram) for alerts
 */
@Processor('alerts')
@Injectable()
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(
    private alertsService: AlertsService,
    private prisma: PrismaService,
    private emailService: EmailNotificationService,
    private telegramService: TelegramNotificationService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing alert job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'send-notifications':
          return await this.sendNotifications(job.data);
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Error processing alert job ${job.id}:`, error);
      throw error;
    }
  }

  private async sendNotifications(data: { alertId: string }) {
    if (!data?.alertId) {
      throw new Error('Missing alertId in job data');
    }

    // Fetch alert with user and coin data
    const alert = await this.prisma.alert.findUnique({
      where: { id: data.alertId },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
        coin: true,
      },
    });

    if (!alert) {
      throw new Error(`Alert ${data.alertId} not found`);
    }

    const user = alert.user;
    const settings = user.settings;

    // Send email notification if enabled
    if (settings?.emailEnabled && !alert.emailSent) {
      try {
        await this.emailService.sendAlertEmail(alert);
        await this.alertsService.updateNotificationStatus(
          alert.id,
          'email',
          true,
        );
        this.logger.log(`Email notification sent for alert ${alert.id}`);
      } catch (error) {
        this.logger.error(`Failed to send email for alert ${alert.id}:`, error);
        // Don't throw - continue with other channels
      }
    }

    // Send telegram notification if enabled
    if (
      settings?.telegramEnabled &&
      settings?.telegramChatId &&
      !alert.telegramSent
    ) {
      try {
        await this.telegramService.sendAlertMessage(
          settings.telegramChatId,
          alert,
        );
        await this.alertsService.updateNotificationStatus(
          alert.id,
          'telegram',
          true,
        );
        this.logger.log(`Telegram notification sent for alert ${alert.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to send telegram for alert ${alert.id}:`,
          error,
        );
        // Don't throw - continue
      }
    }

    return {
      alertId: alert.id,
      emailSent: alert.emailSent || false,
      telegramSent: alert.telegramSent || false,
    };
  }
}

