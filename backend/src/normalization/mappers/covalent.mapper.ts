import { Injectable } from '@nestjs/common';
import { IEventMapper, NormalizedEventData } from '../interfaces/event-mapper.interface';
import { Chain } from '@prisma/client';

@Injectable()
export class CovalentMapper implements IEventMapper {
  async normalize(rawData: any): Promise<NormalizedEventData> {
    // Placeholder logic for Covalent data structure
    // Covalent typically provides transaction history or log events via API, less commonly via direct webhook for everything
    // Assuming rawData is a Log event from Covalent's Unified API

    const log = rawData; // Simplified assumption
    const chainId = rawData.chain_id; 
    
    const chain = this.mapChainId(chainId);
    const eventId = `${log.tx_hash}-${log.log_offset}`;

    return {
      eventId,
      provider: 'covalent',
      chain,
      type: 'transfer', // Defaulting, would need topic parsing
      txHash: log.tx_hash,
      timestamp: new Date(log.block_signed_at),
      blockNumber: log.block_height,
      tokenContract: log.sender_address, // In Covalent logs, sender_address usually is the contract emitting the log
      tokenSymbol: 'UNKNOWN', 
      tokenDecimals: 18,
      fromAddress: '0x0000000000000000000000000000000000000000', // Needs topic decoding
      toAddress: '0x0000000000000000000000000000000000000000',   // Needs topic decoding
      amount: 0, // Needs data decoding
      amountUsd: 0,
      rawData,
    };
  }

  private mapChainId(chainId: number): Chain {
      switch (chainId) {
          case 1: return Chain.ETHEREUM;
          case 137: return Chain.POLYGON;
          case 42161: return Chain.ARBITRUM;
          case 8453: return Chain.BASE;
          case 56: return Chain.BSC;
          case 43114: return Chain.AVALANCHE;
          case 250: return Chain.FANTOM;
          // Solana is usually handled differently in Covalent
          default: return Chain.ETHEREUM;
      }
  }
}
