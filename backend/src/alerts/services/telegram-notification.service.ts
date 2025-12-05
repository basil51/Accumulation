import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Alert } from '@prisma/client';

/**
 * Telegram notification service
 * TODO: Integrate with Telegram Bot API
 * For now, this is a placeholder that logs the message
 */
@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Send alert message to Telegram chat
   */
  async sendAlertMessage(
    chatId: string,
    alert: Alert & { coin?: any },
  ): Promise<{ success: boolean; message?: string }> {
    // TODO: Implement actual Telegram Bot API integration
    // Example: https://github.com/yagop/node-telegram-bot-api

    const message = this.formatTelegramMessage(alert);

    // For now, just log (in production, send via Telegram Bot API)
    this.logger.log(`[TELEGRAM] Would send to chat ${chatId}:`);
    this.logger.log(`Message: ${message.substring(0, 100)}...`);

    // Example integration (uncomment when Telegram bot is configured):
    /*
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    
    // Using node-telegram-bot-api:
    // const TelegramBot = require('node-telegram-bot-api');
    // const bot = new TelegramBot(botToken);
    // await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    */

    return { success: true };
  }

  /**
   * Format alert message for Telegram
   */
  private formatTelegramMessage(alert: Alert & { coin?: any }): string {
    const coinInfo = alert.coin
      ? `${alert.coin.name} (${alert.coin.symbol})`
      : 'Unknown Coin';

    return `
🚨 <b>${alert.title}</b>

💰 <b>Coin:</b> ${coinInfo}
📊 <b>Score:</b> ${alert.score}/100

${alert.message}

<a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:4000'}/alerts/${alert.id}">View Details</a>
    `.trim();
  }
}

