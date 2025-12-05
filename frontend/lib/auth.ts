import { api } from './api';

export interface User {
  id: string;
  email: string;
  subscriptionLevel: string;
  subscriptionExpiry?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const auth = {
  async login(email: string, password: string) {
    const response = await api.login(email, password);
    return response.user;
  },

  async register(email: string, password: string) {
    return await api.register(email, password);
  },

  async logout() {
    await api.logout();
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

