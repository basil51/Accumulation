'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { LoadingSpinner } from '@/components/loading-spinner';
import { FormField } from '@/components/form-field';
import { ErrorMessage } from '@/components/error-message';
import { SuccessMessage } from '@/components/success-message';
import type { WatchlistItem, Coin } from '@/lib/types';

export default function WatchlistPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    coinId?: string;
    thresholdUsd?: string;
    thresholdPercentage?: string;
  }>({});

  const [selectedChain, setSelectedChain] = useState<string>('');
  const [selectedCoinId, setSelectedCoinId] = useState('');
  const [coinSearchQuery, setCoinSearchQuery] = useState('');
  const [availableCoins, setAvailableCoins] = useState<Coin[]>([]);
  const [availableChains, setAvailableChains] = useState<{ 
    chain: string; 
    coinCount: number;
    activeCount: number;
    famousCount: number;
  }[]>([]);
  const [activeFamousCoins, setActiveFamousCoins] = useState<Coin[]>([]);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
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

  // Load available chains on mount
  useEffect(() => {
    const loadChains = async () => {
      try {
        const response = await api.getAvailableChains();
        setAvailableChains(response.data);
      } catch (err: any) {
        console.error('Failed to load chains:', err);
      }
    };
    loadChains();
  }, []);

  // Load coins when chain is selected
  useEffect(() => {
    if (!selectedChain) {
      setAvailableCoins([]);
      setActiveFamousCoins([]);
      setSelectedCoinId('');
      return;
    }

    const loadCoins = async () => {
      setIsLoadingCoins(true);
      try {
        // Load active/famous coins first
        const activeFamousResponse = await api.getActiveFamousCoins(selectedChain, 20);
        setActiveFamousCoins(activeFamousResponse.data);

        // Load all coins
        const response = await api.getCoinsByChain(selectedChain, 1, 100);
        setAvailableCoins(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load coins');
        setAvailableCoins([]);
        setActiveFamousCoins([]);
      } finally {
        setIsLoadingCoins(false);
      }
    };

    loadCoins();
  }, [selectedChain]);

  // Autocomplete coin search
  useEffect(() => {
    if (!coinSearchQuery || !selectedChain) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.autocompleteCoins(coinSearchQuery, selectedChain, 20);
        setAvailableCoins(response.data);
      } catch (err: any) {
        console.error('Autocomplete error:', err);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [coinSearchQuery, selectedChain]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!selectedChain) {
      errors.coinId = 'Please select a chain';
    } else if (!selectedCoinId) {
      errors.coinId = 'Please select a coin';
    }

    if (thresholdUsd && Number(thresholdUsd) < 0) {
      errors.thresholdUsd = 'Threshold must be a positive number';
    }

    if (thresholdPercentage) {
      const pct = Number(thresholdPercentage);
      if (pct < 0 || pct > 100) {
        errors.thresholdPercentage = 'Percentage must be between 0 and 100';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: {
        coinId: string;
        thresholdUsd?: number;
        thresholdPercentage?: number;
        notificationsEnabled?: boolean;
      } = {
        coinId: selectedCoinId,
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
      setSelectedChain('');
      setSelectedCoinId('');
      setCoinSearchQuery('');
      setThresholdUsd('');
      setThresholdPercentage('');
      setNotificationsEnabled(true);
      setSuccess('Coin added to watchlist successfully');
      setTimeout(() => setSuccess(null), 5000);
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
        <LoadingSpinner size="lg" text="Loading watchlist..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top Navigation */}
      <Navbar
        title="Watchlist"
        user={user || undefined}
        onLogout={handleLogout}
      />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Add to Watchlist Form */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Add Coin to Watchlist
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Select a chain and coin to add to your watchlist. Optional
            thresholds let you tune alert sensitivity per coin.
          </p>
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}
          {success && (
            <SuccessMessage
              message={success}
              onDismiss={() => setSuccess(null)}
              className="mb-4"
            />
          )}
          <form
            onSubmit={handleAdd}
            className="grid gap-4 md:grid-cols-5 md:items-end"
          >
            <FormField
              label="Chain"
              htmlFor="chain"
              required
              error={!selectedChain && validationErrors.coinId ? 'Please select a chain' : undefined}
              hint="Select the blockchain network"
            >
              <select
                id="chain"
                value={selectedChain}
                onChange={(e) => {
                  setSelectedChain(e.target.value);
                  setSelectedCoinId('');
                  setCoinSearchQuery('');
                  if (validationErrors.coinId) {
                    setValidationErrors((prev) => ({ ...prev, coinId: undefined }));
                  }
                }}
                required
                className={`w-full rounded-md border ${
                  !selectedChain && validationErrors.coinId
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-zinc-300 dark:border-zinc-700'
                } bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select chain...</option>
                {availableChains.map((chain) => (
                  <option key={chain.chain} value={chain.chain}>
                    {chain.chain} ({chain.coinCount} coins{chain.activeCount > 0 || chain.famousCount > 0 ? `, ${chain.activeCount} active, ${chain.famousCount} famous` : ''})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Coin"
              htmlFor="coin"
              required
              error={!selectedCoinId && validationErrors.coinId ? 'Please select a coin' : undefined}
              hint={selectedChain ? 'Search and select a coin' : 'Select a chain first'}
              className="md:col-span-2"
            >
              <div className="relative">
                <input
                  id="coin"
                  type="text"
                  value={coinSearchQuery}
                  onChange={(e) => {
                    setCoinSearchQuery(e.target.value);
                    if (validationErrors.coinId) {
                      setValidationErrors((prev) => ({ ...prev, coinId: undefined }));
                    }
                  }}
                  onFocus={() => {
                    if (!selectedChain) {
                      setValidationErrors((prev) => ({ ...prev, coinId: 'Please select a chain first' }));
                    }
                  }}
                  disabled={!selectedChain || isLoadingCoins}
                  placeholder={selectedChain ? 'Search coins...' : 'Select chain first'}
                  className={`w-full rounded-md border ${
                    !selectedCoinId && validationErrors.coinId
                      ? 'border-red-300 dark:border-red-700'
                      : 'border-zinc-300 dark:border-zinc-700'
                  } bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {isLoadingCoins && (
                  <div className="absolute right-3 top-2.5">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
                {!coinSearchQuery && selectedChain && activeFamousCoins.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                      Active & Famous Coins
                    </div>
                    {activeFamousCoins.map((coin) => (
                      <button
                        key={coin.id}
                        type="button"
                        onClick={() => {
                          setSelectedCoinId(coin.id);
                          setCoinSearchQuery(`${coin.symbol} - ${coin.name}`);
                          setValidationErrors((prev) => ({ ...prev, coinId: undefined }));
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {coin.symbol}
                              {coin.isFamous && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                                  Famous
                                </span>
                              )}
                              {coin.isActive && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{coin.name}</div>
                          </div>
                          {coin.signalCounts && (
                            <div className="text-xs text-zinc-400 dark:text-zinc-500">
                              {coin.signalCounts.total} signals
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {coinSearchQuery && availableCoins.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg max-h-60 overflow-auto">
                    {availableCoins.map((coin) => (
                      <button
                        key={coin.id}
                        type="button"
                        onClick={() => {
                          setSelectedCoinId(coin.id);
                          setCoinSearchQuery(`${coin.symbol} - ${coin.name}`);
                          setValidationErrors((prev) => ({ ...prev, coinId: undefined }));
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {coin.symbol}
                              {coin.isFamous && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                                  Famous
                                </span>
                              )}
                              {coin.isActive && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{coin.name}</div>
                          </div>
                          {coin.signalCounts && (
                            <div className="text-xs text-zinc-400 dark:text-zinc-500">
                              {coin.signalCounts.total} signals
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
            <FormField
              label="Threshold (USD)"
              htmlFor="thresholdUsd"
              error={validationErrors.thresholdUsd}
              hint="Optional: Minimum USD amount to trigger alerts"
            >
              <input
                id="thresholdUsd"
                type="number"
                min={0}
                step="0.01"
                value={thresholdUsd}
                onChange={(e) => {
                  setThresholdUsd(e.target.value);
                  if (validationErrors.thresholdUsd) {
                    setValidationErrors((prev) => ({ ...prev, thresholdUsd: undefined }));
                  }
                }}
                placeholder="Optional"
                className={`w-full rounded-md border ${
                  validationErrors.thresholdUsd
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-zinc-300 dark:border-zinc-700'
                } bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </FormField>
            <FormField
              label="Threshold (% of supply)"
              htmlFor="thresholdPercentage"
              error={validationErrors.thresholdPercentage}
              hint="Optional: Percentage of supply (0-100)"
            >
              <input
                id="thresholdPercentage"
                type="number"
                min={0}
                max={100}
                step="0.0001"
                value={thresholdPercentage}
                onChange={(e) => {
                  setThresholdPercentage(e.target.value);
                  if (validationErrors.thresholdPercentage) {
                    setValidationErrors((prev) => ({ ...prev, thresholdPercentage: undefined }));
                  }
                }}
                placeholder="Optional"
                className={`w-full rounded-md border ${
                  validationErrors.thresholdPercentage
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-zinc-300 dark:border-zinc-700'
                } bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </FormField>
            <div className="md:col-span-5 flex items-center justify-between gap-4 pt-2">
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
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Adding...
                  </>
                ) : (
                  'Add to Watchlist'
                )}
              </button>
            </div>
          </form>
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
                        {item.thresholdUsd != null
                          ? `$${item.thresholdUsd.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200">
                        {item.thresholdPercentage != null
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


