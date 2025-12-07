'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    {
      title: 'Welcome to Accumulation!',
      content: (
        <div className="space-y-4">
          <p className="text-zinc-600 dark:text-zinc-400">
            We'll help you get started in just a few steps. This wizard will guide you through:
          </p>
          <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
            <li>Understanding signals and how they work</li>
            <li>Adding your first coin to watchlist</li>
            <li>Configuring alerts</li>
            <li>Understanding subscription tiers</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Understanding Signals',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Accumulation Signals
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Detect when large amounts of tokens are being accumulated, indicating potential
              smart money movement.
            </p>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-3 text-sm">
              <strong>Score Range:</strong> 0-100
              <br />
              <strong>Alert Threshold:</strong> 75+ (high confidence)
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Market Signals
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Detect market anomalies like volume spikes, price movements, and DEX activity.
            </p>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-3 text-sm">
              <strong>Includes:</strong> Volume spikes, price anomalies, DEX swaps, LP changes
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Add Your First Coin',
      content: (
        <div className="space-y-4">
          <p className="text-zinc-600 dark:text-zinc-400">
            To start receiving alerts, add coins to your watchlist. You can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
            <li>Select from multiple chains (Ethereum, Polygon, Arbitrum, etc.)</li>
            <li>Search for coins by symbol</li>
            <li>Set custom thresholds for alerts</li>
            <li>Enable/disable notifications per coin</li>
          </ul>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Tip:</strong> Start with popular coins like ETH or BTC to see how signals work.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Configure Alerts',
      content: (
        <div className="space-y-4">
          <p className="text-zinc-600 dark:text-zinc-400">
            Customize your alert preferences in Settings:
          </p>
          <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
            <li><strong>Minimum Signal Score:</strong> Only receive alerts above this score (recommended: 65-75)</li>
            <li><strong>Cooldown Period:</strong> Time between alerts for the same coin (recommended: 30-60 minutes)</li>
            <li><strong>Email Notifications:</strong> Receive alerts via email</li>
            <li><strong>Telegram Notifications:</strong> Receive alerts via Telegram (requires setup)</li>
          </ul>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleAction = (action: string) => {
    onComplete();
    if (action === 'watchlist') {
      router.push('/watchlist');
    } else if (action === 'settings') {
      router.push('/settings');
    } else if (action === 'pricing') {
      router.push('/pricing');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {steps[currentStep - 1].title}
            </h2>
            <button
              onClick={handleSkip}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {steps[currentStep - 1].content}
        </div>

        {/* Actions */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-6">
          {currentStep === 1 && (
            <div className="flex gap-3">
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Get Started
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Skip
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex gap-3">
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Next
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Next
                </button>
              </div>
              <button
                onClick={() => handleAction('watchlist')}
                className="w-full px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
              >
                Go to Watchlist →
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Complete
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAction('settings')}
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                >
                  Configure Settings
                </button>
                <button
                  onClick={() => handleAction('pricing')}
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                >
                  View Pricing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

