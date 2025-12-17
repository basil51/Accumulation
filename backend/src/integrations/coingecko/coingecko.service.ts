import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Chain } from '@prisma/client';

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  platforms?: Record<string, string>; // { "ethereum": "0x...", "polygon-pos": "0x..." }
  market_cap?: number;
  market_cap_rank?: number;
  total_supply?: number;
  circulating_supply?: number;
  current_price?: number;
}

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly apiKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_PRO_API_KEY;

  constructor(private prisma: PrismaService) {}

  /**
   * Map CoinGecko platform IDs to our Chain enum
   */
  private mapPlatformToChain(platform: string): Chain | null {
    const mapping: Record<string, Chain> = {
      ethereum: Chain.ETHEREUM,
      'binance-smart-chain': Chain.BSC,
      'polygon-pos': Chain.POLYGON,
      arbitrum: Chain.ARBITRUM,
      'base': Chain.BASE,
      avalanche: Chain.AVALANCHE,
      fantom: Chain.FANTOM,
      solana: Chain.SOLANA,
    };
    return mapping[platform] || null;
  }

  /**
   * Map chain to CoinGecko native coin id (for native token pricing)
   */
  private mapChainToNativeId(chain: Chain): string | null {
    const mapping: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'ethereum',
      [Chain.BSC]: 'binancecoin',
      [Chain.POLYGON]: 'matic-network',
      [Chain.ARBITRUM]: 'ethereum', // native is ETH
      [Chain.BASE]: 'ethereum', // native is ETH
      [Chain.AVALANCHE]: 'avalanche-2',
      [Chain.FANTOM]: 'fantom',
      [Chain.SOLANA]: 'solana',
      [Chain.BITCOIN]: 'bitcoin',
    };
    return mapping[chain] || null;
  }

  /**
   * Map our Chain enum to CoinGecko platform IDs (for price lookups)
   */
  private mapChainToPlatform(chain: Chain): string | null {
    const mapping: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'ethereum',
      [Chain.BSC]: 'binance-smart-chain',
      [Chain.POLYGON]: 'polygon-pos',
      [Chain.ARBITRUM]: 'arbitrum',
      [Chain.BASE]: 'base',
      [Chain.AVALANCHE]: 'avalanche',
      [Chain.FANTOM]: 'fantom',
      [Chain.SOLANA]: 'solana',
      [Chain.BITCOIN]: '',
    };

    return mapping[chain] || null;
  }

  /**
   * Lightweight price lookup for a single token contract
   * Uses CoinGecko simple token price endpoint
   */
  async fetchTokenPriceUsd(chain: Chain, contractAddress: string): Promise<number | null> {
    const platform = this.mapChainToPlatform(chain);
    const address = contractAddress?.toLowerCase();

    if (!platform || !address) {
      return null;
    }

    const url = `${this.baseUrl}/simple/token_price/${platform}?contract_addresses=${address}&vs_currencies=usd`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const status = `${response.status} ${response.statusText}`;
        if (response.status === 429) {
          this.logger.warn(`CoinGecko rate limit when fetching price for ${address} on ${chain}: ${status}`);
        } else {
          this.logger.warn(`CoinGecko price fetch failed for ${address} on ${chain}: ${status}`);
        }
        return null;
      }

      const data = await response.json();
      const price = data?.[address]?.usd;

      if (price === undefined || price === null) {
        this.logger.debug(`CoinGecko Debug ====> returned no price for ${address} on ${chain}`);
        return null;
      }

      return Number(price);
    } catch (error: any) {
      this.logger.warn(
        `Error fetching CoinGecko price for ${address} on ${chain}: ${error.message || error}`,
      );
      return null;
    }
  }

  /**
   * Lightweight price lookup for native token of a chain
   */
  async fetchNativePriceUsd(chain: Chain): Promise<number | null> {
    const coinId = this.mapChainToNativeId(chain);
    if (!coinId) {
      return null;
    }

    const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const status = `${response.status} ${response.statusText}`;
        if (response.status === 429) {
          this.logger.warn(`CoinGecko rate limit when fetching native price for ${chain}: ${status}`);
        } else {
          this.logger.warn(`CoinGecko native price fetch failed for ${chain}: ${status}`);
        }
        return null;
      }
      const data = await response.json();
      const price = data?.[coinId]?.usd;
      if (price === undefined || price === null) {
        this.logger.debug(`CoinGecko Debug ====> returned no native price for ${chain}`);
        return null;
      }
      return Number(price);
    } catch (error: any) {
      this.logger.warn(
        `Error fetching CoinGecko native price for ${chain}: ${error.message || error}`,
      );
      return null;
    }
  }

  /**
   * Fetch coins from CoinGecko API
   * Gets top coins by market cap
   */
  async fetchCoinsFromCoinGecko(
    limit: number = 1000,
    minMarketCap: number = 25000, // $25k minimum (slightly higher than $24k for safety)
  ): Promise<CoinGeckoCoin[]> {
    const allCoins: CoinGeckoCoin[] = [];
    const perPage = 250; // CoinGecko max per page
    const pages = Math.ceil(limit / perPage);
 
    for (let page = 1; page <= pages; page++) {
      try {
        const url = `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (this.apiKey) {
          headers['x-cg-pro-api-key'] = this.apiKey;
        }

        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          this.logger.warn(`CoinGecko API error: ${response.status} ${response.statusText}`);
          if (response.status === 429) {
            // Rate limited - wait a bit
            await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute
            continue;
          }
          break;
        }

        const coins: CoinGeckoCoin[] = await response.json();
        
        // Filter by minimum market cap
        const filteredCoins = coins.filter(
          (coin) => coin.market_cap && coin.market_cap >= minMarketCap,
        );

        allCoins.push(...filteredCoins);

        // If we got less than perPage, we've reached the end
        if (coins.length < perPage) {
          break;
        }

        // Rate limiting: CoinGecko free tier is 10-50 calls/minute
        // Wait 1.5 seconds between requests to be safe
        if (page < pages) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (error) {
        this.logger.error(`Error fetching CoinGecko page ${page}:`, error);
        break;
      }
    }

    return allCoins;
  }

  /**
   * Initialize or update ChainInfo for a chain
   */
  private async upsertChainInfo(chain: Chain, name: string) {
    const chainInfo = await this.prisma.chainInfo.findUnique({
      where: { chain },
    });

    if (!chainInfo) {
      await this.prisma.chainInfo.create({
        data: {
          chain,
          name,
          isActive: true,
          coinCount: 0,
          signalCount: 0,
        },
      });
    }
  }

  /**
   * Update chain coin count after import
   */
  private async updateChainCoinCounts() {
    const chains = await this.prisma.coin.groupBy({
      by: ['chain'],
      _count: {
        chain: true,
      },
    });

    for (const chainData of chains) {
      // Use upsert to create if doesn't exist, update if it does
      await this.prisma.chainInfo.upsert({
        where: { chain: chainData.chain },
        update: { coinCount: chainData._count.chain },
        create: {
          chain: chainData.chain,
          name: this.getChainName(chainData.chain),
          isActive: true,
          coinCount: chainData._count.chain,
          signalCount: 0,
        },
      });
    }
  }

  /**
   * Get chain name from Chain enum
   */
  private getChainName(chain: Chain): string {
    const names: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'Ethereum',
      [Chain.BSC]: 'Binance Smart Chain',
      [Chain.POLYGON]: 'Polygon',
      [Chain.ARBITRUM]: 'Arbitrum',
      [Chain.BASE]: 'Base',
      [Chain.AVALANCHE]: 'Avalanche',
      [Chain.FANTOM]: 'Fantom',
      [Chain.SOLANA]: 'Solana',
      [Chain.BITCOIN]: 'Bitcoin',
    };
    return names[chain] || chain;
  }

  /**
   * Get the last processed coin index from system settings
   */
  private async getLastProcessedIndex(): Promise<number> {
    try {
      const setting = await this.prisma.systemSettings.findUnique({
        where: { key: 'coingecko_import_last_index' },
      });
      return setting ? (setting.value as number) : 0;
    } catch (error) {
      this.logger.warn('Could not fetch last processed index, starting from 0');
      return 0;
    }
  }

  /**
   * Save the last processed coin index to system settings
   */
  private async saveLastProcessedIndex(index: number): Promise<void> {
    try {
      await this.prisma.systemSettings.upsert({
        where: { key: 'coingecko_import_last_index' },
        update: { value: index },
        create: {
          key: 'coingecko_import_last_index',
          value: index,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save last processed index:', error);
    }
  }

  /**
   * Import coins from CoinGecko in batches
   * Processes 50 coins per batch, waits 5 minutes between batches
   * Tracks progress to avoid processing the same coins twice
   */
  async importCoinsFromCoinGecko(
    limit: number = 1000,
    minMarketCap: number = 25000,
    batchSize: number = 50,
    batchDelayMinutes: number = 5,
  ): Promise<{ created: number; skipped: number; errors: number; chains: string[]; errorDetails?: string[]; processed: number; remaining: number }> {
    this.logger.log(`Starting CoinGecko import: limit=${limit}, minMarketCap=$${minMarketCap}, batchSize=${batchSize}, delay=${batchDelayMinutes}min`);

    // Get last processed index
    const startIndex = await this.getLastProcessedIndex();
    this.logger.log(`Resuming from index ${startIndex}`);

    const coins = await this.fetchCoinsFromCoinGecko(limit, minMarketCap);
    this.logger.log(`Fetched ${coins.length} coins from CoinGecko`);

    // Only process coins from startIndex onwards
    const coinsToProcess = coins.slice(startIndex);
    this.logger.log(`Processing ${coinsToProcess.length} coins (starting from index ${startIndex})`);

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const chainsFound = new Set<Chain>();
    const errorDetails: string[] = [];
    
    // Determine rate limit delay based on API key presence
    // Free tier: 10-50 calls/min = 1.2-6 seconds per call (use 12 seconds to be safe)
    // Pro tier: 500 calls/min = 0.12 seconds per call (use 200ms to be safe)
    const delayMs = this.apiKey ? 200 : 12000; // 12 seconds for free tier (5 calls/min), 200ms for pro
    this.logger.log(`Using ${delayMs/1000}s delay between API calls (${this.apiKey ? 'Pro' : 'Free'} tier)`);

    const batchDelayMs = batchDelayMinutes * 60 * 1000; // Convert minutes to milliseconds
    const totalBatches = Math.ceil(coinsToProcess.length / batchSize);
    
    this.logger.log(`Processing in ${totalBatches} batches of ${batchSize} coins each`);

    // Process coins in batches
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, coinsToProcess.length);
      const batch = coinsToProcess.slice(batchStart, batchEnd);
      
      this.logger.log(`Processing batch ${batchNum + 1}/${totalBatches} (coins ${batchStart + 1}-${batchEnd} of ${coinsToProcess.length})`);

      // Process each coin in the batch
      for (let i = 0; i < batch.length; i++) {
        const coin = batch[i];
        const globalIndex = startIndex + batchStart + i;
        
        try {
        // Fetch detailed coin data to get platform addresses
        const detailUrl = `${this.baseUrl}/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
        
        const headers: Record<string, string> = {
          'Accept': 'application/json',
        };
        
        if (this.apiKey) {
          headers['x-cg-pro-api-key'] = this.apiKey;
        }

        const detailResponse = await fetch(detailUrl, { headers });
        
        if (!detailResponse.ok) {
          const errorText = await detailResponse.text().catch(() => 'Unable to read error response');
          const errorMsg = `Coin ${coin.symbol} (${coin.id}): ${detailResponse.status} ${detailResponse.statusText}`;
          
          // If rate limited, wait longer with exponential backoff
          if (detailResponse.status === 429) {
            const waitTime = 120000; // 2 minutes for rate limit
            this.logger.warn(`Rate limited, waiting ${waitTime/1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            // Also increase delay for subsequent requests
            const increasedDelay = delayMs * 2;
            this.logger.warn(`Increasing delay to ${increasedDelay/1000}s for next requests`);
            await new Promise((resolve) => setTimeout(resolve, increasedDelay));
            i--; // Retry this coin
            continue;
          }
          
          // Don't count 400/404 as errors (bad request or coin doesn't exist/delisted)
          // These are common for native coins or invalid coin IDs
          if (detailResponse.status === 400 || detailResponse.status === 404) {
            this.logger.debug(`CoinGecko Debug ====> Skipping ${coin.symbol} (${coin.id}): ${detailResponse.status} ${detailResponse.statusText}`);
            // Still save progress
            await this.saveLastProcessedIndex(globalIndex + 1);
            continue;
          }
          
          // Log other errors but don't count them as critical
          this.logger.warn(`CoinGecko API error: ${errorMsg}`);
          if (errorDetails.length < 20) {
            errorDetails.push(errorMsg);
          }
          // Don't increment errors for non-critical status codes
          if (detailResponse.status >= 500) {
            errors++;
          }
          // Still save progress
          await this.saveLastProcessedIndex(globalIndex + 1);
          continue;
        }

        const coinDetail = await detailResponse.json();
        const platforms = coinDetail.platforms || {};

        // Check if coin has any supported platforms
        let hasSupportedChain = false;
        for (const [platformId, contractAddress] of Object.entries(platforms)) {
          const chain = this.mapPlatformToChain(platformId);
          if (chain && contractAddress && typeof contractAddress === 'string') {
            hasSupportedChain = true;
            break;
          }
        }

        // If coin has no supported chains, skip it (not an error)
        if (!hasSupportedChain) {
          this.logger.debug(`CoinGecko Debug ====> ${coin.symbol} (${coin.id}) has no supported chains, skipping`);
          // Save progress even when skipping
          await this.saveLastProcessedIndex(globalIndex + 1);
          // Still wait to avoid rate limiting
          if (i < batch.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          continue;
        }

        // Create coin for each supported platform
        let coinCreated = false;
        for (const [platformId, contractAddress] of Object.entries(platforms)) {
          const chain = this.mapPlatformToChain(platformId);
          
          if (!chain || !contractAddress || typeof contractAddress !== 'string') {
            continue;
          }

          // Track chain
          chainsFound.add(chain);
          
          // Initialize chain info if not exists
          await this.upsertChainInfo(chain, this.getChainName(chain));

          try {
            // Check if coin already exists
            const existing = await this.prisma.coin.findUnique({
              where: {
                contractAddress_chain: {
                  contractAddress: contractAddress.toLowerCase(),
                  chain,
                },
              },
            });

            if (existing) {
              // Update existing coin with latest data
              await this.prisma.coin.update({
                where: { id: existing.id },
                data: {
                  name: coin.name,
                  symbol: coin.symbol.toUpperCase(),
                  totalSupply: coin.total_supply || null,
                  circulatingSupply: coin.circulating_supply || null,
                  priceUsd: coin.current_price || null,
                  liquidityUsd: null, // Not available from CoinGecko
                },
              });
              skipped++;
            } else {
              // Create new coin
              await this.prisma.coin.create({
                data: {
                  name: coin.name,
                  symbol: coin.symbol.toUpperCase(),
                  contractAddress: contractAddress.toLowerCase(),
                  chain,
                  totalSupply: coin.total_supply || null,
                  circulatingSupply: coin.circulating_supply || null,
                  priceUsd: coin.current_price || null,
                  liquidityUsd: null,
                  isActive: coin.market_cap_rank ? coin.market_cap_rank <= 100 : false,
                  isFamous: coin.market_cap_rank ? coin.market_cap_rank <= 50 : false,
                },
              });
              created++;
              coinCreated = true;
            }
          } catch (error: any) {
            if (error.code === 'P2002') {
              // Unique constraint violation - coin already exists
              skipped++;
            } else {
              this.logger.error(`Error creating coin ${coin.symbol} on ${chain}:`, error.message || error);
              errors++;
            }
          }
        }

        // Save progress after each coin
        await this.saveLastProcessedIndex(globalIndex + 1);
        
        // Rate limiting: wait between requests within batch
        // Add extra delay after processing to avoid hitting rate limits
        if (i < batch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        const errorMsg = `Error processing ${coin.symbol} (${coin.id}): ${error.message || String(error)}`;
        this.logger.error(errorMsg);
        if (errorDetails.length < 20) {
          errorDetails.push(errorMsg);
        }
        errors++;
        // Save progress even on error
        await this.saveLastProcessedIndex(globalIndex + 1);
        // Still wait to avoid rate limiting
        if (i < batch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

      // Wait 5 minutes between batches (except after the last batch)
      if (batchNum < totalBatches - 1) {
        const processedSoFar = batchEnd;
        const remaining = coinsToProcess.length - processedSoFar;
        this.logger.log(`Batch ${batchNum + 1} complete. Waiting ${batchDelayMinutes} minutes before next batch...`);
        this.logger.log(`Progress: ${processedSoFar}/${coinsToProcess.length} coins processed (${created} created, ${skipped} skipped, ${errors} errors)`);
        this.logger.log(`${remaining} coins remaining`);
        
        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
      }
    }

    // Update chain coin counts
    await this.updateChainCoinCounts();

    const chainNames = Array.from(chainsFound).map((c) => this.getChainName(c));
    const totalProcessed = startIndex + coinsToProcess.length;
    const remaining = coins.length - totalProcessed;
    
    this.logger.log(`Import batch complete: ${created} created, ${skipped} skipped, ${errors} errors`);
    this.logger.log(`Total processed: ${totalProcessed}/${coins.length} coins`);
    this.logger.log(`Remaining: ${remaining} coins`);
    this.logger.log(`Chains found: ${chainNames.join(', ')}`);
    
    if (errorDetails.length > 0 && errorDetails.length <= 10) {
      this.logger.warn(`Sample errors: ${errorDetails.slice(0, 5).join('; ')}`);
    }

    // If there are remaining coins, log that the next batch will continue
    if (remaining > 0) {
      this.logger.log(`Next batch will start from index ${totalProcessed} (${remaining} coins remaining)`);
    } else {
      // Reset the index if all coins are processed
      await this.saveLastProcessedIndex(0);
      this.logger.log('All coins processed! Reset index for next full import.');
    }

    return { 
      created, 
      skipped, 
      errors, 
      chains: chainNames,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 20) : undefined, // Return first 20 errors
      processed: totalProcessed,
      remaining,
    };
  }
}

