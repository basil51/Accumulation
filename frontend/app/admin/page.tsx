'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/loading-spinner';
import type {
  AdminAnalytics,
  AdminUser,
  AdminPayment,
  PaymentStatus,
  SystemSettings,
  TokenSettings,
  PaginatedResponse,
  Coin,
  FalsePositiveAnalytics,
} from '@/lib/types';

export default function AdminPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatus | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'settings' | 'signals' | 'token-settings' | 'false-positives' | 'coin-management' | 'chain-management'>(
    'overview',
  );
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [signals, setSignals] = useState<any[]>([]);
  const [signalsPage, setSignalsPage] = useState(1);
  const [signalsType, setSignalsType] = useState<'accumulation' | 'market' | 'all'>('all');
  const [signalsFalsePositiveFilter, setSignalsFalsePositiveFilter] = useState<boolean | undefined>(undefined);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [tokenSettings, setTokenSettings] = useState<TokenSettings[]>([]);
  const [tokenSettingsPage, setTokenSettingsPage] = useState(1);
  const [tokenSettingsLoading, setTokenSettingsLoading] = useState(false);
  const [editingTokenSettings, setEditingTokenSettings] = useState<string | null>(null);
  const [tokenSettingsForm, setTokenSettingsForm] = useState<{
    minLargeTransferUsd?: string;
    minUnits?: string;
    supplyPctSpecial?: string;
    liquidityRatioSpecial?: string;
  }>({});
  const [showAddTokenSettingsModal, setShowAddTokenSettingsModal] = useState(false);
  const [newTokenSettingsChain, setNewTokenSettingsChain] = useState('');
  const [newTokenSettingsCoinSearch, setNewTokenSettingsCoinSearch] = useState('');
  const [newTokenSettingsCoins, setNewTokenSettingsCoins] = useState<any[]>([]);
  const [newTokenSettingsSelectedCoinId, setNewTokenSettingsSelectedCoinId] = useState('');
  const [newTokenSettingsForm, setNewTokenSettingsForm] = useState<{
    minLargeTransferUsd?: string;
    minUnits?: string;
    supplyPctSpecial?: string;
    liquidityRatioSpecial?: string;
  }>({});
  const [availableChains, setAvailableChains] = useState<{ 
    chain: string; 
    coinCount: number;
    activeCount: number;
    famousCount: number;
    name?: string;
    isActive?: boolean;
  }[]>([]);
  const [isLoadingNewTokenCoins, setIsLoadingNewTokenCoins] = useState(false);
  const [falsePositiveAnalytics, setFalsePositiveAnalytics] = useState<FalsePositiveAnalytics | null>(null);
  const [falsePositiveAnalyticsLoading, setFalsePositiveAnalyticsLoading] = useState(false);
  const [falsePositiveAnalyticsDays, setFalsePositiveAnalyticsDays] = useState(30);
  
  // Coin Management state
  const [coins, setCoins] = useState<Coin[]>([]);
  const [coinsPage, setCoinsPage] = useState(1);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [coinsFilter, setCoinsFilter] = useState<{
    chain?: string;
    isActive?: boolean;
    isFamous?: boolean;
    search?: string;
  }>({});
  const [showAddCoinModal, setShowAddCoinModal] = useState(false);
  const [showEditCoinModal, setShowEditCoinModal] = useState(false);
  const [editingCoinId, setEditingCoinId] = useState<string | null>(null);
  const [newCoinForm, setNewCoinForm] = useState<{
    name: string;
    symbol: string;
    contractAddress: string;
    chain: string;
    totalSupply?: string;
    circulatingSupply?: string;
    priceUsd?: string;
    liquidityUsd?: string;
    isActive: boolean;
    isFamous: boolean;
  }>({
    name: '',
    symbol: '',
    contractAddress: '',
    chain: '',
    isActive: false,
    isFamous: false,
  });
  const [editCoinForm, setEditCoinForm] = useState<{
    name: string;
    symbol: string;
    contractAddress: string;
    chain: string;
    totalSupply?: string;
    circulatingSupply?: string;
    priceUsd?: string;
    liquidityUsd?: string;
    isActive: boolean;
    isFamous: boolean;
  }>({
    name: '',
    symbol: '',
    contractAddress: '',
    chain: '',
    isActive: false,
    isFamous: false,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: number;
    chains?: string[];
    errorDetails?: string[];
    processed?: number;
    remaining?: number;
  } | null>(null);
  const [importLimit, setImportLimit] = useState(1000);
  const [resetProgress, setResetProgress] = useState(false);
  const [chains, setChains] = useState<Array<{
    id: string;
    chain: string;
    name: string;
    isActive: boolean;
    coinCount: number;
    signalCount: number;
  }>>([]);
  const [chainsLoading, setChainsLoading] = useState(false);
  
  // Chain Management state
  const [showAddChainModal, setShowAddChainModal] = useState(false);
  const [editingChain, setEditingChain] = useState<string | null>(null);
  const [newChainForm, setNewChainForm] = useState<{
    chain: string;
    name: string;
    isActive: boolean;
  }>({
    chain: '',
    name: '',
    isActive: true,
  });
  const [editChainForm, setEditChainForm] = useState<{
    name: string;
    isActive: boolean;
  }>({
    name: '',
    isActive: true,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    if (!authLoading && user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated && user) {
      loadData();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [analyticsData, usersData, paymentsData] = await Promise.all([
        api.getAdminAnalytics().catch(() => null),
        api.getAdminUsers(usersPage, 10).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
        api
          .getAdminPayments(paymentsPage, 10, paymentStatusFilter)
          .catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      ]);

      if (analyticsData) setAnalytics(analyticsData);
      if (usersData) setUsers(usersData.data);
      if (paymentsData) setPayments(paymentsData.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      setSettingsLoading(true);
      const settings = await api.getSystemSettings();
      setSystemSettings(settings);
    } catch (err: any) {
      setError(err.message || 'Failed to load system settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadTokenSettings = useCallback(async () => {
    try {
      setTokenSettingsLoading(true);
      const response = await api.getTokenSettings(tokenSettingsPage, 20);
      setTokenSettings(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load token settings');
    } finally {
      setTokenSettingsLoading(false);
    }
  }, [tokenSettingsPage]);

  const loadCoins = useCallback(async () => {
    setCoinsLoading(true);
    try {
      const response = await api.getAdminCoins({
        page: coinsPage,
        limit: 50,
        ...coinsFilter,
      });
      setCoins(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load coins');
    } finally {
      setCoinsLoading(false);
    }
  }, [coinsPage, coinsFilter]);

  const handleCreateCoin = async () => {
    if (!newCoinForm.name || !newCoinForm.symbol || !newCoinForm.chain) {
      setError('Please fill in all required fields (Name, Symbol, and Chain)');
      return;
    }

    try {
      const payload: any = {
        name: newCoinForm.name,
        symbol: newCoinForm.symbol,
        contractAddress: newCoinForm.contractAddress?.trim() || null, // Optional - null for native coins
        chain: newCoinForm.chain,
        isActive: newCoinForm.isActive,
        isFamous: newCoinForm.isFamous,
      };

      if (newCoinForm.totalSupply) payload.totalSupply = Number(newCoinForm.totalSupply);
      if (newCoinForm.circulatingSupply) payload.circulatingSupply = Number(newCoinForm.circulatingSupply);
      if (newCoinForm.priceUsd) payload.priceUsd = Number(newCoinForm.priceUsd);
      if (newCoinForm.liquidityUsd) payload.liquidityUsd = Number(newCoinForm.liquidityUsd);

      await api.createCoin(payload);
      setShowAddCoinModal(false);
      setNewCoinForm({
        name: '',
        symbol: '',
        contractAddress: '',
        chain: '',
        isActive: false,
        isFamous: false,
      });
      loadCoins();
    } catch (err: any) {
      setError(err.message || 'Failed to create coin');
    }
  };

  const handleUpdateCoinStatus = async (coinId: string, data: { isActive?: boolean; isFamous?: boolean }) => {
    try {
      await api.updateCoinStatus(coinId, data);
      loadCoins();
    } catch (err: any) {
      setError(err.message || 'Failed to update coin status');
    }
  };

  const handleDeleteCoin = async (coinId: string) => {
    if (!confirm('Are you sure you want to delete this coin? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteCoin(coinId);
      loadCoins();
    } catch (err: any) {
      setError(err.message || 'Failed to delete coin');
    }
  };

  const handleEditCoin = (coin: Coin) => {
    setEditingCoinId(coin.id);
    setEditCoinForm({
      name: coin.name || '',
      symbol: coin.symbol || '',
      contractAddress: coin.contractAddress || '',
      chain: coin.chain || '',
      totalSupply: coin.totalSupply?.toString() || '',
      circulatingSupply: coin.circulatingSupply?.toString() || '',
      priceUsd: coin.priceUsd?.toString() || '',
      liquidityUsd: coin.liquidityUsd?.toString() || '',
      isActive: coin.isActive || false,
      isFamous: coin.isFamous || false,
    });
    setShowEditCoinModal(true);
  };

  const handleUpdateCoin = async () => {
    if (!editingCoinId || !editCoinForm.name || !editCoinForm.symbol || !editCoinForm.chain) {
      setError('Please fill in all required fields (Name, Symbol, and Chain)');
      return;
    }

    try {
      const payload: any = {
        name: editCoinForm.name,
        symbol: editCoinForm.symbol,
        contractAddress: editCoinForm.contractAddress?.trim() || null,
        chain: editCoinForm.chain,
        isActive: editCoinForm.isActive,
        isFamous: editCoinForm.isFamous,
      };

      if (editCoinForm.totalSupply) payload.totalSupply = Number(editCoinForm.totalSupply);
      if (editCoinForm.circulatingSupply) payload.circulatingSupply = Number(editCoinForm.circulatingSupply);
      if (editCoinForm.priceUsd) payload.priceUsd = Number(editCoinForm.priceUsd);
      if (editCoinForm.liquidityUsd) payload.liquidityUsd = Number(editCoinForm.liquidityUsd);

      await api.updateCoin(editingCoinId, payload);
      setShowEditCoinModal(false);
      setEditingCoinId(null);
      setEditCoinForm({
        name: '',
        symbol: '',
        contractAddress: '',
        chain: '',
        isActive: false,
        isFamous: false,
      });
      loadCoins();
    } catch (err: any) {
      setError(err.message || 'Failed to update coin');
    }
  };

  const loadChains = useCallback(async () => {
    setChainsLoading(true);
    try {
      const response = await api.getAdminChains();
      setChains(response.data);
    } catch (err: any) {
      console.error('Failed to load chains:', err);
    } finally {
      setChainsLoading(false);
    }
  }, []);

  const handleCreateChain = async () => {
    if (!newChainForm.chain || !newChainForm.name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError(null);
      await api.createChain({
        chain: newChainForm.chain.trim(),
        name: newChainForm.name.trim(),
        isActive: newChainForm.isActive,
      });
      setShowAddChainModal(false);
      setNewChainForm({
        chain: '',
        name: '',
        isActive: true,
      });
      loadChains();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create chain';
      setError(errorMessage);
      console.error('Error creating chain:', err);
    }
  };

  const handleUpdateChain = async (chain: string) => {
    if (!editChainForm.name) {
      setError('Chain name is required');
      return;
    }

    try {
      await api.updateChain(chain, editChainForm);
      setEditingChain(null);
      setEditChainForm({
        name: '',
        isActive: true,
      });
      loadChains();
    } catch (err: any) {
      setError(err.message || 'Failed to update chain');
    }
  };

  const handleDeleteChain = async (chain: string, chainName: string) => {
    if (!confirm(`Are you sure you want to delete chain "${chainName}" (${chain})? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteChain(chain);
      loadChains();
    } catch (err: any) {
      setError(err.message || 'Failed to delete chain');
    }
  };

  const startEditChain = (chain: { chain: string; name: string; isActive: boolean }) => {
    setEditingChain(chain.chain);
    setEditChainForm({
      name: chain.name,
      isActive: chain.isActive,
    });
  };

  const handleImportFromCoinGecko = async () => {
    const batchSize = 50;
    const batchDelayMinutes = 5;
    const batches = Math.ceil(importLimit / batchSize);
    const totalTime = batches * batchDelayMinutes; // Approximate time in minutes
    
    const message = resetProgress 
      ? `This will RESET progress and import up to ${importLimit} coins from CoinGecko in batches of ${batchSize}.\n\nEach batch takes ~${batchDelayMinutes} minutes, total time: ~${totalTime} minutes.\n\nContinue?`
      : `This will import the next batch of ${batchSize} coins from CoinGecko (continuing from where we left off).\n\nThis batch will take ~${batchDelayMinutes} minutes.\n\nContinue?`;
    
    if (!confirm(message)) {
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const result = await api.importCoinsFromCoinGecko({
        limit: importLimit,
        minMarketCap: 25000,
        batchSize: batchSize,
        batchDelayMinutes: batchDelayMinutes,
        reset: resetProgress,
      });
      setImportResult(result);
      setResetProgress(false); // Reset the flag after use
      // Reload coins and chains after import
      setTimeout(() => {
        loadCoins();
        loadChains();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to import coins from CoinGecko');
    } finally {
      setIsImporting(false);
    }
  };

  const loadFalsePositiveAnalytics = useCallback(async () => {
    try {
      setFalsePositiveAnalyticsLoading(true);
      const data = await api.getFalsePositiveAnalytics(falsePositiveAnalyticsDays);
      setFalsePositiveAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load false positive analytics');
    } finally {
      setFalsePositiveAnalyticsLoading(false);
    }
  }, [falsePositiveAnalyticsDays]);

  // Helper function to get threshold information
  const getThresholdInfo = (key: string) => {
    const info: Record<string, { label: string; description: string; recommended?: string; step?: number; min?: number; max?: number }> = {
      large_transfer_usd: {
        label: 'Large Transfer USD',
        description: 'Minimum USD value for large transfer detection (Rule A)',
        recommended: '$10,000 - $500,000',
        min: 1000,
        max: 10000000,
      },
      unit_threshold_default: {
        label: 'Unit Threshold Default',
        description: 'Minimum units for low-price token detection (Rule B)',
        recommended: '10,000 - 1,000,000',
        min: 1000,
        max: 100000000,
      },
      supply_percentage_threshold: {
        label: 'Supply Percentage Threshold',
        description: 'Minimum % of circulating supply (Rule C)',
        recommended: '0.01% - 0.5%',
        step: 0.0001,
        min: 0.0001,
        max: 10,
      },
      liquidity_ratio_threshold: {
        label: 'Liquidity Ratio Threshold',
        description: 'Minimum % of token liquidity (Rule D)',
        recommended: '0.005 - 0.05',
        step: 0.0001,
        min: 0.0001,
        max: 1,
      },
      exchange_outflow_threshold_usd: {
        label: 'Exchange Outflow Threshold USD',
        description: 'Minimum USD for exchange outflow detection (Rule F)',
        recommended: '$50,000 - $500,000',
        min: 10000,
        max: 10000000,
      },
      swap_spike_factor: {
        label: 'Swap Spike Factor',
        description: 'Multiplier for DEX swap volume spike detection (Rule G)',
        recommended: '2.0 - 5.0',
        step: 0.1,
        min: 1,
        max: 10,
      },
      lp_add_threshold_usd: {
        label: 'LP Add Threshold USD',
        description: 'Minimum USD for LP addition detection (Rule H)',
        recommended: '$5,000 - $50,000',
        min: 1000,
        max: 1000000,
      },
      candidate_signal_threshold: {
        label: 'Candidate Signal Threshold',
        description: 'Minimum score for candidate signals (shown in dashboard)',
        recommended: '55 - 70',
        min: 0,
        max: 100,
      },
      alert_signal_threshold: {
        label: 'Alert Signal Threshold',
        description: 'Minimum score for alert-level signals (users get notified)',
        recommended: '70 - 85',
        min: 0,
        max: 100,
      },
    };

    return info[key] || {
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: '',
    };
  };

  useEffect(() => {
    if (activeTab === 'settings' && !systemSettings) {
      loadSystemSettings();
    }
    if (activeTab === 'signals') {
      loadSignals();
    }
    if (activeTab === 'token-settings') {
      loadTokenSettings();
    }
    if (activeTab === 'false-positives') {
      loadFalsePositiveAnalytics();
    }
    if (activeTab === 'coin-management') {
      loadCoins();
      loadChains();
      // Also load available chains for the dropdown
      if (availableChains.length === 0) {
        api.getAvailableChains()
          .then((response) => setAvailableChains(response.data))
          .catch((err) => console.error('Failed to load available chains:', err));
      }
    }
    if (activeTab === 'chain-management') {
      loadChains();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, signalsPage, signalsType, signalsFalsePositiveFilter, coinsPage, coinsFilter, loadTokenSettings, loadFalsePositiveAnalytics]);

  // Load available chains when modal opens
  useEffect(() => {
    if ((showAddTokenSettingsModal || showAddCoinModal || showEditCoinModal) && availableChains.length === 0) {
      const loadChains = async () => {
        try {
          const response = await api.getAvailableChains();
          setAvailableChains(response.data);
        } catch (err: any) {
          console.error('Failed to load chains:', err);
        }
      };
      loadChains();
    }
  }, [showAddTokenSettingsModal, showAddCoinModal, showEditCoinModal, availableChains.length]);

  // Load coins when chain is selected
  useEffect(() => {
    if (!newTokenSettingsChain) {
      setNewTokenSettingsCoins([]);
      setNewTokenSettingsSelectedCoinId('');
      return;
    }

    const loadCoins = async () => {
      setIsLoadingNewTokenCoins(true);
      try {
        const response = await api.getCoinsByChain(newTokenSettingsChain, 1, 100);
        setNewTokenSettingsCoins(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load coins');
        setNewTokenSettingsCoins([]);
      } finally {
        setIsLoadingNewTokenCoins(false);
      }
    };

    loadCoins();
  }, [newTokenSettingsChain]);

  // Autocomplete coin search
  useEffect(() => {
    if (!newTokenSettingsCoinSearch || !newTokenSettingsChain) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.autocompleteCoins(newTokenSettingsCoinSearch, newTokenSettingsChain, 20);
        setNewTokenSettingsCoins(response.data);
      } catch (err: any) {
        console.error('Autocomplete error:', err);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [newTokenSettingsCoinSearch, newTokenSettingsChain]);

  const loadSignals = async () => {
    try {
      setSignalsLoading(true);
      const type = signalsType === 'all' ? undefined : signalsType;
      const response = await api.getAdminSignals(signalsPage, 20, type, signalsFalsePositiveFilter);
      
      if (type) {
        setSignals(response.data || []);
      } else {
        // Combine both types
        const combined = [
          ...(response.data?.accumulation || []).map((s: any) => ({ ...s, _type: 'accumulation' })),
          ...(response.data?.market || []).map((s: any) => ({ ...s, _type: 'market' })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSignals(combined);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load signals');
    } finally {
      setSignalsLoading(false);
    }
  };

  const handleSaveTokenSettings = async (coinId: string) => {
    try {
      const payload: {
        minLargeTransferUsd?: number;
        minUnits?: number;
        supplyPctSpecial?: number;
        liquidityRatioSpecial?: number;
      } = {};

      if (tokenSettingsForm.minLargeTransferUsd) {
        payload.minLargeTransferUsd = Number(tokenSettingsForm.minLargeTransferUsd);
      }
      if (tokenSettingsForm.minUnits) {
        payload.minUnits = Number(tokenSettingsForm.minUnits);
      }
      if (tokenSettingsForm.supplyPctSpecial) {
        payload.supplyPctSpecial = Number(tokenSettingsForm.supplyPctSpecial);
      }
      if (tokenSettingsForm.liquidityRatioSpecial) {
        payload.liquidityRatioSpecial = Number(tokenSettingsForm.liquidityRatioSpecial);
      }

      await api.upsertTokenSettings(coinId, payload);
      setEditingTokenSettings(null);
      setTokenSettingsForm({});
      loadTokenSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save token settings');
    }
  };

  const handleDeleteTokenSettings = async (coinId: string) => {
    if (!confirm('Are you sure you want to reset token settings to system defaults?')) {
      return;
    }
    try {
      await api.deleteTokenSettings(coinId);
      loadTokenSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete token settings');
    }
  };

  const handleSaveNewTokenSettings = async () => {
    if (!newTokenSettingsSelectedCoinId) {
      setError('Please select a coin');
      return;
    }

    try {
      const payload: {
        minLargeTransferUsd?: number;
        minUnits?: number;
        supplyPctSpecial?: number;
        liquidityRatioSpecial?: number;
      } = {};

      if (newTokenSettingsForm.minLargeTransferUsd) {
        payload.minLargeTransferUsd = Number(newTokenSettingsForm.minLargeTransferUsd);
      }
      if (newTokenSettingsForm.minUnits) {
        payload.minUnits = Number(newTokenSettingsForm.minUnits);
      }
      if (newTokenSettingsForm.supplyPctSpecial) {
        payload.supplyPctSpecial = Number(newTokenSettingsForm.supplyPctSpecial);
      }
      if (newTokenSettingsForm.liquidityRatioSpecial) {
        payload.liquidityRatioSpecial = Number(newTokenSettingsForm.liquidityRatioSpecial);
      }

      await api.upsertTokenSettings(newTokenSettingsSelectedCoinId, payload);
      setShowAddTokenSettingsModal(false);
      setNewTokenSettingsChain('');
      setNewTokenSettingsCoinSearch('');
      setNewTokenSettingsSelectedCoinId('');
      setNewTokenSettingsForm({});
      setNewTokenSettingsCoins([]);
      loadTokenSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save token settings');
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadData();
    }
  }, [usersPage, paymentsPage, paymentStatusFilter]);

  const handleApprovePayment = async (paymentId: string) => {
    if (!confirm('Approve this payment and upgrade user subscription?')) return;

    try {
      await api.approvePayment(paymentId);
      await loadData(); // Reload data
    } catch (err: any) {
      alert(err.message || 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      await api.rejectPayment(paymentId, reason || undefined);
      await loadData(); // Reload data
    } catch (err: any) {
      alert(err.message || 'Failed to reject payment');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN') => {
    if (!confirm(`Change user role to ${newRole}?`)) return;

    try {
      await api.updateUserRole(userId, newRole);
      await loadData(); // Reload data
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleMarkFalsePositive = async (signalId: string, type: 'accumulation' | 'market') => {
    if (!confirm('Mark this signal as false positive? This action cannot be undone.')) return;

    try {
      if (type === 'accumulation') {
        await api.markAccumulationSignalFalsePositive(signalId);
      } else {
        await api.markMarketSignalFalsePositive(signalId);
      }
      await loadSignals(); // Reload signals
    } catch (err: any) {
      alert(err.message || 'Failed to mark signal as false positive');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-600 dark:text-red-400">
          Access denied. Admin privileges required.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Admin Panel
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
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Alerts
                </Link>
                <Link
                  href="/subscription"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Subscription
                </Link>
                <Link
                  href="/settings"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Settings
                </Link>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  Admin
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {user.email}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded">
                {user.role}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Admin Overview
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage users, payments, and view platform analytics.
          </p>
        </header>

        {/* Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'payments'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('signals')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'signals'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Signals
            </button>
            <button
              onClick={() => setActiveTab('token-settings')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'token-settings'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Token Settings
            </button>
            <button
              onClick={() => setActiveTab('false-positives')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'false-positives'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              False Positives
            </button>
            <button
              onClick={() => setActiveTab('coin-management')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'coin-management'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Coin Management
            </button>
            <button
              onClick={() => setActiveTab('chain-management')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'chain-management'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              Chain Management
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Total Users
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {analytics.totalUsers}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Active Subscriptions
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {analytics.activeSubscriptions}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Pending Payments
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {analytics.pendingPayments}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Signals Today
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {analytics.signalsToday}
              </p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Subscription
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {u.subscriptionLevel}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUserRole(
                              u.id,
                              e.target.value as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
                            )
                          }
                          className="px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <button
                onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                disabled={usersPage === 1}
                className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {usersPage}
              </span>
              <button
                onClick={() => setUsersPage(usersPage + 1)}
                className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentStatusFilter(undefined)}
                className={`px-3 py-1 text-sm rounded ${
                  paymentStatusFilter === undefined
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPaymentStatusFilter('PENDING')}
                className={`px-3 py-1 text-sm rounded ${
                  paymentStatusFilter === 'PENDING'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setPaymentStatusFilter('CONFIRMED')}
                className={`px-3 py-1 text-sm rounded ${
                  paymentStatusFilter === 'CONFIRMED'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setPaymentStatusFilter('REJECTED')}
                className={`px-3 py-1 text-sm rounded ${
                  paymentStatusFilter === 'REJECTED'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Rejected
              </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Network
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                          {payment.user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(payment.amountUsdt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {payment.network}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              payment.status === 'CONFIRMED'
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                : payment.status === 'REJECTED'
                                  ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                                  : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {payment.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprovePayment(payment.id)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPayment(payment.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <button
                  onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))}
                  disabled={paymentsPage === 1}
                  className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Page {paymentsPage}
                </span>
                <button
                  onClick={() => setPaymentsPage(paymentsPage + 1)}
                  className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  System Settings
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Configure global thresholds and provider settings
                </p>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Initialize default system settings? This will create missing settings.')) {
                    try {
                      await api.initializeSystemSettings();
                      await loadSystemSettings();
                      alert('Default settings initialized successfully');
                    } catch (err: any) {
                      alert(err.message || 'Failed to initialize settings');
                    }
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Initialize Defaults
              </button>
            </div>

            {settingsLoading ? (
              <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
                Loading settings...
              </div>
            ) : systemSettings ? (
              <div className="space-y-6">
                {/* Global Thresholds */}
                {systemSettings.global_thresholds && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50">
                        Global Thresholds
                      </h4>
                      <a
                        href="/THRESHOLD_TUNING_GUIDE.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Tuning Guide →
                      </a>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(systemSettings.global_thresholds).map(([key, value]) => {
                        const thresholdInfo = getThresholdInfo(key);
                        return (
                          <div key={key} className="space-y-1">
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {thresholdInfo.label}
                            </label>
                            <input
                              type="number"
                              step={thresholdInfo.step || 1}
                              min={thresholdInfo.min}
                              max={thresholdInfo.max}
                              value={value as number}
                              onChange={async (e) => {
                                const newValue = parseFloat(e.target.value);
                                if (!isNaN(newValue) && newValue >= (thresholdInfo.min || 0)) {
                                  try {
                                    await api.updateSystemSettings({
                                      global_thresholds: {
                                        ...systemSettings.global_thresholds,
                                        [key]: newValue,
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm"
                            />
                            {thresholdInfo.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {thresholdInfo.description}
                              </p>
                            )}
                            {thresholdInfo.recommended && (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                Recommended: {thresholdInfo.recommended}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Provider Settings */}
                {systemSettings.providers && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                      Provider Settings
                    </h4>
                    <div className="space-y-4">
                      {Object.entries(systemSettings.providers).map(([provider, config]: [string, any]) => (
                        <div key={provider} className="border border-zinc-200 dark:border-zinc-800 rounded p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 capitalize">
                              {provider}
                            </h5>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={async (e) => {
                                  try {
                                    await api.updateSystemSettings({
                                      providers: {
                                        ...systemSettings.providers,
                                        [provider]: {
                                          ...config,
                                          enabled: e.target.checked,
                                        },
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Enabled</span>
                            </label>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {Object.entries(config).map(([key, value]: [string, any]) => {
                              if (key === 'enabled') return null;
                              return (
                                <div key={key}>
                                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </label>
                                  {Array.isArray(value) ? (
                                    <input
                                      type="text"
                                      value={value.join(', ')}
                                      onChange={async (e) => {
                                        const newValue = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                        try {
                                          await api.updateSystemSettings({
                                            providers: {
                                              ...systemSettings.providers,
                                              [provider]: {
                                                ...config,
                                                [key]: newValue,
                                              },
                                            },
                                          });
                                          await loadSystemSettings();
                                        } catch (err: any) {
                                          alert(err.message || 'Failed to update setting');
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm"
                                      placeholder="Comma-separated values"
                                    />
                                  ) : (
                                    <input
                                      type={typeof value === 'number' ? 'number' : 'text'}
                                      value={value}
                                      onChange={async (e) => {
                                        const newValue = typeof value === 'number' 
                                          ? parseFloat(e.target.value) 
                                          : e.target.value;
                                        if (typeof value === 'number' && isNaN(newValue as number)) return;
                                        try {
                                          await api.updateSystemSettings({
                                            providers: {
                                              ...systemSettings.providers,
                                              [provider]: {
                                                ...config,
                                                [key]: newValue,
                                              },
                                            },
                                          });
                                          await loadSystemSettings();
                                        } catch (err: any) {
                                          alert(err.message || 'Failed to update setting');
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ingestion Settings */}
                {systemSettings.ingestion && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                      Ingestion Settings
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                      Configure event ingestion pipeline parameters
                    </p>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(systemSettings.ingestion).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          {typeof value === 'boolean' ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={async (e) => {
                                  try {
                                    await api.updateSystemSettings({
                                      ingestion: {
                                        ...systemSettings.ingestion,
                                        [key]: e.target.checked,
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {value ? 'Enabled' : 'Disabled'}
                              </span>
                            </label>
                          ) : (
                            <input
                              type="number"
                              value={value as number}
                              onChange={async (e) => {
                                const newValue = parseFloat(e.target.value);
                                if (!isNaN(newValue)) {
                                  try {
                                    await api.updateSystemSettings({
                                      ingestion: {
                                        ...systemSettings.ingestion,
                                        [key]: newValue,
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerting Settings */}
                {systemSettings.alerting && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                      Alerting Settings
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(systemSettings.alerting).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          {typeof value === 'boolean' ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={async (e) => {
                                  try {
                                    await api.updateSystemSettings({
                                      alerting: {
                                        ...systemSettings.alerting,
                                        [key]: e.target.checked,
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {value ? 'Enabled' : 'Disabled'}
                              </span>
                            </label>
                          ) : (
                            <input
                              type="number"
                              value={value as number}
                              onChange={async (e) => {
                                const newValue = parseFloat(e.target.value);
                                if (!isNaN(newValue)) {
                                  try {
                                    await api.updateSystemSettings({
                                      alerting: {
                                        ...systemSettings.alerting,
                                        [key]: newValue,
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-Tune Settings */}
                {systemSettings.auto_tune && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                      Auto-Tune Settings
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                      Automatic threshold adjustment for high-cap tokens
                    </p>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(systemSettings.auto_tune).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          {typeof value === 'boolean' ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={async (e) => {
                                  try {
                                    await api.updateSystemSettings({
                                      auto_tune: {
                                        ...systemSettings.auto_tune,
                                        [key]: e.target.checked,
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {value ? 'Enabled' : 'Disabled'}
                              </span>
                            </label>
                          ) : (
                            <input
                              type="number"
                              step={key.includes('increase') ? '0.1' : '1'}
                              value={value as number}
                              onChange={async (e) => {
                                const newValue = parseFloat(e.target.value);
                                if (!isNaN(newValue)) {
                                  try {
                                    await api.updateSystemSettings({
                                      auto_tune: {
                                        ...systemSettings.auto_tune,
                                        [key]: newValue,
                                      },
                                    });
                                    await loadSystemSettings();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update setting');
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
                No system settings found. Click "Initialize Defaults" to create default settings.
              </div>
            )}
          </div>
        )}

        {/* Token Settings Tab */}
        {activeTab === 'token-settings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Token-Specific Settings
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Configure detection thresholds for specific tokens
                </p>
              </div>
              <button
                onClick={() => setShowAddTokenSettingsModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                + Add New Settings
              </button>
            </div>

            {tokenSettingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text="Loading token settings..." />
              </div>
            ) : tokenSettings.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">
                  No token-specific settings configured yet.
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                  Token settings allow you to override system thresholds for specific coins.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Coin
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Min Transfer USD
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Min Units
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Supply %
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Liquidity Ratio
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {tokenSettings.map((settings) => (
                      <tr key={settings.id}>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {settings.coin.name}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {settings.coin.symbol} • {settings.coin.chain}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {editingTokenSettings === settings.coinId ? (
                            <input
                              type="number"
                              value={tokenSettingsForm.minLargeTransferUsd ?? settings.minLargeTransferUsd ?? ''}
                              onChange={(e) =>
                                setTokenSettingsForm((prev) => ({
                                  ...prev,
                                  minLargeTransferUsd: e.target.value,
                                }))
                              }
                              className="w-24 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950"
                              placeholder="System default"
                            />
                          ) : (
                            settings.minLargeTransferUsd
                              ? formatCurrency(settings.minLargeTransferUsd)
                              : 'System default'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {editingTokenSettings === settings.coinId ? (
                            <input
                              type="number"
                              value={tokenSettingsForm.minUnits ?? settings.minUnits ?? ''}
                              onChange={(e) =>
                                setTokenSettingsForm((prev) => ({
                                  ...prev,
                                  minUnits: e.target.value,
                                }))
                              }
                              className="w-24 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950"
                              placeholder="System default"
                            />
                          ) : (
                            settings.minUnits
                              ? settings.minUnits.toLocaleString()
                              : 'System default'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {editingTokenSettings === settings.coinId ? (
                            <input
                              type="number"
                              step="0.0001"
                              value={tokenSettingsForm.supplyPctSpecial ?? settings.supplyPctSpecial ?? ''}
                              onChange={(e) =>
                                setTokenSettingsForm((prev) => ({
                                  ...prev,
                                  supplyPctSpecial: e.target.value,
                                }))
                              }
                              className="w-24 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950"
                              placeholder="System default"
                            />
                          ) : (
                            settings.supplyPctSpecial
                              ? `${(settings.supplyPctSpecial * 100).toFixed(4)}%`
                              : 'System default'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {editingTokenSettings === settings.coinId ? (
                            <input
                              type="number"
                              step="0.0001"
                              value={tokenSettingsForm.liquidityRatioSpecial ?? settings.liquidityRatioSpecial ?? ''}
                              onChange={(e) =>
                                setTokenSettingsForm((prev) => ({
                                  ...prev,
                                  liquidityRatioSpecial: e.target.value,
                                }))
                              }
                              className="w-24 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950"
                              placeholder="System default"
                            />
                          ) : (
                            settings.liquidityRatioSpecial
                              ? settings.liquidityRatioSpecial.toFixed(4)
                              : 'System default'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {editingTokenSettings === settings.coinId ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleSaveTokenSettings(settings.coinId)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTokenSettings(null);
                                  setTokenSettingsForm({});
                                }}
                                className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingTokenSettings(settings.coinId);
                                  setTokenSettingsForm({
                                    minLargeTransferUsd: settings.minLargeTransferUsd?.toString(),
                                    minUnits: settings.minUnits?.toString(),
                                    supplyPctSpecial: settings.supplyPctSpecial?.toString(),
                                    liquidityRatioSpecial: settings.liquidityRatioSpecial?.toString(),
                                  });
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTokenSettings(settings.coinId)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add New Token Settings Modal */}
            {showAddTokenSettingsModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    Add New Token Settings
                  </h3>

                  <div className="space-y-4">
                    {/* Chain Selection */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Chain
                      </label>
                      <select
                        value={newTokenSettingsChain}
                        onChange={(e) => {
                          setNewTokenSettingsChain(e.target.value);
                          setNewTokenSettingsCoinSearch('');
                          setNewTokenSettingsSelectedCoinId('');
                        }}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                      >
                        <option value="">Select a chain</option>
                        {availableChains.map((chain) => (
                          <option key={chain.chain} value={chain.chain}>
                            {chain.name || chain.chain} ({chain.coinCount} coins)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Coin Search */}
                    {newTokenSettingsChain && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Search Coin
                        </label>
                        <input
                          type="text"
                          value={newTokenSettingsCoinSearch}
                          onChange={(e) => setNewTokenSettingsCoinSearch(e.target.value)}
                          placeholder="Type to search coins..."
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                        />
                        {isLoadingNewTokenCoins ? (
                          <div className="mt-2 text-sm text-zinc-500">Loading coins...</div>
                        ) : newTokenSettingsCoins.length > 0 ? (
                          <div className="mt-2 max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded">
                            {newTokenSettingsCoins.map((coin) => (
                              <button
                                key={coin.id}
                                onClick={() => {
                                  setNewTokenSettingsSelectedCoinId(coin.id);
                                  setNewTokenSettingsCoinSearch(`${coin.name} (${coin.symbol})`);
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                                  newTokenSettingsSelectedCoinId === coin.id
                                    ? 'bg-blue-100 dark:bg-blue-900'
                                    : ''
                                }`}
                              >
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                  {coin.name}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {coin.symbol} • {coin.chain}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : newTokenSettingsCoinSearch ? (
                          <div className="mt-2 text-sm text-zinc-500">No coins found</div>
                        ) : null}
                      </div>
                    )}

                    {/* Threshold Fields */}
                    {newTokenSettingsSelectedCoinId && (
                      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Min Transfer USD (optional)
                          </label>
                          <input
                            type="number"
                            value={newTokenSettingsForm.minLargeTransferUsd || ''}
                            onChange={(e) =>
                              setNewTokenSettingsForm((prev) => ({
                                ...prev,
                                minLargeTransferUsd: e.target.value,
                              }))
                            }
                            placeholder="System default"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Min Units (optional)
                          </label>
                          <input
                            type="number"
                            value={newTokenSettingsForm.minUnits || ''}
                            onChange={(e) =>
                              setNewTokenSettingsForm((prev) => ({
                                ...prev,
                                minUnits: e.target.value,
                              }))
                            }
                            placeholder="System default"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Supply % (optional)
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={newTokenSettingsForm.supplyPctSpecial || ''}
                            onChange={(e) =>
                              setNewTokenSettingsForm((prev) => ({
                                ...prev,
                                supplyPctSpecial: e.target.value,
                              }))
                            }
                            placeholder="System default"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Liquidity Ratio (optional)
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={newTokenSettingsForm.liquidityRatioSpecial || ''}
                            onChange={(e) =>
                              setNewTokenSettingsForm((prev) => ({
                                ...prev,
                                liquidityRatioSpecial: e.target.value,
                              }))
                            }
                            placeholder="System default"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                          />
                        </div>
                      </div>
                    )}

                    {/* Modal Actions */}
                    <div className="flex gap-2 justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <button
                        onClick={() => {
                          setShowAddTokenSettingsModal(false);
                          setNewTokenSettingsChain('');
                          setNewTokenSettingsCoinSearch('');
                          setNewTokenSettingsSelectedCoinId('');
                          setNewTokenSettingsForm({});
                          setNewTokenSettingsCoins([]);
                        }}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNewTokenSettings}
                        disabled={!newTokenSettingsSelectedCoinId}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setSignalsType('all')}
                  className={`px-3 py-1 text-sm rounded ${
                    signalsType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSignalsType('accumulation')}
                  className={`px-3 py-1 text-sm rounded ${
                    signalsType === 'accumulation'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  Accumulation
                </button>
                <button
                  onClick={() => setSignalsType('market')}
                  className={`px-3 py-1 text-sm rounded ${
                    signalsType === 'market'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  Market
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSignalsFalsePositiveFilter(undefined)}
                  className={`px-3 py-1 text-sm rounded ${
                    signalsFalsePositiveFilter === undefined
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSignalsFalsePositiveFilter(false)}
                  className={`px-3 py-1 text-sm rounded ${
                    signalsFalsePositiveFilter === false
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  Valid
                </button>
                <button
                  onClick={() => setSignalsFalsePositiveFilter(true)}
                  className={`px-3 py-1 text-sm rounded ${
                    signalsFalsePositiveFilter === true
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  False Positives
                </button>
              </div>
            </div>

            {signalsLoading ? (
              <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
                Loading signals...
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Coin
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Score
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Amount (USD)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {signals.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                            No signals found
                          </td>
                        </tr>
                      ) : (
                        signals.map((signal) => (
                          <tr key={signal.id}>
                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                              {signal._type || (signal.signalType ? 'Market' : 'Accumulation')}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                              {signal.coin?.symbol || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  signal.score >= 75
                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                    : signal.score >= 60
                                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                                      : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                                }`}
                              >
                                {signal.score}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                              {signal.amountUsd
                                ? formatCurrency(signal.amountUsd)
                                : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                              {formatDate(signal.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {signal.falsePositive ? (
                                <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400">
                                  False Positive
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                                  Valid
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {!signal.falsePositive && (
                                <button
                                  onClick={() =>
                                    handleMarkFalsePositive(
                                      signal.id,
                                      signal._type || (signal.signalType ? 'market' : 'accumulation'),
                                    )
                                  }
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Mark False Positive
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {signals.length > 0 && (
                  <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <button
                      onClick={() => setSignalsPage(Math.max(1, signalsPage - 1))}
                      disabled={signalsPage === 1}
                      className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Page {signalsPage}
                    </span>
                    <button
                      onClick={() => setSignalsPage(signalsPage + 1)}
                      className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* False Positive Analytics Tab */}
        {activeTab === 'false-positives' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                False Positive Analytics
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-600 dark:text-zinc-400">
                  Period:
                </label>
                <select
                  value={falsePositiveAnalyticsDays}
                  onChange={(e) => {
                    setFalsePositiveAnalyticsDays(Number(e.target.value));
                  }}
                  className="px-3 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
            </div>

            {falsePositiveAnalyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text="Loading analytics..." />
              </div>
            ) : falsePositiveAnalytics ? (
              <div className="space-y-6">
                {/* Overall Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Signals</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                      {falsePositiveAnalytics.overall.totalSignals.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">False Positives</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {falsePositiveAnalytics.overall.totalFalsePositives.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">False Positive Rate</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                      {falsePositiveAnalytics.overall.falsePositiveRate.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* By Signal Type */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    By Signal Type
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">Accumulation Signals</div>
                      <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
                        {falsePositiveAnalytics.byType.accumulation.falsePositives} / {falsePositiveAnalytics.byType.accumulation.total}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                        Rate: {falsePositiveAnalytics.byType.accumulation.rate.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">Market Signals</div>
                      <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
                        {falsePositiveAnalytics.byType.market.falsePositives} / {falsePositiveAnalytics.byType.market.total}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                        Rate: {falsePositiveAnalytics.byType.market.rate.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* By Score Range */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    By Score Range
                  </h4>
                  <div className="space-y-3">
                    {falsePositiveAnalytics.byScoreRange.map((range) => (
                      <div key={range.range} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {range.range}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-500">
                            {range.falsePositives} / {range.total} signals
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          {range.rate.toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Coin */}
                {falsePositiveAnalytics.byCoin.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                      Top Coins by False Positive Rate
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Coin
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Total Signals
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              False Positives
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {falsePositiveAnalytics.byCoin.map((coin) => (
                            <tr key={coin.coinId}>
                              <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50">
                                {coin.coinName} ({coin.coinSymbol})
                              </td>
                              <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                                {coin.total}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">
                                {coin.falsePositives}
                              </td>
                              <td className="px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {coin.rate.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Daily Trends */}
                {falsePositiveAnalytics.dailyTrends.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                      Daily Trends
                    </h4>
                    <div className="space-y-2">
                      {falsePositiveAnalytics.dailyTrends.map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {new Date(day.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                              {day.total} signals
                            </div>
                            <div className="text-sm text-red-600 dark:text-red-400">
                              {day.falsePositives} false positives
                            </div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 w-16 text-right">
                              {day.rate.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">
                  No analytics data available
                </p>
              </div>
            )}
          </div>
        )}

        {/* Coin Management Tab */}
        {activeTab === 'coin-management' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Coin Management
              </h3>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Total Limit:</label>
                  <select
                    value={importLimit}
                    onChange={(e) => setImportLimit(Number(e.target.value))}
                    disabled={isImporting}
                    className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm"
                  >
                    <option value={50}>50 coins</option>
                    <option value={100}>100 coins</option>
                    <option value={250}>250 coins</option>
                    <option value={500}>500 coins</option>
                    <option value={1000}>1000 coins</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reset-progress"
                    checked={resetProgress}
                    onChange={(e) => setResetProgress(e.target.checked)}
                    disabled={isImporting}
                    className="rounded border-zinc-300 dark:border-zinc-700"
                  />
                  <label htmlFor="reset-progress" className="text-sm text-zinc-600 dark:text-zinc-400">
                    Reset Progress
                  </label>
                </div>
                <button
                  onClick={handleImportFromCoinGecko}
                  disabled={isImporting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isImporting ? 'Processing Batch...' : 'Import Next Batch (50 coins)'}
                </button>
                <button
                  onClick={async () => {
                    // Load chains if not already loaded
                    if (availableChains.length === 0) {
                      try {
                        const response = await api.getAvailableChains();
                        setAvailableChains(response.data);
                      } catch (err) {
                        console.error('Failed to load chains:', err);
                      }
                    }
                    setShowAddCoinModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Add New Coin
                </button>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Batch Processing:</strong> Imports process in batches of 50 coins with 5-minute delays between batches. 
                Progress is automatically saved, so you can stop and resume anytime. 
                Check "Reset Progress" to start from the beginning.
              </p>
            </div>

            {importResult && (
              <div className={`border rounded-lg p-4 ${
                importResult.errors > 0 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}>
                <p className={`text-sm font-medium mb-2 ${
                  importResult.errors > 0
                    ? 'text-yellow-800 dark:text-yellow-300'
                    : 'text-green-800 dark:text-green-300'
                }`}>
                  Import Complete!
                </p>
                <div className={`text-sm space-y-1 ${
                  importResult.errors > 0
                    ? 'text-yellow-700 dark:text-yellow-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>
                  <p>✅ Created: {importResult.created} coins</p>
                  <p>⏭️ Skipped: {importResult.skipped} coins (already exist)</p>
                  {importResult.errors > 0 && (
                    <>
                      <p>❌ Errors: {importResult.errors} coins</p>
                      {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium">View error details ({importResult.errorDetails.length})</summary>
                          <ul className="mt-2 ml-4 list-disc space-y-1 text-xs max-h-40 overflow-y-auto">
                            {importResult.errorDetails.map((error, idx) => (
                              <li key={idx} className="text-red-600 dark:text-red-400">{error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                  {importResult.chains && importResult.chains.length > 0 && (
                    <p className="mt-2">
                      🔗 Chains found: <strong>{importResult.chains.join(', ')}</strong>
                    </p>
                  )}
                  {importResult.processed !== undefined && importResult.remaining !== undefined && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="font-medium">Progress:</p>
                      <p>✅ Processed: {importResult.processed} coins</p>
                      <p>⏳ Remaining: {importResult.remaining} coins</p>
                      {importResult.remaining > 0 && (
                        <p className="mt-2 text-xs opacity-75">
                          Click "Import Next Batch" again to continue processing the remaining coins.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, symbol, or address..."
                    value={coinsFilter.search || ''}
                    onChange={(e) => setCoinsFilter({ ...coinsFilter, search: e.target.value })}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Chain
                  </label>
                  <select
                    value={coinsFilter.chain || ''}
                    onChange={(e) => setCoinsFilter({ ...coinsFilter, chain: e.target.value || undefined })}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <option value="">All Chains</option>
                    {availableChains.map((c) => (
                      <option key={c.chain} value={c.chain}>
                        {c.name || c.chain}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={coinsFilter.isActive === undefined ? '' : coinsFilter.isActive ? 'active' : 'inactive'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCoinsFilter({
                        ...coinsFilter,
                        isActive: value === '' ? undefined : value === 'active',
                      });
                    }}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Famous
                  </label>
                  <select
                    value={coinsFilter.isFamous === undefined ? '' : coinsFilter.isFamous ? 'famous' : 'not-famous'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCoinsFilter({
                        ...coinsFilter,
                        isFamous: value === '' ? undefined : value === 'famous',
                      });
                    }}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="famous">Famous Only</option>
                    <option value="not-famous">Not Famous</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Coins Table */}
            {coinsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : coins.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">No coins found</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Coin
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Chain
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Signals
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Watchlist
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {coins.map((coin) => (
                      <tr key={coin.id}>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-50">
                              {coin.symbol}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{coin.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {coin.chain}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <label className="inline-flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={coin.isActive || false}
                                onChange={(e) => handleUpdateCoinStatus(coin.id, { isActive: e.target.checked })}
                                className="h-3 w-3 rounded border-zinc-300 dark:border-zinc-700"
                              />
                              <span className="text-zinc-600 dark:text-zinc-400">Active</span>
                            </label>
                            <label className="inline-flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={coin.isFamous || false}
                                onChange={(e) => handleUpdateCoinStatus(coin.id, { isFamous: e.target.checked })}
                                className="h-3 w-3 rounded border-zinc-300 dark:border-zinc-700"
                              />
                              <span className="text-zinc-600 dark:text-zinc-400">Famous</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {coin.signalCounts?.total || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {(coin as any).watchlistCount || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-3 justify-end">
                            <button
                              onClick={() => handleEditCoin(coin)}
                              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCoin(coin.id)}
                              className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Coin Modal */}
            {showAddCoinModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    Add New Coin
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newCoinForm.name}
                        onChange={(e) => setNewCoinForm({ ...newCoinForm, name: e.target.value })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Symbol *
                      </label>
                      <input
                        type="text"
                        value={newCoinForm.symbol}
                        onChange={(e) => setNewCoinForm({ ...newCoinForm, symbol: e.target.value.toUpperCase() })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Contract Address <span className="text-zinc-500 text-xs">(optional for native coins)</span>
                      </label>
                      <input
                        type="text"
                        value={newCoinForm.contractAddress}
                        onChange={(e) => setNewCoinForm({ ...newCoinForm, contractAddress: e.target.value })}
                        placeholder="Leave empty for native coins (e.g., BTC, ETH native)"
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Required for tokens, optional for native blockchain coins
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Chain *
                      </label>
                      <select
                        value={newCoinForm.chain}
                        onChange={(e) => setNewCoinForm({ ...newCoinForm, chain: e.target.value })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select chain...</option>
                        {availableChains.length === 0 ? (
                          <option value="" disabled>Loading chains...</option>
                        ) : (
                          availableChains.map((c) => (
                            <option key={c.chain} value={c.chain}>
                              {c.name || c.chain} {c.coinCount > 0 ? `(${c.coinCount} coins)` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Total Supply
                        </label>
                        <input
                          type="number"
                          value={newCoinForm.totalSupply || ''}
                          onChange={(e) => setNewCoinForm({ ...newCoinForm, totalSupply: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Circulating Supply
                        </label>
                        <input
                          type="number"
                          value={newCoinForm.circulatingSupply || ''}
                          onChange={(e) => setNewCoinForm({ ...newCoinForm, circulatingSupply: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newCoinForm.isActive}
                          onChange={(e) => setNewCoinForm({ ...newCoinForm, isActive: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Active</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newCoinForm.isFamous}
                          onChange={(e) => setNewCoinForm({ ...newCoinForm, isFamous: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Famous</span>
                      </label>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => {
                          setShowAddCoinModal(false);
                          setNewCoinForm({
                            name: '',
                            symbol: '',
                            contractAddress: '',
                            chain: '',
                            isActive: false,
                            isFamous: false,
                          });
                        }}
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCoin}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Create Coin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Coin Modal */}
            {showEditCoinModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    Edit Coin
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={editCoinForm.name}
                        onChange={(e) => setEditCoinForm({ ...editCoinForm, name: e.target.value })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Symbol *
                      </label>
                      <input
                        type="text"
                        value={editCoinForm.symbol}
                        onChange={(e) => setEditCoinForm({ ...editCoinForm, symbol: e.target.value.toUpperCase() })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Contract Address <span className="text-zinc-500 text-xs">(optional for native coins)</span>
                      </label>
                      <input
                        type="text"
                        value={editCoinForm.contractAddress}
                        onChange={(e) => setEditCoinForm({ ...editCoinForm, contractAddress: e.target.value })}
                        placeholder="Leave empty for native coins (e.g., BTC, ETH native)"
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Required for tokens, optional for native blockchain coins
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Chain *
                      </label>
                      <select
                        value={editCoinForm.chain}
                        onChange={(e) => setEditCoinForm({ ...editCoinForm, chain: e.target.value })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select chain...</option>
                        {availableChains.length === 0 ? (
                          <option value="" disabled>Loading chains...</option>
                        ) : (
                          availableChains.map((c) => (
                            <option key={c.chain} value={c.chain}>
                              {c.name || c.chain} {c.coinCount > 0 ? `(${c.coinCount} coins)` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Total Supply
                        </label>
                        <input
                          type="number"
                          value={editCoinForm.totalSupply || ''}
                          onChange={(e) => setEditCoinForm({ ...editCoinForm, totalSupply: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Circulating Supply
                        </label>
                        <input
                          type="number"
                          value={editCoinForm.circulatingSupply || ''}
                          onChange={(e) => setEditCoinForm({ ...editCoinForm, circulatingSupply: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editCoinForm.isActive}
                          onChange={(e) => setEditCoinForm({ ...editCoinForm, isActive: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Active</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editCoinForm.isFamous}
                          onChange={(e) => setEditCoinForm({ ...editCoinForm, isFamous: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Famous</span>
                      </label>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => {
                          setShowEditCoinModal(false);
                          setEditingCoinId(null);
                          setEditCoinForm({
                            name: '',
                            symbol: '',
                            contractAddress: '',
                            chain: '',
                            isActive: false,
                            isFamous: false,
                          });
                        }}
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateCoin}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Update Coin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chains List */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Supported Chains
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('This will recalculate coin counts for all chains from the actual coins in the database. Continue?')) {
                        return;
                      }
                      try {
                        setChainsLoading(true);
                        const result = await api.recalculateChainCoinCounts();
                        alert(result.message || `Recalculated ${result.updated} chain(s)`);
                        loadChains();
                      } catch (err: any) {
                        setError(err.message || 'Failed to recalculate chain coin counts');
                      } finally {
                        setChainsLoading(false);
                      }
                    }}
                    disabled={chainsLoading}
                    className="px-3 py-1 text-sm text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50"
                    title="Recalculate coin counts from actual coins in database"
                  >
                    Recalculate Counts
                  </button>
                  <button
                    onClick={loadChains}
                    disabled={chainsLoading}
                    className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {chainsLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : chains.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
                  No chains found. Import coins to populate chains.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                          Chain
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                          Coins
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                          Signals
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {chains.map((chain) => (
                        <tr key={chain.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-900 dark:text-zinc-50">
                              {chain.name}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {chain.chain}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                chain.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              {chain.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {chain.coinCount}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {chain.signalCount}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <label className="inline-flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={chain.isActive}
                                onChange={(e) => {
                                  api.updateChainStatus(chain.chain, { isActive: e.target.checked })
                                    .then(() => loadChains())
                                    .catch((err) => setError(err.message || 'Failed to update chain status'));
                                }}
                                className="h-3 w-3 rounded border-zinc-300 dark:border-zinc-700"
                              />
                              <span className="text-zinc-600 dark:text-zinc-400">Active</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chain Management Tab */}
        {activeTab === 'chain-management' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Chain Management
              </h3>
              <button
                onClick={() => {
                  setShowAddChainModal(true);
                  setNewChainForm({
                    chain: '',
                    name: '',
                    isActive: true,
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Add New Chain
              </button>
            </div>

            {/* Chains Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              {chainsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : chains.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                  No chains found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Chain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Coins
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Signals
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {chains.map((chain) => (
                        <tr key={chain.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {chain.chain}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {editingChain === chain.chain ? (
                              <input
                                type="text"
                                value={editChainForm.name}
                                onChange={(e) => setEditChainForm({ ...editChainForm, name: e.target.value })}
                                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm"
                              />
                            ) : (
                              chain.name
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {chain.coinCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {chain.signalCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {editingChain === chain.chain ? (
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editChainForm.isActive}
                                  onChange={(e) => setEditChainForm({ ...editChainForm, isActive: e.target.checked })}
                                  className="h-3 w-3 rounded border-zinc-300 dark:border-zinc-700"
                                />
                                <span className="text-zinc-600 dark:text-zinc-400">Active</span>
                              </label>
                            ) : (
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  chain.isActive
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}
                              >
                                {chain.isActive ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {editingChain === chain.chain ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateChain(chain.chain)}
                                  className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingChain(null);
                                    setEditChainForm({ name: '', isActive: true });
                                  }}
                                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditChain(chain)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteChain(chain.chain, chain.name)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                  disabled={chain.coinCount > 0}
                                  title={chain.coinCount > 0 ? 'Cannot delete chain with coins' : 'Delete chain'}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Chain Modal */}
            {showAddChainModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    Add New Chain
                  </h3>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Chain *
                      </label>
                      <input
                        type="text"
                        value={newChainForm.chain}
                        onChange={(e) => setNewChainForm({ ...newChainForm, chain: e.target.value.toUpperCase() })}
                        placeholder="e.g., ETHEREUM, BSC, POLYGON"
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Valid values: ETHEREUM, BSC, POLYGON, ARBITRUM, BASE, AVALANCHE, FANTOM, SOLANA, BITCOIN
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newChainForm.name}
                        onChange={(e) => setNewChainForm({ ...newChainForm, name: e.target.value })}
                        placeholder="e.g., Ethereum, Binance Smart Chain"
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newChainForm.isActive}
                          onChange={(e) => setNewChainForm({ ...newChainForm, isActive: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Active</span>
                      </label>
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        onClick={() => {
                          setShowAddChainModal(false);
                          setError(null);
                          setNewChainForm({
                            chain: '',
                            name: '',
                            isActive: true,
                          });
                        }}
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateChain}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Create Chain
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
