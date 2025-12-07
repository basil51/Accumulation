import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ThresholdSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  overrideLargeTransferUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  overrideMinUnits?: number;

  @IsOptional()
  @Type(() => Number)
  overrideSupplyPct?: number;

  @IsOptional()
  @IsBoolean()
  useSystemDefaults?: boolean;
}

export class AlertSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  telegramEnabled?: boolean;

  @IsOptional()
  @IsString()
  telegramChatId?: string | null;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minSignalScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cooldownMinutes?: number;
}

export class DashboardSettingsDto {
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rowsPerPage?: number;

  @IsOptional()
  @IsString()
  timeWindow?: string;
}

export class UpdateUserSettingsDto {
  @IsOptional()
  @Type(() => ThresholdSettingsDto)
  thresholds?: ThresholdSettingsDto;

  @IsOptional()
  @Type(() => AlertSettingsDto)
  alerts?: AlertSettingsDto;

  @IsOptional()
  @Type(() => DashboardSettingsDto)
  dashboard?: DashboardSettingsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  watchlistChains?: string[];
}


