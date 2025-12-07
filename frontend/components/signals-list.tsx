'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { SignalCard } from './signal-card';
import { LoadingSpinner } from './loading-spinner';
import type {
  AccumulationSignal,
  MarketSignal,
  QuerySignalsParams,
} from '@/lib/types';

interface SignalsListProps {
  type: 'accumulation' | 'market';
  initialLimit?: number;
  filters?: QuerySignalsParams;
}

export function SignalsList({
  type,
  initialLimit = 10,
  filters,
}: SignalsListProps) {
  const [signals, setSignals] = useState<
    (AccumulationSignal | MarketSignal)[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  useEffect(() => {
    // Reset to first page when type or filters change
    setPage(1);
  }, [type, JSON.stringify(filters)]);

  useEffect(() => {
    loadSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, JSON.stringify(filters)]);

  const loadSignals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseParams: QuerySignalsParams = {
        ...(filters || {}),
        page,
        limit: initialLimit,
      };

      const response =
        type === 'accumulation'
          ? await api.getAccumulationSignals(baseParams)
          : await api.getMarketSignals(baseParams);

      setSignals(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to load signals');
      console.error('Error loading signals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && signals.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading signals..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={loadSignals}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600 dark:text-zinc-400">
          No {type} signals found.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} type={type} />
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing {signals.length} of {meta.total} signals
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.totalPages}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

