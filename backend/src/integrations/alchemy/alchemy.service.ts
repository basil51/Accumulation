import { Injectable, Logger } from '@nestjs/common';
import { Chain } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

interface AlchemyTransfer {
  from: string;
  to: string;
  value?: string; // For native transfers
  asset?: string; // Token symbol
  hash: string;
  blockNum: string;
  uniqueId: string;
  category: 'external' | 'internal' | 'erc20' | 'erc721' | 'erc1155' | 'specialnft';
  contractAddress?: string;
  tokenId?: string;
  metadata?: {
    blockTimestamp?: string; // ISO timestamp when withMetadata=true
  };
  rawContract?: {
    value?: string;
    address?: string;
    decimals?: number;
  };
}

interface AlchemyTransferResponse {
  transfers: AlchemyTransfer[];
  pageKey?: string;
}

interface FetchTransfersParams {
  chain: Chain;
  contractAddress?: string; // Optional: filter by token contract
  fromBlock?: number;
  toBlock?: number;
  pageKey?: string; // For pagination
  maxCount?: number; // Max results per request (default 1000)
  toAddress?: string; // Optional: filter by recipient address
  fromAddress?: string; // Optional: filter by sender address
}

@Injectable()
export class AlchemyService {
  private readonly logger = new Logger(AlchemyService.name);
  private readonly apiKey: string;
  private readonly httpClient: AxiosInstance;

  // Alchemy API base URLs per chain
  private readonly chainEndpoints: Record<Chain, string> = {
    [Chain.ETHEREUM]: 'https://eth-mainnet.g.alchemy.com/v2',
    [Chain.POLYGON]: 'https://polygon-mainnet.g.alchemy.com/v2',
    [Chain.ARBITRUM]: 'https://arb-mainnet.g.alchemy.com/v2',
    [Chain.BASE]: 'https://base-mainnet.g.alchemy.com/v2',
    [Chain.BSC]: 'https://bsc-mainnet.g.alchemy.com/v2', // Note: Alchemy doesn't support BSC, this would need different provider
    [Chain.AVALANCHE]: 'https://avax-mainnet.g.alchemy.com/v2', // Note: Alchemy doesn't support Avalanche
    [Chain.FANTOM]: 'https://fantom-mainnet.g.alchemy.com/v2', // Note: Alchemy doesn't support Fantom
    [Chain.SOLANA]: 'https://solana-mainnet.g.alchemy.com/v2', // Note: Different API structure
    [Chain.BITCOIN]: '', // Alchemy doesn't support Bitcoin
  };

  constructor() {
    // Support both single key and chain-specific keys
    this.apiKey =
      (process.env.ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY_ETHEREUM || '').trim();

    if (!this.apiKey) {
      this.logger.warn(
        'ALCHEMY_API_KEY not set. Alchemy integration will not work.',
      );
    } else {
      // Log first 8 chars for verification (without exposing full key)
      this.logger.log(
        `Alchemy API key configured: ${this.apiKey.substring(0, 8)}...`,
      );
    }

    this.httpClient = axios.create({
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get the API endpoint URL for a specific chain
   */
  private getEndpoint(chain: Chain): string {
    const baseUrl = this.chainEndpoints[chain];
    if (!baseUrl) {
      throw new Error(`Alchemy does not support chain: ${chain}`);
    }
    return `${baseUrl}/${this.apiKey}`;
  }

  /**
   * Check if Alchemy supports the given chain
   */
  isChainSupported(chain: Chain): boolean {
    return !!this.chainEndpoints[chain] && chain !== Chain.BITCOIN;
  }

  /**
   * Fetch transfers from Alchemy API
   * Uses alchemy_getAssetTransfers endpoint
   */
  async fetchTransfers(
    params: FetchTransfersParams,
  ): Promise<AlchemyTransfer[]> {
    if (!this.apiKey) {
      throw new Error('ALCHEMY_API_KEY is not configured');
    }

    if (!this.isChainSupported(params.chain)) {
      this.logger.warn(
        `Chain ${params.chain} is not supported by Alchemy. Skipping.`,
      );
      return [];
    }
  
    const endpoint = this.getEndpoint(params.chain);
    const allTransfers: AlchemyTransfer[] = [];
    let pageKey: string | undefined = params.pageKey;
    const maxCount = params.maxCount || 1000;

    try {
      do {
        const requestParams: any = {
          category: ['erc20'], // Focus on ERC20 transfers for token contracts
          withMetadata: true,
          excludeZeroValue: true, // Exclude zero-value transfers (approvals, rebasing tokens, etc.)
        };

        // Add block range - always provide toBlock, fromBlock only if specified
        if (params.fromBlock !== undefined && params.fromBlock !== null) {
          requestParams.fromBlock = `0x${params.fromBlock.toString(16)}`;
        }
        requestParams.toBlock = params.toBlock !== undefined && params.toBlock !== null
          ? `0x${params.toBlock.toString(16)}`
          : 'latest';

        // Filter by contract address if provided
        // Use contractAddresses array for ERC20 token filtering
        if (params.contractAddress) {
          requestParams.contractAddresses = [params.contractAddress];
        }

        // Add address filters if provided (critical for avoiding result truncation)
        if (params.toAddress) {
          requestParams.toAddress = params.toAddress;
        }
        if (params.fromAddress) {
          requestParams.fromAddress = params.fromAddress;
        }

        // Always set maxCount as hex string to avoid result truncation
        // Calculate remaining count needed
        const remainingCount = maxCount - allTransfers.length;
        if (remainingCount > 0) {
          // Alchemy expects maxCount as hex string, limit to reasonable value (0x64 = 100)
          const countToRequest = Math.min(100, Math.max(1, remainingCount));
          requestParams.maxCount = `0x${countToRequest.toString(16)}`;
        }

        // Add pageKey for pagination
        if (pageKey) {
          requestParams.pageKey = pageKey;
        }

        const requestBody = {
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [requestParams],
        };
        //this.logger.debug('====requestBody Debug ====>'+JSON.stringify(requestBody));
        const response = await this.httpClient.post<{
          jsonrpc: string;
          id: number;
          result?: AlchemyTransferResponse;
          error?: { code: number; message: string; data?: any };
        }>(endpoint, requestBody);

        if (response.data.error) {
          throw new Error(
            `Alchemy API error: ${JSON.stringify(response.data.error)}`,
          );
        }

        if (!response.data.result) {
          throw new Error('Alchemy API returned no result');
        }
        else{
          this.logger.debug('====response Debug ====> Result'+JSON.stringify(response.data.result));
        }

        const transfers = response.data.result.transfers || [];
        allTransfers.push(...transfers);

        pageKey = response.data.result.pageKey;

        // Rate limiting: wait 200ms between requests (free tier)
        if (pageKey && allTransfers.length < maxCount) {
          await this.delay(200);
        }
      } while (pageKey && allTransfers.length < maxCount);

      this.logger.log(
        `Fetched ${allTransfers.length} transfers for chain ${params.chain}`,
      );

      return allTransfers;
    } catch (error: any) {
      // Enhanced error logging for 403 errors
      if (error.response?.status === 403) {
        this.logger.error(
          `Alchemy API returned 403 Forbidden for chain ${params.chain}. Check ALCHEMY_API_KEY.`,
        );
      } else {
        this.logger.error(
          `Error fetching transfers from Alchemy for chain ${params.chain}:`,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Fetch transfers for a specific token contract
   */
  async fetchTokenTransfers(
    chain: Chain,
    contractAddress: string,
    fromBlock?: number,
    toBlock?: number,
  ): Promise<AlchemyTransfer[]> {
    return this.fetchTransfers({
      chain,
      contractAddress,
      fromBlock,
      toBlock,
    });
  }

  /**
   * Get the latest block number for a chain
   */
  async getLatestBlock(chain: Chain): Promise<number> {
    if (!this.apiKey) {
      throw new Error('ALCHEMY_API_KEY is not configured');
    }

    if (!this.isChainSupported(chain)) {
      throw new Error(`Chain ${chain} is not supported by Alchemy`);
    }

    const endpoint = this.getEndpoint(chain);

    try {
      const response = await this.httpClient.post<{
        jsonrpc: string;
        id: number;
        result?: string; // Hex string
        error?: { code: number; message: string; data?: any };
      }>(endpoint, {
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
      });

      if (response.data.error) {
        throw new Error(
          `Alchemy API error: ${JSON.stringify(response.data.error)}`,
        );
      }

      if (!response.data.result) {
        throw new Error('Alchemy API returned no result');
      }

      const blockNumber = parseInt(response.data.result, 16);
      return blockNumber;
    } catch (error: any) {
      // Enhanced error logging for 403 errors
      if (error.response?.status === 403) {
        this.logger.error(
          `Alchemy API returned 403 Forbidden for chain ${chain}. This usually means:`,
        );
        this.logger.error(
          '1. ALCHEMY_API_KEY is missing or invalid',
        );
        this.logger.error(
          '2. API key does not have access to this chain',
        );
        this.logger.error(
          '3. API key format is incorrect (should not have quotes or extra spaces)',
        );
        this.logger.error(
          `Endpoint used: ${this.getEndpoint(chain).replace(this.apiKey, '***')}`,
        );
      } else {
        this.logger.error(
          `Error fetching latest block for chain ${chain}:`,
          error.message,
        );
        if (error.response?.data) {
          this.logger.error('Response data:', JSON.stringify(error.response.data));
        }
      }
      throw error;
    }
  }

  /**
   * Health check - verify API key is valid
   */
  async healthCheck(chain: Chain = Chain.ETHEREUM): Promise<boolean> {
    try {
      await this.getLatestBlock(chain);
      return true;
    } catch (error) {
      this.logger.warn(`Alchemy health check failed for ${chain}:`, error);
      return false;
    }
  }

  /**
   * Convert Alchemy transfer to a format compatible with AlchemyMapper
   * This allows the existing mapper to normalize the data
   */
  convertTransferToMapperFormat(
    transfer: AlchemyTransfer,
    chain: Chain,
  ): any {
    return {
      event: {
        network: this.mapChainToAlchemyNetwork(chain),
        blockNumber: parseInt(transfer.blockNum, 16).toString(),
        contractAddress: transfer.contractAddress,
        asset: transfer.asset || 'ETH',
        value: transfer.value || transfer.rawContract?.value || '0',
        decimals: transfer.rawContract?.decimals || 18,
        activityType: transfer.category,
        uniqueId: transfer.uniqueId,
        logIndex: 0, // Not provided by transfers API, use uniqueId instead
      },
      transaction: {
        hash: transfer.hash,
        from: transfer.from,
        to: transfer.to,
      },
      createdAt: new Date().toISOString(), // Alchemy doesn't provide timestamp in transfers API
    };
  }

  /**
   * Map our Chain enum to Alchemy network identifier
   */
  private mapChainToAlchemyNetwork(chain: Chain): string {
    const mapping: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'ETH_MAINNET',
      [Chain.POLYGON]: 'MATIC_MAINNET',
      [Chain.ARBITRUM]: 'ARB_MAINNET',
      [Chain.BASE]: 'BASE_MAINNET',
      [Chain.BSC]: 'BSC_MAINNET', // Not actually supported
      [Chain.AVALANCHE]: 'AVAX_MAINNET', // Not actually supported
      [Chain.FANTOM]: 'FTM_MAINNET', // Not actually supported
      [Chain.SOLANA]: 'SOL_MAINNET', // Different API
      [Chain.BITCOIN]: '', // Not supported
    };
    return mapping[chain] || 'ETH_MAINNET';
  }

  /**
   * Helper: delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

