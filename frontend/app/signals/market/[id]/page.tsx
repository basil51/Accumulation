'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import type { MarketSignal } from '@/lib/types';

type DetailedMarketSignal = MarketSignal & {
  evidence?: any;
  eventIds?: string[];
};

export default function MarketSignalPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const signalId =
    typeof idParam === 'string' ? idParam : Array.isArray(idParam) ? idParam[0] : '';

  const [signal, setSignal] = useState<DetailedMarketSignal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadSignal = async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getMarketSignal(id);
        setSignal(data as DetailedMarketSignal);
      } catch (err: any) {
        setError(err.message || 'Failed to load signal');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && signalId) {
      loadSignal(signalId);
    }
  }, [isAuthenticated, signalId]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
            Error loading signal
          </h1>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            {error}
          </p>
          <Link
            href="/signals"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to all signals
          </Link>
        </div>
      </div>
    );
  }

  if (!signal) {
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
                Market Signal Details
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
                  className="text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  All Signals
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 mb-3"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            {signal.coin.name} ({signal.coin.symbol})
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Type: {signal.signalType.replace('_', ' ')} • Chain:{' '}
            {signal.coin.chain || 'Unknown'} • Created at:{' '}
            {formatDateTime(signal.createdAt)}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Core Metrics */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              Core Metrics
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Score</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {signal.score}
                </dd>
              </div>
              {signal.details?.volume24h !== undefined && (
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    24h Volume
                  </dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(signal.details.volume24h)}
                  </dd>
                </div>
              )}
              {signal.details?.priceChange24h !== undefined && (
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    24h Price Change
                  </dt>
                  <dd
                    className={`font-medium ${
                      signal.details.priceChange24h >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {signal.details.priceChange24h >= 0 ? '+' : ''}
                    {signal.details.priceChange24h.toFixed(2)}%
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Evidence / Raw Data */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              Evidence & Raw Data
            </h3>
            {signal.evidence ? (
              <pre className="text-xs bg-zinc-950/5 dark:bg-black/40 text-zinc-700 dark:text-zinc-200 rounded-md p-3 overflow-x-auto max-h-80">
                {JSON.stringify(signal.evidence, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Detailed rule evidence will appear here when available.
              </p>
            )}
            {signal.eventIds && signal.eventIds.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Related Event IDs
                </h4>
                <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                  {signal.eventIds.map((id) => (
                    <li key={id} className="font-mono break-all">
                      {id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}


