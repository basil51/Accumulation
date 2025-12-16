import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { LoggerModule } from './common/logger/logger.module';
import { ErrorRecoveryModule } from './common/error-recovery/error-recovery.module';
import { BatchingModule } from './common/batching/batching.module';
import { CompressionModule } from './common/compression/compression.module';
import { AuthModule } from './auth/auth.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { SettingsModule } from './settings/settings.module';
import { CoinsModule } from './coins/coins.module';
import { QueuesModule } from './queues/queues.module';
import { NormalizationModule } from './normalization/normalization.module';
import { EventsModule } from './events/events.module';
import { SignalsModule } from './signals/signals.module';
import { AlertsModule } from './alerts/alerts.module';
import { AdminModule } from './admin/admin.module';
import { FeedbackModule } from './feedback/feedback.module';
import { CoinGeckoModule } from './integrations/coingecko/coingecko.module';
import { AlchemyModule } from './integrations/alchemy/alchemy.module';
import { SchedulerModule } from './integrations/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get('THROTTLE_TTL') || 60,
            limit: configService.get('THROTTLE_LIMIT') || 100,
          },
        ],
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost =
          (configService.get<string>('REDIS_HOST') || 'localhost').toString();
        const redisPortRaw = configService.get<string | number>('REDIS_PORT') ?? 6381;
        const redisPort = Number.parseInt(redisPortRaw.toString(), 10) || 6381;

        const connection: any = {
          host: redisHost,
          port: redisPort,
        };
        
        // Add password if provided
        const redisPassword = configService.get('REDIS_PASSWORD');
        if (redisPassword) {
          connection.password = redisPassword;
        }
        
        return { connection };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    CacheModule,
    LoggerModule,
    ErrorRecoveryModule,
    BatchingModule,
    CompressionModule,
    AuthModule,
    SubscriptionModule,
    WatchlistModule,
    SettingsModule,
    CoinsModule,
    QueuesModule,
    NormalizationModule,
    EventsModule,
    SignalsModule,
    AlertsModule,
    AdminModule,
    FeedbackModule,
    CoinGeckoModule,
    AlchemyModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

