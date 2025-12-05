import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('events')
export class EventsController {
  constructor(@InjectQueue('events') private eventsQueue: Queue) {}

  @Post('alchemy')
  @HttpCode(HttpStatus.OK)
  async handleAlchemyWebhook(@Body() payload: any) {
    if (!payload || !payload.event) {
        throw new BadRequestException('Invalid Alchemy payload');
    }
    
    await this.eventsQueue.add('process-alchemy-webhook', payload);
    return { status: 'processing' };
  }

  @Post('covalent')
  @HttpCode(HttpStatus.OK)
  async handleCovalentWebhook(@Body() payload: any) {
    // Covalent webhook validation logic would go here (e.g., signature check)
    
    await this.eventsQueue.add('process-covalent-webhook', payload);
    return { status: 'processing' };
  }
}
