import Link from 'next/link';
import type { AccumulationSignal, MarketSignal } from '@/lib/types';

interface SignalCardProps {
  signal: AccumulationSignal | MarketSignal;
  type: 'accumulation' | 'market';
}

export function SignalCard({ signal, type }: SignalCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (score >= 65) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '$0.00';
    }
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (type === 'accumulation') {
    const accSignal = signal as AccumulationSignal;
    return (
      <Link
        href={`/signals/accumulation/${accSignal.id}`}
        className="block bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {accSignal.coin.name} ({accSignal.coin.symbol})
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {accSignal.coin.chain || 'Unknown Chain'}
            </p>
          </div>
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${getScoreColor(
              accSignal.score,
            )}`}
          >
            {accSignal.score}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Amount</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatCurrency(accSignal.amountUsd)}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Supply %</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {accSignal.supplyPercentage != null
                ? `${accSignal.supplyPercentage.toFixed(3)}%`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Units</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {accSignal.amountUnits != null
                ? accSignal.amountUnits.toLocaleString()
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Liquidity Ratio</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {accSignal.liquidityRatio != null
                ? `${accSignal.liquidityRatio.toFixed(2)}x`
                : 'N/A'}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatDate(accSignal.createdAt)}
          </p>
        </div>
      </Link>
    );
  }

  const marketSignal = signal as MarketSignal;
  return (
    <Link
      href={`/signals/market/${marketSignal.id}`}
      className="block bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {marketSignal.coin.name} ({marketSignal.coin.symbol})
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
            {(marketSignal.signalType?.replace('_', ' ') ?? 'market signal')}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${getScoreColor(
            marketSignal.score,
          )}`}
        >
          {marketSignal.score}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {marketSignal.details?.volume24h !== undefined && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">24h Volume</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatCurrency(marketSignal.details.volume24h)}
            </p>
          </div>
        )}
        {marketSignal.details?.priceChange24h !== undefined && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">24h Change</p>
            <p
              className={`font-medium ${
                marketSignal.details.priceChange24h >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {marketSignal.details.priceChange24h >= 0 ? '+' : ''}
              {marketSignal.details.priceChange24h.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatDate(marketSignal.createdAt)}
        </p>
      </div>
    </Link>
  );
}

