import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemSettingsService } from './system-settings.service';
import { TokenSettingsService } from './token-settings.service';
import { CoinsService } from '../coins/coins.service';
import { CoinGeckoModule } from '../integrations/coingecko/coingecko.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [PrismaModule, AuthModule, CacheModule, CoinGeckoModule],
  controllers: [AdminController],
  providers: [AdminService, SystemSettingsService, TokenSettingsService, CoinsService],
  exports: [AdminService, SystemSettingsService, TokenSettingsService],
})
export class AdminModule {}

