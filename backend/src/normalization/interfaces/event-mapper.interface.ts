import { Chain } from '@prisma/client';

export interface NormalizedEventData {
  eventId: string;
  provider: string;
  chain: Chain;
  type: string;
  txHash: string;
  timestamp: Date;
  blockNumber?: number;
  tokenContract: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  amountUsd?: number;
  metadata?: any;
  rawData: any;
}

export interface IEventMapper {
  normalize(rawData: any): Promise<NormalizedEventData>;
}
