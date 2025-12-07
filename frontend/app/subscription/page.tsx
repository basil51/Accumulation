'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    description: 'Great for exploring the platform with delayed data.',
    features: [
      '15–30 min delayed market signals',
      'Top 10 trending coins',
      'Limited market overview',
      '1 watchlist coin',
      'No whale or accumulation alerts',
    ],
  },
  {
    id: 'BASIC',
    name: 'Basic',
    price: '$19 / month',
    description: 'Real-time basic alerts for active beginners.',
    features: [
      'Real-time accumulation alerts (low sensitivity)',
      'Whale alerts > $10k',
      'Full market overview',
      'Up to 10 watchlist coins',
      'Basic DEX swap insights',
    ],
    highlighted: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$49 / month',
    description: 'Best balance for serious traders using signals daily.',
    features: [
      'All accumulation alerts (medium + high sensitivity)',
      'Full whale tracking > $5k',
      'Real-time DEX swap analysis',
      'LP add/remove alerts',
      'Up to 25 watchlist coins',
      'Wallet Explorer (limited)',
    ],
    highlighted: true,
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: '$99 / month',
    description: 'Full analytics suite for desks and power users.',
    features: [
      'Unlimited accumulation detection',
      'Full whale analytics & smart money tracking',
      'Multi-chain aggregation',
      'Up to 50 watchlist coins',
      'Full Wallet Explorer',
      'Priority support & early features',
    ],
    highlighted: false,
  },
];

const USDT_NETWORKS = ['TRC20', 'BEP20', 'ERC20'] as const;

export default function SubscriptionPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'PRO' | 'PREMIUM'>(
    'PRO',
  );
  const [network, setNetwork] = useState<(typeof USDT_NETWORKS)[number]>('TRC20');
  const [txHash, setTxHash] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(
      'USDT payment upload UI is ready. Backend payment processing will be implemented in the dedicated payments sprint (see Sprint 6/9).',
    );
  };

  const formatExpiry = (expiry?: string) => {
    if (!expiry) return 'No expiry (Free tier)';
    const d = new Date(expiry);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired =
    user.subscriptionLevel !== 'FREE' &&
    user.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) < new Date();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top Navigation */}
      <Navbar
        title="Subscription"
        user={user || undefined}
        onLogout={handleLogout}
      />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Current subscription status */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Current Subscription
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You are currently on the{' '}
              <span className="font-semibold">{user.subscriptionLevel}</span> tier.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Expiry:{' '}
              <span className="font-medium">
                {formatExpiry(user.subscriptionExpiry || undefined)}
              </span>
              {isExpired && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/20 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
                  Expired
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">
              USDT-only payments (Binance)
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">
              Manual approval by admin
            </span>
          </div>
        </section>

        {/* Plan selection */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Choose Your Plan
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              All paid plans are billed monthly in USDT. You can always upgrade later.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => {
              const isCurrent =
                plan.id === user.subscriptionLevel ||
                (plan.id === 'FREE' && user.subscriptionLevel === 'FREE');
              const isSelectable = plan.id !== 'FREE';

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() =>
                    isSelectable && setSelectedPlan(plan.id as 'BASIC' | 'PRO' | 'PREMIUM')
                  }
                  className={`flex flex-col rounded-lg border p-4 text-left transition-colors ${
                    plan.highlighted
                      ? 'border-blue-500/70 bg-blue-50/40 dark:border-blue-500/60 dark:bg-blue-900/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  } ${
                    isSelectable && selectedPlan === plan.id
                      ? 'ring-2 ring-blue-500'
                      : ''
                  } ${
                    !isSelectable ? 'cursor-default' : 'hover:border-blue-400 dark:hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {plan.name}
                    </h3>
                    {plan.highlighted && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {plan.description}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    {isCurrent ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Current plan
                      </span>
                    ) : isSelectable ? (
                      <span>
                        Click to select{' '}
                        {selectedPlan === plan.id ? '(selected)' : ''}
                      </span>
                    ) : (
                      <span>Default tier</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* USDT payment upload (UI only for now) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              USDT Payment (Manual Approval)
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Send USDT to the address below, then upload your payment proof. An admin
              will review and activate your subscription for 30 days.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmitPayment}
            className="grid gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:grid-cols-2"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Selected plan
                </label>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {selectedPlan}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  You can change the plan above before sending payment.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  USDT Network
                </label>
                <select
                  value={network}
                  onChange={(e) =>
                    setNetwork(e.target.value as (typeof USDT_NETWORKS)[number])
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {USDT_NETWORKS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  USDT Wallet Address (Binance)
                </label>
                <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
                  <span className="font-mono text-xs text-zinc-800 dark:text-zinc-100 truncate">
                    TYourBinanceTRC20Address
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Use the correct network (TRC20/BEP20/ERC20) when sending USDT.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Transaction hash (optional but recommended)
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste your TX hash if available"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Upload payment screenshot
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setScreenshot(e.target.files?.[0] ?? null)
                  }
                  className="block w-full text-xs text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-blue-700"
                />
                {screenshot && (
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Selected: {screenshot.name}
                  </p>
                )}
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                After backend payment endpoints are implemented, this form will create
                a pending payment record and upload your proof for admin review.
              </p>

              <button
                type="submit"
                className="mt-1 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save Payment Details (UI Only)
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}


