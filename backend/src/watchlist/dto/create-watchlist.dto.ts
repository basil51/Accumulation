import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  coinId: string;

  @IsOptional()
  @IsNumber()
  thresholdUsd?: number;

  @IsOptional()
  @IsNumber()
  thresholdPercentage?: number;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}


