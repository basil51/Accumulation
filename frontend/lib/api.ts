const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4007/api';

import type {
  AccumulationSignal,
  AlertItem,
  Coin,
  CoinSignalsByCoinResponse,
  MarketSignal,
  QuerySignalsParams,
  SignalsResponse,
  UserSettings,
  WatchlistItem,
  UpdateUserSettingsInput,
  NormalizedEvent,
  AdminUser,
  AdminUserDetail,
  AdminPayment,
  AdminAnalytics,
  FalsePositiveAnalytics,
  PaginatedResponse,
  PaymentStatus,
  SystemSettings,
  TokenSettings,
  Feedback,
  CreateFeedbackInput,
  UpdateFeedbackStatusInput,
} from './types';

type SubscriptionLevel = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';

export interface ApiError {
  message: string;
  statusCode?: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON, use status text
          errorData = { message: response.statusText || 'An error occurred' };
        }
        
        // NestJS returns error in message field
        const errorMessage = errorData.message || errorData.error || response.statusText;
        const error = new Error(errorMessage);
        (error as any).response = { data: errorData, status: response.status };
        
        // For 401/403, clear token as it's likely invalid
        if (response.status === 401 || response.status === 403) {
          this.removeToken();
        }
        
        throw error;
      }

      return await response.json();
    } catch (error) {
      // If it's already an ApiError, re-throw it
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }
      
      // Handle network errors or other fetch failures
      const networkError: ApiError = {
        message: error instanceof Error ? error.message : 'Network error. Please check your connection.',
        statusCode: 0,
      };
      
      throw networkError;
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  }

  removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Auth endpoints
  async register(email: string, password: string) {
    return this.request<{
      id: string;
      email: string;
      subscriptionLevel: string;
      createdAt: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        subscriptionLevel: string;
        subscriptionExpiry?: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      this.removeToken();
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    this.setToken(response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    return response;
  }

  async getCurrentUser() {
    return this.request<{
      id: string;
      email: string;
      role?: string;
      subscriptionLevel: string;
      subscriptionExpiry?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>('/auth/me', {
      method: 'GET',
    });
  }

  // Generic GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  // Generic POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Generic PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Generic DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Signals endpoints
  async getAccumulationSignals(params?: QuerySignalsParams) {
    const queryParams = new URLSearchParams();
    if (params?.coinId) queryParams.append('coinId', params.coinId);
    if (params?.symbol) queryParams.append('symbol', params.symbol);
    if (params?.minScore !== undefined)
      queryParams.append('minScore', params.minScore.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.get<SignalsResponse<AccumulationSignal>>(
      `/signals/accumulation${query ? `?${query}` : ''}`,
    );
  }

  async getMarketSignals(params?: QuerySignalsParams) {
    const queryParams = new URLSearchParams();
    if (params?.coinId) queryParams.append('coinId', params.coinId);
    if (params?.symbol) queryParams.append('symbol', params.symbol);
    if (params?.signalType)
      queryParams.append('signalType', params.signalType);
    if (params?.minScore !== undefined)
      queryParams.append('minScore', params.minScore.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit)
      queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.get<SignalsResponse<MarketSignal>>(
      `/signals/market${query ? `?${query}` : ''}`,
    );
  }

  async getAccumulationSignal(id: string) {
    return this.get<AccumulationSignal>(`/signals/accumulation/${id}`);
  }

  async getMarketSignal(id: string) {
    return this.get<MarketSignal>(`/signals/market/${id}`);
  }

  // Coin endpoints
  async getCoin(id: string) {
    return this.get<Coin>(`/coins/${id}`);
  }

  async searchCoinsBySymbol(symbol: string, chain?: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('symbol', symbol);
    if (chain) queryParams.append('chain', chain);
    return this.get<{ data: Coin[] }>(`/coins/search?${queryParams.toString()}`);
  }

  async getCoinsByChain(chain: string, page: number = 1, limit: number = 50) {
    const queryParams = new URLSearchParams();
    queryParams.append('chain', chain);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    return this.get<PaginatedResponse<Coin>>(`/coins?${queryParams.toString()}`);
  }

  async autocompleteCoins(query: string, chain?: string, limit: number = 10) {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    if (chain) queryParams.append('chain', chain);
    queryParams.append('limit', limit.toString());
    return this.get<{ data: Coin[] }>(`/coins/autocomplete?${queryParams.toString()}`);
  }

  async getAvailableChains() {
    return this.get<{ 
      data: { 
        chain: string; 
        coinCount: number;
        activeCount: number;
        famousCount: number;
        name?: string;
        isActive?: boolean;
      }[] 
    }>('/coins/chains');
  }

  async getActiveFamousCoins(chain: string, limit: number = 20) {
    const queryParams = new URLSearchParams();
    queryParams.append('chain', chain);
    queryParams.append('limit', limit.toString());
    return this.get<{ data: Coin[] }>(`/coins/active-famous?${queryParams.toString()}`);
  }

  async getSignalsByCoin(coinId: string, limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<CoinSignalsByCoinResponse>(
      `/signals/coin/${coinId}${query}`,
    );
  }

  // Watchlist endpoints
  async getWatchlist() {
    return this.get<{ data: WatchlistItem[] }>('/watchlist');
  }

  async addToWatchlist(input: {
    coinId: string;
    thresholdUsd?: number;
    thresholdPercentage?: number;
    notificationsEnabled?: boolean;
  }) {
    return this.post<WatchlistItem>('/watchlist', input);
  }

  async removeFromWatchlist(id: string) {
    return this.delete<{ message: string }>(`/watchlist/${id}`);
  }

  // Alerts endpoints
  async getAlerts(params?: { unread?: boolean; page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.unread !== undefined) {
      queryParams.append('unread', params.unread ? 'true' : 'false');
    }
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.get<{
      data: AlertItem[];
      meta: { total: number; unread: number; page: number; limit: number; totalPages: number };
    }>(`/alerts${query ? `?${query}` : ''}`);
  }

  async markAlertAsRead(id: string) {
    return this.put<{ message: string }>(`/alerts/${id}/read`);
  }

  async markAllAlertsAsRead() {
    return this.put<{ message: string }>(`/alerts/read-all`);
  }

  // Settings endpoints
  async getSettings() {
    return this.get<UserSettings>('/settings');
  }

  async updateSettings(input: UpdateUserSettingsInput) {
    return this.put<{ message: string; settings: UserSettings }>(
      '/settings',
      input,
    );
  }

  // Events endpoints
  async getCoinEvents(coinId: string, limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<{ data: NormalizedEvent[] }>(
      `/events/coin/${coinId}${query}`,
    );
  }

  // Admin endpoints
  async getAdminAnalytics() {
    return this.get<AdminAnalytics>('/admin/analytics');
  }

  async getFalsePositiveAnalytics(days: number = 30) {
    return this.get<FalsePositiveAnalytics>(`/admin/analytics/false-positives?days=${days}`);
  }

  async getAdminUsers(page: number = 1, limit: number = 50) {
    return this.get<PaginatedResponse<AdminUser>>(
      `/admin/users?page=${page}&limit=${limit}`,
    );
  }

  async getAdminUserById(userId: string) {
    return this.get<AdminUserDetail>(`/admin/users/${userId}`);
  }

  async updateUserSubscription(
    userId: string,
    subscriptionLevel: SubscriptionLevel,
    subscriptionExpiry?: string,
  ) {
    return this.put<AdminUser>(`/admin/users/${userId}/subscription`, {
      subscriptionLevel,
      subscriptionExpiry,
    });
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') {
    return this.put<AdminUser>(`/admin/users/${userId}/role`, { role });
  }

  async getAdminPayments(
    page: number = 1,
    limit: number = 50,
    status?: PaymentStatus,
  ) {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (status) queryParams.append('status', status);

    return this.get<PaginatedResponse<AdminPayment>>(
      `/admin/payments?${queryParams.toString()}`,
    );
  }

  async getAdminPaymentById(paymentId: string) {
    return this.get<AdminPayment>(`/admin/payments/${paymentId}`);
  }

  async approvePayment(paymentId: string) {
    return this.put<{ message: string; payment: AdminPayment }>(
      `/admin/payments/${paymentId}/approve`,
    );
  }

  async rejectPayment(paymentId: string, reason?: string) {
    return this.put<{ message: string; payment: AdminPayment }>(
      `/admin/payments/${paymentId}/reject`,
      { reason },
    );
  }

  // System Settings endpoints
  async getSystemSettings() {
    return this.get<SystemSettings>('/admin/settings');
  }

  async getSystemSetting(key: string) {
    return this.get<{ key: string; value: any; updatedAt: string; updatedBy?: string }>(
      `/admin/settings/${key}`,
    );
  }

  async updateSystemSetting(key: string, value: any) {
    return this.put<{ message: string; setting: any }>(
      `/admin/settings/${key}`,
      { value },
    );
  }

  async updateSystemSettings(settings: Record<string, any>) {
    return this.put<{ message: string; updated: number }>(
      '/admin/settings',
      settings,
    );
  }

  async initializeSystemSettings() {
    return this.post<{ message: string; created: number }>(
      '/admin/settings/initialize',
    );
  }

  // Admin Signals endpoints
  async getAdminSignals(
    page: number = 1,
    limit: number = 50,
    type?: 'accumulation' | 'market',
    falsePositive?: boolean,
  ) {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (type) queryParams.append('type', type);
    if (falsePositive !== undefined) queryParams.append('falsePositive', falsePositive.toString());

    return this.get<any>(`/admin/signals?${queryParams.toString()}`);
  }

  async markAccumulationSignalFalsePositive(signalId: string) {
    return this.put<any>(`/admin/signals/accumulation/${signalId}/false-positive`);
  }

  async markMarketSignalFalsePositive(signalId: string) {
    return this.put<any>(`/admin/signals/market/${signalId}/false-positive`);
  }

  // Admin Token Settings endpoints
  async getTokenSettings(page: number = 1, limit: number = 50) {
    return this.get<PaginatedResponse<TokenSettings>>(
      `/admin/token-settings?page=${page}&limit=${limit}`,
    );
  }

  async getTokenSettingsByCoin(coinId: string) {
    return this.get<TokenSettings>(`/admin/token-settings/${coinId}`);
  }

  async upsertTokenSettings(
    coinId: string,
    settings: {
      minLargeTransferUsd?: number;
      minUnits?: number;
      supplyPctSpecial?: number;
      liquidityRatioSpecial?: number;
    },
  ) {
    return this.put<TokenSettings>(`/admin/token-settings/${coinId}`, settings);
  }

  async deleteTokenSettings(coinId: string) {
    return this.delete<{ message: string }>(`/admin/token-settings/${coinId}`);
  }

  // Feedback endpoints
  async createFeedback(input: CreateFeedbackInput) {
    return this.post<Feedback>('/feedback', input);
  }

  async getUserFeedback(page: number = 1, limit: number = 20) {
    return this.get<PaginatedResponse<Feedback>>(`/feedback?page=${page}&limit=${limit}`);
  }

  async getFeedbackById(id: string) {
    return this.get<Feedback>(`/feedback/${id}`);
  }

  // Admin feedback endpoints
  async getAdminFeedback(page: number = 1, limit: number = 50, type?: string, status?: string) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    return this.get<PaginatedResponse<Feedback>>(`/feedback/admin/all?${params.toString()}`);
  }

  async getFeedbackStats() {
    return this.get<{
      total: number;
      byType: Record<string, number>;
      byStatus: Record<string, number>;
    }>('/feedback/admin/stats');
  }

  async updateFeedbackStatus(id: string, input: UpdateFeedbackStatusInput) {
    return this.put<Feedback>(`/feedback/admin/${id}/status`, input);
  }

  // Admin Coin Management endpoints
  async getAdminCoins(params?: {
    page?: number;
    limit?: number;
    chain?: string;
    isActive?: boolean;
    isFamous?: boolean;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.chain) queryParams.append('chain', params.chain);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.isFamous !== undefined) queryParams.append('isFamous', params.isFamous.toString());
    if (params?.search) queryParams.append('search', params.search);

    return this.get<PaginatedResponse<Coin>>(`/admin/coins?${queryParams.toString()}`);
  }

  async createCoin(data: {
    name: string;
    symbol: string;
    contractAddress?: string | null;
    chain: string;
    totalSupply?: number;
    circulatingSupply?: number;
    priceUsd?: number;
    liquidityUsd?: number;
    isActive?: boolean;
    isFamous?: boolean;
  }) {
    return this.post<Coin>('/admin/coins', data);
  }

  async deleteCoin(coinId: string) {
    return this.delete<{ message: string }>(`/admin/coins/${coinId}`);
  }

  async updateCoinStatus(coinId: string, data: { isActive?: boolean; isFamous?: boolean }) {
    return this.put<Coin>(`/admin/coins/${coinId}/status`, data);
  }

  async importCoinsFromCoinGecko(params?: { 
    limit?: number; 
    minMarketCap?: number; 
    batchSize?: number; 
    batchDelayMinutes?: number;
    reset?: boolean;
  }) {
    return this.post<{
      message: string;
      created: number;
      skipped: number;
      errors: number;
      chains: string[];
      errorDetails?: string[];
      processed: number;
      remaining: number;
    }>('/admin/coins/import-coingecko', params || {});
  }

  // Admin Chain Management endpoints
  async getAdminChains() {
    return this.get<{
      data: Array<{
        id: string;
        chain: string;
        name: string;
        isActive: boolean;
        coinCount: number;
        signalCount: number;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('/admin/chains');
  }

  async updateChainStatus(chain: string, data: { isActive: boolean }) {
    return this.put<{
      id: string;
      chain: string;
      name: string;
      isActive: boolean;
      coinCount: number;
      signalCount: number;
    }>(`/admin/chains/${chain}/status`, data);
  }

  async recalculateChainCoinCounts() {
    return this.post<{
      message: string;
      totalChains: number;
      updated: number;
      results: Array<{
        chain: string;
        name: string;
        oldCount: number;
        newCount: number;
        updated: boolean;
      }>;
    }>('/admin/chains/recalculate-counts');
  }

  async createChain(data: { chain: string; name: string; isActive?: boolean }) {
    return this.post<{
      id: string;
      chain: string;
      name: string;
      isActive: boolean;
      coinCount: number;
      signalCount: number;
    }>('/admin/chains', data);
  }

  async updateChain(chain: string, data: { name?: string; isActive?: boolean }) {
    return this.put<{
      id: string;
      chain: string;
      name: string;
      isActive: boolean;
      coinCount: number;
      signalCount: number;
    }>(`/admin/chains/${chain}`, data);
  }

  async deleteChain(chain: string) {
    return this.delete<{ message: string }>(`/admin/chains/${chain}`);
  }
}

export const api = new ApiClient();

