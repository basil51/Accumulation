'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type { UserSettings, FeedbackType, CreateFeedbackInput } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { FormField } from '@/components/form-field';
import { ErrorMessage } from '@/components/error-message';
import { SuccessMessage } from '@/components/success-message';

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('GENERAL');
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleChange = <K extends keyof UserSettings>(
    section: K,
    field: keyof UserSettings[K],
    value: any,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value,
      },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        thresholds: {
          overrideLargeTransferUsd:
            settings.thresholds.overrideLargeTransferUsd,
          overrideMinUnits: settings.thresholds.overrideMinUnits,
          overrideSupplyPct: settings.thresholds.overrideSupplyPct,
          useSystemDefaults: settings.thresholds.useSystemDefaults,
        },
        alerts: {
          emailEnabled: settings.alerts.emailEnabled,
          telegramEnabled: settings.alerts.telegramEnabled,
          telegramChatId: settings.alerts.telegramChatId,
          notificationsEnabled: settings.alerts.notificationsEnabled,
          minSignalScore: settings.alerts.minSignalScore,
          cooldownMinutes: settings.alerts.cooldownMinutes,
        },
        dashboard: {
          darkMode: settings.dashboard.darkMode,
          rowsPerPage: settings.dashboard.rowsPerPage,
          timeWindow: settings.dashboard.timeWindow,
        },
        watchlistChains: settings.watchlistChains,
      };

      const response = await api.updateSettings(payload);
      setSettings(response.settings);
      setSuccess('Settings saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading || !settings) {
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
        title="Settings"
        user={user || undefined}
        onLogout={handleLogout}
      />

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            Personal Settings
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Control how sensitive your alerts are and how the dashboard behaves.
          </p>
        </header>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-700 dark:text-emerald-400">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Alert Preferences */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Alert Preferences
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Control when and how you receive alerts for high-confidence
                  signals.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
                <span className="text-sm text-zinc-800 dark:text-zinc-100">
                  Enable email alerts
                </span>
                <input
                  type="checkbox"
                  checked={settings.alerts.emailEnabled}
                  onChange={(e) =>
                    handleChange('alerts', 'emailEnabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
                <span className="text-sm text-zinc-800 dark:text-zinc-100">
                  Enable Telegram alerts
                </span>
                <input
                  type="checkbox"
                  checked={settings.alerts.telegramEnabled}
                  onChange={(e) =>
                    handleChange('alerts', 'telegramEnabled', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={settings.alerts.telegramChatId ?? ''}
                  onChange={(e) =>
                    handleChange('alerts', 'telegramChatId', e.target.value)
                  }
                  placeholder="Optional"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Used to deliver alerts via your Telegram bot integration.
                </p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
                <span className="text-sm text-zinc-800 dark:text-zinc-100">
                  Enable all notifications
                </span>
                <input
                  type="checkbox"
                  checked={settings.alerts.notificationsEnabled}
                  onChange={(e) =>
                    handleChange(
                      'alerts',
                      'notificationsEnabled',
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Minimum signal score for alerts
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.alerts.minSignalScore}
                  onChange={(e) =>
                    handleChange(
                      'alerts',
                      'minSignalScore',
                      Number(e.target.value) || 0,
                    )
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Higher scores mean fewer, higher-confidence alerts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Cooldown between alerts (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.alerts.cooldownMinutes}
                  onChange={(e) =>
                    handleChange(
                      'alerts',
                      'cooldownMinutes',
                      Number(e.target.value) || 0,
                    )
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Prevents alert spam by enforcing a per-user cooldown window.
                </p>
              </div>
            </div>
          </section>

          {/* Threshold Overrides */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Threshold Overrides
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Fine-tune how sensitive the detection engine is for your
                  account.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={settings.thresholds.useSystemDefaults}
                  onChange={(e) =>
                    handleChange(
                      'thresholds',
                      'useSystemDefaults',
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                Use system defaults
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Large transfer threshold (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={
                    settings.thresholds.overrideLargeTransferUsd ?? ''
                  }
                  onChange={(e) =>
                    handleChange(
                      'thresholds',
                      'overrideLargeTransferUsd',
                      e.target.value === ''
                        ? null
                        : Number(e.target.value),
                    )
                  }
                  disabled={settings.thresholds.useSystemDefaults}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  placeholder="System default"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Minimum units transferred
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.thresholds.overrideMinUnits ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'thresholds',
                      'overrideMinUnits',
                      e.target.value === ''
                        ? null
                        : Number(e.target.value),
                    )
                  }
                  disabled={settings.thresholds.useSystemDefaults}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  placeholder="System default"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Supply percentage threshold (%)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={settings.thresholds.overrideSupplyPct ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'thresholds',
                      'overrideSupplyPct',
                      e.target.value === ''
                        ? null
                        : Number(e.target.value),
                    )
                  }
                  disabled={settings.thresholds.useSystemDefaults}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  placeholder="System default"
                />
              </div>
            </div>
          </section>

          {/* Dashboard Preferences */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Dashboard Preferences
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Personalize how the dashboard looks and how much data is
                  shown.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
                <span className="text-sm text-zinc-800 dark:text-zinc-100">
                  Enable dark mode
                </span>
                <input
                  type="checkbox"
                  checked={settings.dashboard.darkMode}
                  onChange={(e) =>
                    handleChange('dashboard', 'darkMode', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Rows per page
                </label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={settings.dashboard.rowsPerPage}
                  onChange={(e) =>
                    handleChange(
                      'dashboard',
                      'rowsPerPage',
                      Number(e.target.value) || 10,
                    )
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Default time window
                </label>
                <select
                  value={settings.dashboard.timeWindow}
                  onChange={(e) =>
                    handleChange('dashboard', 'timeWindow', e.target.value)
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1h">Last 1 hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Feedback Section */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Send Feedback
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Help us improve the platform by sharing your feedback, reporting bugs, or suggesting features.
            </p>
          </div>

          {feedbackError && <ErrorMessage message={feedbackError} />}
          {feedbackSuccess && <SuccessMessage message={feedbackSuccess} />}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
                setFeedbackError('Please fill in all required fields');
                return;
              }

              setIsSubmittingFeedback(true);
              setFeedbackError(null);
              setFeedbackSuccess(null);

              try {
                const input: CreateFeedbackInput = {
                  type: feedbackType,
                  category: feedbackCategory || undefined,
                  subject: feedbackSubject.trim(),
                  message: feedbackMessage.trim(),
                  metadata: {
                    browser: typeof window !== 'undefined' ? navigator.userAgent : undefined,
                    timestamp: new Date().toISOString(),
                  },
                };

                await api.createFeedback(input);
                setFeedbackSuccess('Thank you! Your feedback has been submitted.');
                setFeedbackSubject('');
                setFeedbackMessage('');
                setFeedbackCategory('');
                setFeedbackType('GENERAL');
              } catch (err: any) {
                setFeedbackError(err.message || 'Failed to submit feedback');
              } finally {
                setIsSubmittingFeedback(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Feedback Type"
                required
              >
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                >
                  <option value="GENERAL">General Feedback</option>
                  <option value="BUG_REPORT">Bug Report</option>
                  <option value="FEATURE_REQUEST">Feature Request</option>
                  <option value="UI_UX_FEEDBACK">UI/UX Feedback</option>
                  <option value="SIGNAL_QUALITY">Signal Quality</option>
                  <option value="PERFORMANCE_ISSUE">Performance Issue</option>
                </select>
              </FormField>

              <FormField
                label="Category (optional)"
              >
                <input
                  type="text"
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  placeholder="e.g., Dashboard, Alerts, Signals"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                />
              </FormField>
            </div>

            <FormField
              label="Subject"
              required
            >
              <input
                type="text"
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
                placeholder="Brief summary of your feedback"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                required
              />
            </FormField>

            <FormField
              label="Message"
              required
            >
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Please provide details about your feedback, bug report, or feature request..."
                rows={6}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                required
              />
            </FormField>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}


