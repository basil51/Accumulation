import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

