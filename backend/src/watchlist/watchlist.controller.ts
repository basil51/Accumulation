import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private watchlistService: WatchlistService) {}

  /**
   * GET /api/watchlist
   * Get user's watchlist
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getWatchlist(@GetUser() user: User) {
    const data = await this.watchlistService.getUserWatchlist(user.id);
    return { data };
  }

  /**
   * POST /api/watchlist
   * Add coin to watchlist
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addToWatchlist(
    @GetUser() user: User,
    @Body() dto: CreateWatchlistDto,
  ) {
    return this.watchlistService.addToWatchlist(user.id, dto);
  }

  /**
   * DELETE /api/watchlist/:id
   * Remove coin from watchlist
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeFromWatchlist(@GetUser() user: User, @Param('id') id: string) {
    return this.watchlistService.removeFromWatchlist(user.id, id);
  }
}

