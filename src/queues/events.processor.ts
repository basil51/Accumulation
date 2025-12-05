import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('events')
export class EventsProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    console.log('Data:', job.data);
    
    // Placeholder for event processing logic
    switch (job.name) {
      case 'normalize':
        return this.handleNormalize(job.data);
      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleNormalize(data: any) {
    // TODO: Implement normalization logic
    console.log('Normalizing event data...');
    return { status: 'normalized', eventId: data.eventId };
  }
}

