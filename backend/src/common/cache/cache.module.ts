import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST') || 'localhost';
        const redisPort = configService.get('REDIS_PORT') || 6381;
        
        return {
          store: await redisStore({
            socket: {
              host: redisHost,
              port: parseInt(redisPort.toString(), 10),
            },
            ttl: 300, // Default TTL: 5 minutes
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}

