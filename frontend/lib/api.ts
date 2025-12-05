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
  WatchlistItem,
} from './types';

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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
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
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw {
          message: error.message || 'An error occurred',
          statusCode: response.status,
        } as ApiError;
      }

      return await response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }
      throw {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      } as ApiError;
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
}

export const api = new ApiClient();

