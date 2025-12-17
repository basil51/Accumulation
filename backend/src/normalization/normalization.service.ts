import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NormalizedEventData } from './interfaces/event-mapper.interface';
import { DeduplicationService } from './deduplication.service';

@Injectable()
export class NormalizationService {
  private readonly logger = new Logger(NormalizationService.name);

  constructor(
    private prisma: PrismaService,
    private deduplicationService: DeduplicationService,
  ) {}

  async saveNormalizedEvent(data: NormalizedEventData) {
    try {
      const isDuplicate = await this.deduplicationService.isDuplicate(data.eventId);
      if (isDuplicate) {
        this.logger.debug(`Normalization Debug ====> Skipping duplicate event: ${data.eventId}`);
        return null;
      }

      return await this.prisma.normalizedEvent.create({
        data: {
          ...data,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.warn(`Event already exists (race condition): ${data.eventId}`);
        return null;
      }
      this.logger.error(`Error saving event ${data.eventId}:`, error);
      throw error;
    }
  }
}
