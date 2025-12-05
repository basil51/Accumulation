'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type { Coin } from '@/lib/types';
import { SignalsList } from '@/components/signals-list';

export default function CoinDetailsPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const coinId =
    typeof idParam === 'string' ? idParam : Array.isArray(idParam) ? idParam[0] : '';

  const [coin, setCoin] = useState<Coin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadCoin = async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getCoin(id);
        setCoin(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load coin details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && coinId) {
      loadCoin(coinId);
    }
  }, [isAuthenticated, coinId]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toLocaleString();
  };

  const shortenAddress = (address?: string) => {
    if (!address) return 'N/A';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h1 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Error loading coin
          </h1>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!coin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Coin Details
              </h1>
              <nav className="hidden md:flex gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/signals"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  All Signals
                </Link>
                <Link
                  href="/watchlist"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Watchlist
                </Link>
                <Link
                  href="/alerts"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Alerts
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {user?.email}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded">
                {user?.subscriptionLevel}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 mb-3"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            {coin.name} ({coin.symbol})
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Chain: {coin.chain || 'Unknown'} • Contract:{' '}
            <span className="font-mono">{shortenAddress(coin.contractAddress)}</span>
          </p>
        </div>

        {/* Coin Metrics */}
        <section className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Price (USD)
            </p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(coin.priceUsd)}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Liquidity (USD)
            </p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(coin.liquidityUsd)}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Circulating Supply
            </p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatNumber(coin.circulatingSupply)}
            </p>
          </div>
        </section>

        {/* Signals for this coin */}
        <section className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Accumulation Signals
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Recent accumulation signals detected for this coin.
            </p>
            <SignalsList type="accumulation" initialLimit={9} filters={{ coinId }} />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Market Signals
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Recent market activity and trend signals for this coin.
            </p>
            <SignalsList type="market" initialLimit={9} filters={{ coinId }} />
          </div>
        </section>
      </main>
    </div>
  );
}


