import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all system settings
   */
  async getAllSettings() {
    const settings = await this.prisma.systemSettings.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  /**
   * Get a specific system setting by key
   */
  async getSetting(key: string) {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`System setting '${key}' not found`);
    }

    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
    };
  }

  /**
   * Set a system setting (create or update)
   */
  async setSetting(key: string, value: any, updatedBy?: string) {
    return this.prisma.systemSettings.upsert({
      where: { key },
      update: {
        value,
        updatedBy,
      },
      create: {
        key,
        value,
        updatedBy,
      },
    });
  }

  /**
   * Set multiple system settings at once
   */
  async setSettings(
    settings: Record<string, any>,
    updatedBy?: string,
  ) {
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      results.push(await this.setSetting(key, value, updatedBy));
    }
    return results;
  }

  /**
   * Delete a system setting
   */
  async deleteSetting(key: string) {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`System setting '${key}' not found`);
    }

    await this.prisma.systemSettings.delete({
      where: { key },
    });

    return { message: `Setting '${key}' deleted successfully` };
  }

  /**
   * Get default system settings structure
   */
  getDefaultSettings() {
    return {
      // Global Thresholds
      global_thresholds: {
        large_transfer_usd: 50000,
        unit_threshold_default: 100000,
        supply_percentage_threshold: 0.05,
        liquidity_ratio_threshold: 0.01,
        exchange_outflow_threshold_usd: 100000,
        swap_spike_factor: 3,
        lp_add_threshold_usd: 10000,
        candidate_signal_threshold: 60,
        alert_signal_threshold: 75,
      },
      // Ingestion Settings
      ingestion: {
        polling_interval_seconds: 12,
        max_blocks_per_cycle: 300,
        max_events_per_token_per_cycle: 2000,
        allow_historical_sync: true,
        historical_sync_days: 7,
      },
      // Provider Settings
      providers: {
        alchemy: {
          enabled: true,
          chains: ['eth-mainnet', 'polygon', 'arbitrum'],
          max_calls_per_min: 80,
        },
        covalent: {
          enabled: true,
          chains: ['eth', 'polygon', 'bsc', 'avax'],
          max_calls_per_min: 60,
        },
        thegraph: {
          enabled: true,
          subgraphs: ['uniswap', 'sushiswap'],
          max_calls_per_min: 120,
        },
        dexscreener: {
          enabled: true,
          polling_interval_seconds: 20,
        },
      },
      // Alerting Settings
      alerting: {
        max_alerts_per_user_per_hour: 5,
        global_alert_cooldown_minutes: 60,
        telegram_enabled: true,
        email_enabled: true,
      },
      // Auto-Tuning Settings
      auto_tune: {
        enabled: true,
        high_cap_usd: 500000000,
        increase_threshold_large_transfer: 2.0,
        increase_threshold_units: 3.0,
      },
    };
  }

  /**
   * Initialize default system settings if they don't exist
   */
  async initializeDefaults() {
    const defaults = this.getDefaultSettings();
    const results = [];

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await this.prisma.systemSettings.findUnique({
        where: { key },
      });

      if (!existing) {
        const created = await this.prisma.systemSettings.create({
          data: {
            key,
            value: value as any,
          },
        });
        results.push(created);
      }
    }

    return results;
  }
}

