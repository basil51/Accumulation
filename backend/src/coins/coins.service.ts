import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CoinsService {
  constructor(private prisma: PrismaService) {}

  async findCoinById(id: string) {
    return this.prisma.coin.findUnique({
      where: { id },
    });
  }
}
