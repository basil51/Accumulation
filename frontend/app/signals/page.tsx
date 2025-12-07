'use client';

import { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SignalsList } from '@/components/signals-list';
import { Navbar } from '@/components/navbar';
import type { QuerySignalsParams } from '@/lib/types';

type SignalTab = 'accumulation' | 'market';

export default function SignalsPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SignalTab>('accumulation');
  const [symbol, setSymbol] = useState('');
  const [minScore, setMinScore] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [signalType, setSignalType] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filters: QuerySignalsParams = useMemo(
    () => ({
      symbol: symbol || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      signalType: activeTab === 'market' && signalType ? signalType : undefined,
    }),
    [symbol, minScore, startDate, endDate, activeTab, signalType],
  );

  const handleResetFilters = () => {
    setSymbol('');
    setMinScore('');
    setStartDate('');
    setEndDate('');
    setSignalType('');
  };

  if (isLoading) {
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
      <Navbar
        title="All Signals"
        user={user || undefined}
        onLogout={handleLogout}
      />

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Signals Explorer
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Browse all accumulation and market signals with advanced filtering.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('accumulation')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'accumulation'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Accumulation Signals
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'market'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Market Signals
            </button>
          </nav>
        </div>

        {/* Filters */}
        <section className="mb-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-1">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. ETH, BTC, USDC"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Minimum Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  placeholder="e.g. 70"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {activeTab === 'market' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Signal Type
                  </label>
                  <input
                    type="text"
                    value={signalType}
                    onChange={(e) => setSignalType(e.target.value)}
                    placeholder="e.g. DEX_SWAP_SPIKE"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 md:flex-col md:w-40">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </section>

        {/* Signals List */}
        <SignalsList type={activeTab} initialLimit={18} filters={filters} />
      </main>
    </div>
  );
}


