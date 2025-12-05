import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Alert } from '@prisma/client';

/**
 * Email notification service
 * TODO: Integrate with SendGrid, Mailgun, or similar service
 * For now, this is a placeholder that logs the email
 */
@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Send alert email to user
   */
  async sendAlertEmail(alert: Alert & { coin?: any; user?: any }) {
    // TODO: Implement actual email sending
    // Options: SendGrid, Mailgun, AWS SES, etc.

    const subject = alert.title;
    const htmlBody = this.generateEmailBody(alert);

    // For now, just log (in production, send via email service)
    this.logger.log(`[EMAIL] Would send to ${alert.user?.email || 'user'}:`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Body: ${htmlBody.substring(0, 100)}...`);

    // Example integration (uncomment when email service is configured):
    /*
    const emailApiKey = this.configService.get('EMAIL_API_KEY');
    const emailFrom = this.configService.get('EMAIL_FROM');
    
    // SendGrid example:
    // await sgMail.send({
    //   to: alert.user.email,
    //   from: emailFrom,
    //   subject: subject,
    //   html: htmlBody,
    // });
    */

    return { success: true };
  }

  /**
   * Generate HTML email body for alert
   */
  private generateEmailBody(alert: Alert & { coin?: any }): string {
    const coinInfo = alert.coin
      ? `${alert.coin.name} (${alert.coin.symbol})`
      : 'Unknown Coin';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .score { font-size: 24px; font-weight: bold; color: #10B981; }
            .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Accumulation Alert</h1>
            </div>
            <div class="content">
              <h2>${coinInfo}</h2>
              <p><strong>Score:</strong> <span class="score">${alert.score}/100</span></p>
              <p>${alert.message}</p>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:4000'}/alerts/${alert.id}" class="button">
                View Alert
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

