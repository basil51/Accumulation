import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/settings
   * Get current user's settings.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getSettings(@GetUser() user: User) {
    return this.settingsService.getUserSettings(user.id);
  }

  /**
   * PUT /api/settings
   * Update current user's settings.
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @GetUser() user: User,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    const settings = await this.settingsService.updateUserSettings(
      user.id,
      dto,
    );

    return {
      message: 'Settings updated successfully',
      settings,
    };
  }
}

