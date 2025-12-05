import {
  Controller,
  Get,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CoinsService } from './coins.service';

@Controller('coins')
export class CoinsController {
  constructor(private coinsService: CoinsService) {}

  /**
   * GET /api/coins/:id
   * Get coin details by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getCoinById(@Param('id') id: string) {
    const coin = await this.coinsService.findCoinById(id);
    if (!coin) {
      throw new NotFoundException(`Coin with ID ${id} not found`);
    }
    return coin;
  }
}
