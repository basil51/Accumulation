import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Navigation */}
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Accumulation
              </h1>
            </div>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            Real-Time Crypto Accumulation
            <br />
            <span className="text-blue-600 dark:text-blue-400">Detection Platform</span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8">
            Track whale movements, detect accumulation patterns, and get real-time alerts
            across Ethereum, Polygon, Arbitrum, Base, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 text-lg font-medium text-zinc-900 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Powerful Features for Crypto Traders
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Everything you need to track smart money and detect accumulation patterns
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Real-Time Detection
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Get instant alerts when large accumulations are detected. Monitor whale movements
              across all major chains in real-time.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Multi-Chain Support
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Track accumulation across Ethereum, Polygon, Arbitrum, Base, BSC, Avalanche,
              and more. One platform for all chains.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Smart Alerts
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Customize alert thresholds and receive notifications via email or Telegram.
              Never miss important accumulation events.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Accurate Scoring
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Advanced detection engine with 9+ rules and confidence scoring. Filter out
              false positives and focus on high-quality signals.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Custom Watchlists
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Create watchlists for your favorite coins. Set custom thresholds and get
              alerts when accumulation patterns are detected.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Market Intelligence
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              DEX activity analysis, liquidity changes, volume spikes, and price anomalies.
              Comprehensive market insights in one place.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white dark:bg-zinc-900 border-t border-b border-zinc-200 dark:border-zinc-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Simple steps to start tracking accumulation patterns
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Sign Up
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Create your free account in seconds. No credit card required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Add to Watchlist
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Select coins you want to track. Choose from multiple chains.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Get Alerts
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Receive real-time alerts when accumulation patterns are detected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Choose the plan that fits your trading needs
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Free */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Free</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">$0</span>
              <span className="text-zinc-600 dark:text-zinc-400">/month</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              <li>• Delayed signals (15-30 min)</li>
              <li>• Top 10 trending coins</li>
              <li>• 1 watchlist coin</li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Get Started
            </Link>
          </div>

          {/* Basic */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-blue-600 dark:border-blue-400 rounded-lg p-6 relative">
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
              Popular
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Basic</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">$19</span>
              <span className="text-zinc-600 dark:text-zinc-400">/month</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              <li>• Real-time alerts</li>
              <li>• Whale alerts (&gt;$10k)</li>
              <li>• 10 watchlist coins</li>
              <li>• Full market overview</li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Start Trial
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Pro</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">$49</span>
              <span className="text-zinc-600 dark:text-zinc-400">/month</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              <li>• All accumulation alerts</li>
              <li>• Full whale tracking</li>
              <li>• 25 watchlist coins</li>
              <li>• DEX & LP analytics</li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Start Trial
            </Link>
          </div>

          {/* Premium */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Premium</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">$99</span>
              <span className="text-zinc-600 dark:text-zinc-400">/month</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              <li>• Unlimited detection</li>
              <li>• Smart Money tracking</li>
              <li>• 50 watchlist coins</li>
              <li>• Full Wallet Explorer</li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Start Trial
            </Link>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            View detailed pricing →
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-900 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start Tracking Accumulation?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join traders who are already using Accumulation to detect smart money movements
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition-colors"
          >
            Get Started Free
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
                <li><a href="/THRESHOLD_TUNING_GUIDE.md" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-50">Tuning Guide</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="/settings" className="hover:text-zinc-900 dark:hover:text-zinc-50">Feedback</Link></li>
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
