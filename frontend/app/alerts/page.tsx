'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type { AlertItem } from '@/lib/types';

export default function AlertsPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    unread: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadAlerts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getAlerts({
          unread: unreadOnly ? true : undefined,
          page,
          limit: 20,
        });
        setAlerts(response.data);
        setMeta(response.meta);
      } catch (err: any) {
        setError(err.message || 'Failed to load alerts');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadAlerts();
    }
  }, [isAuthenticated, page, unreadOnly]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleToggleUnreadOnly = () => {
    setPage(1);
    setUnreadOnly((prev) => !prev);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markAlertAsRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true } : a)),
      );
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              unread: Math.max(0, prev.unread - 1),
            }
          : prev,
      );
    } catch (err) {
      console.error('Failed to mark alert as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.markAllAlertsAsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              unread: 0,
            }
          : prev,
      );
    } catch (err) {
      console.error('Failed to mark all alerts as read', err);
    } finally {
      setIsMarkingAll(false);
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
                Alerts
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
                  className="text-sm font-medium text-blue-600 dark:text-blue-400"
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Your Alerts
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Alerts are generated when watchlisted coins trigger high-confidence
              signals.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={handleToggleUnreadOnly}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
              />
              Show unread only
            </label>
            <button
              type="button"
              disabled={isMarkingAll || (meta?.unread ?? 0) === 0}
              onClick={handleMarkAllRead}
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMarkingAll ? 'Marking...' : 'Mark all as read'}
            </button>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {alerts.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {unreadOnly
              ? 'You have no unread alerts.'
              : 'No alerts yet. Alerts will appear here when your watchlisted coins trigger significant signals.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => {
              const isAccumulation = alert.signalType === 'accumulation';
              const signalHref = isAccumulation
                ? `/signals/accumulation/${alert.signalId}`
                : `/signals/market/${alert.signalId}`;

              return (
                <li
                  key={alert.id}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    alert.read
                      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                      : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isAccumulation
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                          }`}
                        >
                          {isAccumulation ? 'Accumulation' : 'Market'}
                        </span>
                        {alert.coin && (
                          <Link
                            href={`/coins/${alert.coin.id}`}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {alert.coin.name}{' '}
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              ({alert.coin.symbol})
                            </span>
                          </Link>
                        )}
                      </div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {alert.title}
                      </p>
                      <p className="text-zinc-700 dark:text-zinc-300">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>Score: {alert.score}</span>
                        <span>Created: {formatDateTime(alert.createdAt)}</span>
                        <Link
                          href={signalHref}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View signal
                        </Link>
                      </div>
                    </div>
                    {!alert.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(alert.id)}
                        className="self-start text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Page {meta.page} of {meta.totalPages} • Unread:{' '}
              <span className="font-medium">{meta.unread}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


