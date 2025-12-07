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
  isActive?: boolean;
  isFamous?: boolean;
  signalCounts?: {
    accumulation: number;
    market: number;
    total: number;
  };
}

export interface AccumulationSignal {
  id: string;
  coinId: string;
  coin: Coin;
  score: number;
  amountUsd: number;
  amountUnits: number | null | undefined;
  supplyPercentage: number | null | undefined;
  liquidityRatio: number | null | undefined;
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
  symbol?: string;
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
  thresholdUsd?: number | null;
  thresholdPercentage?: number | null;
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

export interface NormalizedEvent {
  id: string;
  eventId: string;
  provider: string;
  chain: string;
  type: string;
  txHash: string;
  timestamp: string;
  blockNumber?: number | null;
  tokenContract: string;
  tokenSymbol?: string | null;
  tokenDecimals?: number | null;
  fromAddress: string;
  toAddress: string;
  amount: number;
  amountUsd?: number | null;
}


export interface UserSettings {
  thresholds: {
    overrideLargeTransferUsd: number | null;
    overrideMinUnits: number | null;
    overrideSupplyPct: number | null;
    useSystemDefaults: boolean;
  };
  alerts: {
    emailEnabled: boolean;
    telegramEnabled: boolean;
    telegramChatId: string | null;
    notificationsEnabled: boolean;
    minSignalScore: number;
    cooldownMinutes: number;
  };
  dashboard: {
    darkMode: boolean;
    rowsPerPage: number;
    timeWindow: string;
  };
  watchlistChains: string[];
}

export interface UpdateUserSettingsInput {
  thresholds?: {
    overrideLargeTransferUsd?: number | null;
    overrideMinUnits?: number | null;
    overrideSupplyPct?: number | null;
    useSystemDefaults?: boolean;
  };
  alerts?: {
    emailEnabled?: boolean;
    telegramEnabled?: boolean;
    telegramChatId?: string | null;
    notificationsEnabled?: boolean;
    minSignalScore?: number;
    cooldownMinutes?: number;
  };
  dashboard?: {
    darkMode?: boolean;
    rowsPerPage?: number;
    timeWindow?: string;
  };
  watchlistChains?: string[];
}

// Admin types
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export type PaymentNetwork = 'TRC20' | 'BEP20' | 'ERC20';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  subscriptionLevel: string;
  subscriptionExpiry?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUser {
  settings?: UserSettings | null;
  _count?: {
    payments: number;
    watchlist: number;
    alerts: number;
  };
}

export interface AdminPayment {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    subscriptionLevel: string;
  };
  amountUsdt: number;
  network: PaymentNetwork;
  txHash?: string | null;
  screenshotUrl?: string | null;
  status: PaymentStatus;
  createdAt: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeSubscriptions: number;
  pendingPayments: number;
  signalsToday: number;
  usersByRole: Record<UserRole, number>;
  subscriptionsByTier: Record<string, number>;
}

export interface FalsePositiveAnalytics {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  overall: {
    totalSignals: number;
    totalFalsePositives: number;
    falsePositiveRate: number;
  };
  byType: {
    accumulation: {
      total: number;
      falsePositives: number;
      rate: number;
    };
    market: {
      total: number;
      falsePositives: number;
      rate: number;
    };
  };
  byScoreRange: Array<{
    range: string;
    total: number;
    falsePositives: number;
    rate: number;
  }>;
  byCoin: Array<{
    coinId: string;
    coinName: string;
    coinSymbol: string;
    total: number;
    falsePositives: number;
    rate: number;
  }>;
  dailyTrends: Array<{
    date: string;
    total: number;
    falsePositives: number;
    rate: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// System Settings types
export interface SystemSettings {
  global_thresholds?: {
    large_transfer_usd: number;
    unit_threshold_default: number;
    supply_percentage_threshold: number;
    liquidity_ratio_threshold: number;
    exchange_outflow_threshold_usd: number;
    swap_spike_factor: number;
    lp_add_threshold_usd: number;
    candidate_signal_threshold: number;
    alert_signal_threshold: number;
  };
  ingestion?: {
    polling_interval_seconds: number;
    max_blocks_per_cycle: number;
    max_events_per_token_per_cycle: number;
    allow_historical_sync: boolean;
    historical_sync_days: number;
  };
  providers?: {
    alchemy?: {
      enabled: boolean;
      chains: string[];
      max_calls_per_min: number;
    };
    covalent?: {
      enabled: boolean;
      chains: string[];
      max_calls_per_min: number;
    };
    thegraph?: {
      enabled: boolean;
      subgraphs: string[];
      max_calls_per_min: number;
    };
    dexscreener?: {
      enabled: boolean;
      polling_interval_seconds: number;
    };
  };
  alerting?: {
    max_alerts_per_user_per_hour: number;
    global_alert_cooldown_minutes: number;
    telegram_enabled: boolean;
    email_enabled: boolean;
  };
  auto_tune?: {
    enabled: boolean;
    high_cap_usd: number;
    increase_threshold_large_transfer: number;
    increase_threshold_units: number;
  };
  [key: string]: any;
}

// Token Settings types
export interface TokenSettings {
  id: string;
  coinId: string;
  coin: {
    id: string;
    name: string;
    symbol: string;
    contractAddress: string;
    chain: string;
  };
  minLargeTransferUsd?: number | null;
  minUnits?: number | null;
  supplyPctSpecial?: number | null;
  liquidityRatioSpecial?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type FeedbackType = 'BUG_REPORT' | 'FEATURE_REQUEST' | 'UI_UX_FEEDBACK' | 'SIGNAL_QUALITY' | 'PERFORMANCE_ISSUE' | 'GENERAL';
export type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface Feedback {
  id: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    subscriptionLevel: string;
  };
  type: FeedbackType;
  category?: string | null;
  subject: string;
  message: string;
  metadata?: any;
  status: FeedbackStatus;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  type: FeedbackType;
  category?: string;
  subject: string;
  message: string;
  metadata?: any;
}

export interface UpdateFeedbackStatusInput {
  status: FeedbackStatus;
  adminNotes?: string;
}

