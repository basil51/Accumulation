import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  /**
   * GET /api/alerts
   * Get user's alerts
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAlerts(
    @GetUser() user: User,
    @Query('unread') unread?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.alertsService.findUserAlerts(user.id, {
      unread: unread === 'true' ? true : unread === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * PUT /api/alerts/:id/read
   * Mark alert as read
   */
  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAlertAsRead(@Param('id') id: string, @GetUser() user: User) {
    try {
      await this.alertsService.markAsRead(id, user.id);
      return { message: 'Alert marked as read' };
    } catch (error) {
      if (error.message === 'Alert not found' || error.message === 'Unauthorized') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * PUT /api/alerts/read-all
   * Mark all alerts as read
   */
  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAlertsAsRead(@GetUser() user: User) {
    return await this.alertsService.markAllAsRead(user.id);
  }
}

