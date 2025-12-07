import Link from "next/link";

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    priceUsdt: '0 USDT',
    description: 'Great for exploring the platform with delayed data.',
    features: [
      '15–30 min delayed market signals',
      'Top 10 trending coins',
      'Limited market overview',
      '1 watchlist coin',
      'No whale or accumulation alerts',
    ],
    highlighted: false,
  },
  {
    id: 'BASIC',
    name: 'Basic',
    price: '$19',
    priceUsdt: '~19 USDT',
    description: 'Real-time basic alerts for active beginners.',
    features: [
      'Real-time accumulation alerts (low sensitivity)',
      'Whale alerts > $10k',
      'Full market overview',
      'Access to coin details pages',
      'Up to 10 watchlist coins',
      'Basic DEX swap insights',
      'Limited LP alerts',
    ],
    highlighted: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$49',
    priceUsdt: '~49 USDT',
    description: 'Best balance for serious traders using signals daily.',
    features: [
      'All accumulation alerts (medium + high sensitivity)',
      'Full whale tracking > $5k + smart money clusters',
      'Real-time DEX swap analysis',
      'LP add/remove alerts',
      'Market signals (price anomalies, volume spikes)',
      'Up to 25 watchlist coins',
      'Wallet Explorer (limited)',
      'Priority data refresh',
    ],
    highlighted: false,
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: '$99',
    priceUsdt: '~99 USDT',
    description: 'Full analytics suite for desks and power users.',
    features: [
      'Unlimited accumulation detection',
      'Full whale analytics (all thresholds)',
      'Smart Money tracking',
      'Multi-chain aggregation',
      'Up to 50 watchlist coins',
      'Full Wallet Explorer',
      'Early access to new features',
      'Full market intelligence dashboard',
      'Liquidity, swaps, new pools detection',
      'Priority support',
    ],
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Navigation */}
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Accumulation
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Choose the plan that fits your trading needs. All plans paid in USDT.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-zinc-900 border rounded-lg p-6 relative ${
                plan.highlighted
                  ? 'border-2 border-blue-600 dark:border-blue-400'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    {plan.price}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">/month</span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                  {plan.priceUsdt}
                </p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                {plan.description}
              </p>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.id === 'FREE' ? '/signup' : '/signup'}
                className={`block w-full text-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  plan.highlighted
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                {plan.id === 'FREE' ? 'Get Started' : 'Start Trial'}
              </Link>
            </div>
          ))}
        </div>

        {/* Payment Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-12">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            Payment Information
          </h3>
          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              • All subscriptions are paid in <strong>USDT</strong> (Tether)
            </p>
            <p>
              • Supported networks: <strong>TRC20</strong> (recommended, low fees), <strong>BEP20</strong>, <strong>ERC20</strong>
            </p>
            <p>
              • After payment, upload your transaction hash and screenshot for verification
            </p>
            <p>
              • Subscriptions activate within 24 hours after admin approval
            </p>
            <p>
              • All subscriptions are monthly and auto-renew
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Yes! You can upgrade or downgrade your subscription at any time. Changes take effect
                immediately.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                What happens after my subscription expires?
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Your account will automatically downgrade to the Free tier. You'll retain access to
                delayed signals and basic features.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Yes! The Free tier is available to all users. You can explore the platform with
                delayed signals before upgrading.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                How do I pay?
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                After signing up, go to the Subscription page, select your plan, and follow the
                instructions to send USDT. Upload your transaction proof for verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join traders tracking smart money movements across all major chains
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition-colors"
          >
            Sign Up Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Accumulation</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Real-time crypto accumulation detection and whale tracking platform.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-zinc-50">Pricing</Link></li>
                <li><Link href="/signup" className="hover:text-zinc-900 dark:hover:text-zinc-50">Sign Up</Link></li>
                <li><Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-50">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><a href="/USER_ONBOARDING.md" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-50">User Guide</a></li>
                <li><a href="/BETA_TESTING_GUIDE.md" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-50">Beta Guide</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><a href="mailto:support@accumulation.com" className="hover:text-zinc-900 dark:hover:text-zinc-50">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-600 dark:text-zinc-400">
            © 2025 Accumulation. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

