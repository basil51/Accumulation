import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { RuleEngineService } from './services/rule-engine.service';

/**
 * Processor for the detection queue
 * Processes normalized events through the detection engine
 */
@Processor('detection')
@Injectable()
export class DetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(DetectionProcessor.name);

  constructor(private ruleEngineService: RuleEngineService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    // Reduced logging - only log errors and summary, not every job
    try {
      switch (job.name) {
        case 'process-event':
          return await this.processEvent(job.data);
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Error processing detection job ${job.id}:`, error);
      throw error;
    }
  }

  private async processEvent(data: { eventId: string }) {
    if (!data?.eventId) {
      throw new Error('Missing eventId in job data');
    }

    return await this.ruleEngineService.processEvent(data.eventId);
  }
}

