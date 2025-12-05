import { Module } from '@nestjs/common';
import { NormalizationService } from './normalization.service';
import { DeduplicationService } from './deduplication.service';
import { AlchemyMapper } from './mappers/alchemy.mapper';
import { CovalentMapper } from './mappers/covalent.mapper';

@Module({
  providers: [NormalizationService, DeduplicationService, AlchemyMapper, CovalentMapper],
  exports: [NormalizationService, AlchemyMapper, CovalentMapper],
})
export class NormalizationModule {}
