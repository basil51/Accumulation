'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { SignalsList } from '@/components/signals-list';
import { Navbar } from '@/components/navbar';
import { OnboardingWizard } from '@/components/onboarding-wizard';

export default function DashboardPage() {
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'accumulation' | 'market'>(
    'accumulation',
  );
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user should see onboarding (new users or first visit)
  useEffect(() => {
    if (user && isAuthenticated) {
      // Check localStorage to see if onboarding was completed
      const onboardingCompleted = localStorage.getItem('onboarding_completed');
      
      // Show onboarding if not completed and user just signed up (check if they have no watchlist items)
      if (!onboardingCompleted) {
        // For now, show onboarding on first dashboard visit
        // In production, you could check user.createdAt or watchlist count
        setShowOnboarding(true);
      }
    }
  }, [user, isAuthenticated]);

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
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('onboarding_completed', 'true');
          }}
        />
      )}

      <Navbar
        title="Accumulation Dashboard"
        user={user || undefined}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Recent Signals
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Latest accumulation and market signals detected across all chains
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
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

        {/* Signals List */}
        <SignalsList type={activeTab} initialLimit={12} />
      </main>
    </div>
  );
}

