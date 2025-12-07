'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    const token = api.getToken();
    if (token) {
      // Fetch user info from the backend
      api.getCurrentUser()
        .then((user) => {
          setUser(user);
          setIsLoading(false);
        })
        .catch((error) => {
          // Token might be invalid, expired, or backend unavailable
          // Log error details for debugging (only in development)
          if (process.env.NODE_ENV === 'development') {
            const errorDetails = {
              message: error?.message || error?.toString() || 'Unknown error',
              statusCode: error?.statusCode,
              name: error?.name,
              stack: error?.stack,
              token: token ? 'present' : 'missing',
            };
            console.error('Failed to fetch user:', errorDetails);
          }
          // Clear invalid token silently (user will need to login again)
          api.removeToken();
          setUser(null);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await api.register(email, password);
      // Auto-login after registration
      await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (error) {
      // Even if API call fails, clear local state
      setUser(null);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

