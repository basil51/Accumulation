'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type { WatchlistItem } from '@/lib/types';

export default function WatchlistPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [coinId, setCoinId] = useState('');
  const [thresholdUsd, setThresholdUsd] = useState('');
  const [thresholdPercentage, setThresholdPercentage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadWatchlist = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getWatchlist();
        setItems(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load watchlist');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadWatchlist();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: {
        coinId: string;
        thresholdUsd?: number;
        thresholdPercentage?: number;
        notificationsEnabled?: boolean;
      } = {
        coinId,
        notificationsEnabled,
      };

      if (thresholdUsd) {
        payload.thresholdUsd = Number(thresholdUsd);
      }
      if (thresholdPercentage) {
        payload.thresholdPercentage = Number(thresholdPercentage);
      }

      const created = await api.addToWatchlist(payload);
      setItems((prev) => [created, ...prev]);
      setCoinId('');
      setThresholdUsd('');
      setThresholdPercentage('');
      setNotificationsEnabled(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add to watchlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.removeFromWatchlist(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to remove from watchlist', err);
    }
  };

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Watchlist
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
                  className="text-sm font-medium text-blue-600 dark:text-blue-400"
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Add to Watchlist Form */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Add Coin to Watchlist
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Paste a coin ID from the dashboard or coin details page. Optional
            thresholds let you tune alert sensitivity per coin.
          </p>
          <form
            onSubmit={handleAdd}
            className="grid gap-4 md:grid-cols-4 md:items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Coin ID
              </label>
              <input
                type="text"
                value={coinId}
                onChange={(e) => setCoinId(e.target.value)}
                required
                placeholder="clx123..."
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Threshold (USD)
              </label>
              <input
                type="number"
                min={0}
                value={thresholdUsd}
                onChange={(e) => setThresholdUsd(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Threshold (% of supply)
              </label>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={thresholdPercentage}
                onChange={(e) => setThresholdPercentage(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-4 flex items-center justify-between gap-4 pt-2">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                Enable alerts for this coin
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add to Watchlist'}
              </button>
            </div>
          </form>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </section>

        {/* Watchlist Items */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Your Watchlist
          </h2>
          {items.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Your watchlist is empty. Add a coin above to start tracking it.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                      Coin
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                      Chain
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                      Threshold USD
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                      Threshold %
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                      Alerts
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                      Added
                    </th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <Link
                          href={`/coins/${item.coin.id}`}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.coin.name}{' '}
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            ({item.coin.symbol})
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {item.coin.chain || 'Unknown'}
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200">
                        {item.thresholdUsd !== undefined
                          ? `$${item.thresholdUsd.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200">
                        {item.thresholdPercentage !== undefined
                          ? `${item.thresholdPercentage.toFixed(4)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.notificationsEnabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {item.notificationsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


