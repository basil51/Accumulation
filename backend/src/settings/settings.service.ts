import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure a UserSettings row exists for the given user.
   * If not, create one with default values.
   */
  private async ensureUserSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          // Start with empty chains array; other fields rely on Prisma defaults
          watchlistChains: [],
        },
      });
    }

    return settings;
  }

  /**
   * Map the UserSettings Prisma model to the API response shape
   * documented in api_endpoints.md.
   */
  private mapToResponse(settings: any) {
    return {
      thresholds: {
        overrideLargeTransferUsd: settings.overrideLargeTransferUsd ?? null,
        overrideMinUnits: settings.overrideMinUnits ?? null,
        overrideSupplyPct: settings.overrideSupplyPct ?? null,
        useSystemDefaults: settings.useSystemDefaults,
      },
      alerts: {
        emailEnabled: settings.emailEnabled,
        telegramEnabled: settings.telegramEnabled,
        telegramChatId: settings.telegramChatId ?? null,
        notificationsEnabled: settings.notificationsEnabled,
        minSignalScore: settings.minSignalScore,
        cooldownMinutes: settings.cooldownMinutes,
      },
      dashboard: {
        darkMode: settings.darkMode,
        rowsPerPage: settings.rowsPerPage,
        timeWindow: settings.timeWindow,
      },
      watchlistChains: settings.watchlistChains ?? [],
    };
  }

  async getUserSettings(userId: string) {
    const settings = await this.ensureUserSettings(userId);
    return this.mapToResponse(settings);
  }

  async updateUserSettings(userId: string, dto: UpdateUserSettingsDto) {
    await this.ensureUserSettings(userId);

    const data: any = {};

    if (dto.thresholds) {
      const { overrideLargeTransferUsd, overrideMinUnits, overrideSupplyPct, useSystemDefaults } =
        dto.thresholds;

      if (overrideLargeTransferUsd !== undefined) {
        data.overrideLargeTransferUsd = overrideLargeTransferUsd;
      }
      if (overrideMinUnits !== undefined) {
        data.overrideMinUnits = overrideMinUnits;
      }
      if (overrideSupplyPct !== undefined) {
        data.overrideSupplyPct = overrideSupplyPct;
      }
      if (useSystemDefaults !== undefined) {
        data.useSystemDefaults = useSystemDefaults;
      }
    }

    if (dto.alerts) {
      const {
        emailEnabled,
        telegramEnabled,
        telegramChatId,
        notificationsEnabled,
        minSignalScore,
        cooldownMinutes,
      } = dto.alerts;

      if (emailEnabled !== undefined) {
        data.emailEnabled = emailEnabled;
      }
      if (telegramEnabled !== undefined) {
        data.telegramEnabled = telegramEnabled;
      }
      if (telegramChatId !== undefined) {
        data.telegramChatId = telegramChatId;
      }
      if (notificationsEnabled !== undefined) {
        data.notificationsEnabled = notificationsEnabled;
      }
      if (minSignalScore !== undefined) {
        data.minSignalScore = minSignalScore;
      }
      if (cooldownMinutes !== undefined) {
        data.cooldownMinutes = cooldownMinutes;
      }
    }

    if (dto.dashboard) {
      const { darkMode, rowsPerPage, timeWindow } = dto.dashboard;

      if (darkMode !== undefined) {
        data.darkMode = darkMode;
      }
      if (rowsPerPage !== undefined) {
        data.rowsPerPage = rowsPerPage;
      }
      if (timeWindow !== undefined) {
        data.timeWindow = timeWindow;
      }
    }

    if (dto.watchlistChains !== undefined) {
      data.watchlistChains = dto.watchlistChains;
    }

    const updated = await this.prisma.userSettings.update({
      where: { userId },
      data,
    });

    return this.mapToResponse(updated);
  }
}

