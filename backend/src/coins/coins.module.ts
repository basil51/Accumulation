import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CacheModule } from '../common/cache/cache.module';
import { CoinsService } from './coins.service';
import { CoinsController } from './coins.controller';

@Module({
  imports: [PrismaModule, CacheModule],
  providers: [CoinsService],
  controllers: [CoinsController],
})
export class CoinsModule {}
