import { Module } from '@nestjs/common';
import { CoinGeckoService } from './coingecko.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CoinGeckoService],
  exports: [CoinGeckoService],
})
export class CoinGeckoModule {}

