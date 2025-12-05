import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DeduplicationService {
  constructor(private prisma: PrismaService) {}

  async isDuplicate(eventId: string): Promise<boolean> {
    const count = await this.prisma.normalizedEvent.count({
      where: { eventId },
    });
    return count > 0;
  }
}
