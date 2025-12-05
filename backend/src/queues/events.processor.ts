import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NormalizationService } from '../normalization/normalization.service';
import { AlchemyMapper } from '../normalization/mappers/alchemy.mapper';
import { CovalentMapper } from '../normalization/mappers/covalent.mapper';

@Processor('events')
export class EventsProcessor extends WorkerHost {
  constructor(
    private normalizationService: NormalizationService,
    private alchemyMapper: AlchemyMapper,
    private covalentMapper: CovalentMapper,
    @InjectQueue('detection') private detectionQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    
    switch (job.name) {
      case 'process-alchemy-webhook':
        return this.handleAlchemyWebhook(job.data);
      case 'process-covalent-webhook':
        return this.handleCovalentWebhook(job.data);
      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleAlchemyWebhook(data: any) {
    try {
        const normalizedEvent = await this.alchemyMapper.normalize(data);
        const savedEvent = await this.normalizationService.saveNormalizedEvent(normalizedEvent);
        
        // Enqueue for detection if event was saved
        if (savedEvent) {
          await this.detectionQueue.add('process-event', {
            eventId: savedEvent.eventId,
          });
        }
        
        return savedEvent;
    } catch (error) {
        console.error('Error processing Alchemy webhook:', error);
        throw error;
    }
  }

  private async handleCovalentWebhook(data: any) {
    try {
        const normalizedEvent = await this.covalentMapper.normalize(data);
        const savedEvent = await this.normalizationService.saveNormalizedEvent(normalizedEvent);
        
        // Enqueue for detection if event was saved
        if (savedEvent) {
          await this.detectionQueue.add('process-event', {
            eventId: savedEvent.eventId,
          });
        }
        
        return savedEvent;
    } catch (error) {
        console.error('Error processing Covalent webhook:', error);
        throw error;
    }
  }
}
