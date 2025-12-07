import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FeedbackService, CreateFeedbackInput, UpdateFeedbackStatusInput } from './feedback.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { FeedbackType, FeedbackStatus } from '@prisma/client';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * POST /api/feedback
   * Create new feedback
   */
  @Post()
  async createFeedback(
    @GetUser('id') userId: string,
    @Body() input: CreateFeedbackInput,
  ) {
    return this.feedbackService.createFeedback(userId, input);
  }

  /**
   * GET /api/feedback
   * Get user's feedback
   */
  @Get()
  async getUserFeedback(
    @GetUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.feedbackService.getUserFeedback(userId, page, limit);
  }

  /**
   * GET /api/feedback/:id
   * Get feedback by ID
   */
  @Get(':id')
  async getFeedbackById(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.feedbackService.getFeedbackById(id, userId);
  }

  /**
   * GET /api/feedback/admin/all
   * Get all feedback (admin only)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAllFeedback(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus,
  ) {
    return this.feedbackService.getAllFeedback(page, limit, type, status);
  }

  /**
   * GET /api/feedback/admin/stats
   * Get feedback statistics (admin only)
   */
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }

  /**
   * PUT /api/feedback/admin/:id/status
   * Update feedback status (admin only)
   */
  @Put('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateFeedbackStatus(
    @Param('id') id: string,
    @GetUser('id') adminId: string,
    @Body() input: UpdateFeedbackStatusInput,
  ) {
    return this.feedbackService.updateFeedbackStatus(id, input, adminId);
  }
}

