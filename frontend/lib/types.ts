export interface Coin {
  id: string;
  name: string;
  symbol: string;
  contractAddress?: string;
  chain?: string;
  totalSupply?: number;
  circulatingSupply?: number;
  priceUsd?: number;
  liquidityUsd?: number;
}

export interface AccumulationSignal {
  id: string;
  coinId: string;
  coin: Coin;
  score: number;
  amountUsd: number;
  amountUnits: number;
  supplyPercentage: number;
  liquidityRatio: number;
  createdAt: string;
}

export interface MarketSignal {
  id: string;
  coinId: string;
  coin: Coin;
  signalType: string;
  score: number;
  details?: {
    volume24h?: number;
    priceChange24h?: number;
    [key: string]: any;
  };
  createdAt: string;
}

export interface SignalsResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface QuerySignalsParams {
  coinId?: string;
  minScore?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  signalType?: string;
}

export interface CoinSignalsByCoinResponse {
  accumulationSignals: AccumulationSignal[];
  marketSignals: MarketSignal[];
}

export interface WatchlistItem {
  id: string;
  coin: Coin;
  thresholdUsd?: number;
  thresholdPercentage?: number;
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface AlertItem {
  id: string;
  signalType: 'market' | 'accumulation';
  signalId: string;
  title: string;
  message: string;
  coin?: Coin | null;
  score: number;
  read: boolean;
  createdAt: string;
}



