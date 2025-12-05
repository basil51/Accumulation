import { Injectable } from '@nestjs/common';
import { IEventMapper, NormalizedEventData } from '../interfaces/event-mapper.interface';
import { Chain } from '@prisma/client';

@Injectable()
export class AlchemyMapper implements IEventMapper {
  async normalize(rawData: any): Promise<NormalizedEventData> {
    const event = rawData.event;
    const transaction = rawData.transaction || {};
    
    // Basic validation
    if (!event || !event.network) {
        throw new Error('Invalid Alchemy payload');
    }

    const chain = this.mapChain(event.network);
    const eventId = `${transaction.hash}-${event.logIndex || 0}`;

    return {
      eventId,
      provider: 'alchemy',
      chain,
      type: 'transfer', // Alchemy webhook usually sends activity, defaulting to transfer for now
      txHash: transaction.hash,
      timestamp: new Date(rawData.createdAt || Date.now()),
      blockNumber: Number(event.blockNumber),
      tokenContract: event.contractAddress || transaction.to, // Depending on if it's a token transfer or ETH
      tokenSymbol: event.asset || 'ETH', // Simplified
      tokenDecimals: event.decimals || 18,
      fromAddress: transaction.from,
      toAddress: transaction.to,
      amount: Number(event.value || 0),
      amountUsd: 0, // Not provided by webhook directly usually
      metadata: {
          activityType: event.activityType,
      },
      rawData,
    };
  }

  private mapChain(network: string): Chain {
      switch (network) {
          case 'ETH_MAINNET': return Chain.ETHEREUM;
          case 'MATIC_MAINNET': return Chain.POLYGON;
          case 'ARB_MAINNET': return Chain.ARBITRUM;
          case 'BASE_MAINNET': return Chain.BASE;
          default: return Chain.ETHEREUM; // Default or throw
      }
  }
}
