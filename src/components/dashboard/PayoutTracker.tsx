'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, TrendingUp, Shield, AlertTriangle, CheckCircle2,
  Calendar, DollarSign, Zap, ChevronDown, ChevronUp,
  Loader2, RefreshCcw, Wallet, BarChart3, Info
} from 'lucide-react';
import { filterTradesForFundedNextAccount, useTradeStore, useFundedNextStore, isSupabaseConfigured, supabase } from '@/lib/store';
import { toast } from 'sonner';

interface PayoutGoal {
  objective: number;
  days: number;
  startDate: string;
}

// Supabase helpers for goal persistence
const goalSupabaseKey = (accountNumber: string) => `payout_goal_${accountNumber}`;
const goalLocalKey = (accountNumber: string) => `draga-payout-goal-${accountNumber}`;

async function saveGoalToSupabase(goal: PayoutGoal, key: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    // Use upsert: insert if not exists, update if exists
    await supabase.from('app_settings').upsert(
      { key, value: JSON.stringify(goal), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('[PayoutTracker] Supabase goal save failed, using localStorage only:', err);
  }
}

async function loadGoalFromSupabase(key: string): Promise<PayoutGoal | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data?.value) return null;
    return JSON.parse(data.value) as PayoutGoal;
  } catch (err) {
    console.warn('[PayoutTracker] Supabase goal load failed:', err);
    return null;
  }
}

async function removeGoalFromSupabase(key: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('app_settings').delete().eq('key', key);
  } catch (err) {
    console.warn('[PayoutTracker] Supabase goal delete failed:', err);
  }
}

export default function PayoutTracker() {
  const allTrades = useTradeStore((s) => s.trades);
  const fnStore = useFundedNextStore();
  const { account, isConnected, isSyncing, token, selectedAccountNumber } = fnStore;
  const payoutHistory = selectedAccountNumber ? fnStore.detectedPayouts[selectedAccountNumber] || [] : [];
  const latestPayout = payoutHistory[0];
  const totalPaid = payoutHistory.reduce((sum, payout) => sum + payout.amount, 0);
  const trades = useMemo(
    () => filterTradesForFundedNextAccount(allTrades, selectedAccountNumber),
    [allTrades, selectedAccountNumber]
  );
  const accountGoalKey = goalSupabaseKey(selectedAccountNumber || 'default');
  const localGoalKey = goalLocalKey(selectedAccountNumber || 'default');

  const [goal, setGoal] = useState<PayoutGoal | null>(null);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [daysInput, setDaysInput] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [goalLoading, setGoalLoading] = useState(true);

  // Load saved goal: Supabase first, then localStorage fallback
  useEffect(() => {
    let cancelled = false;

    async function loadGoal() {
      setGoalLoading(true);
      setGoal(null);
      setIsSetup(false);
      // Try Supabase first
      const supabaseGoal = await loadGoalFromSupabase(accountGoalKey);
      if (!cancelled && supabaseGoal) {
        setGoal(supabaseGoal);
        setIsSetup(true);
        // Also update localStorage for offline access
        localStorage.setItem(localGoalKey, JSON.stringify(supabaseGoal));
        setGoalLoading(false);
        return;
      }

      // Fallback to localStorage
      if (!cancelled) {
        try {
          const saved = localStorage.getItem(localGoalKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            setGoal(parsed);
            setIsSetup(true);
            // Back-sync to Supabase for cross-device access
            saveGoalToSupabase(parsed, accountGoalKey);
          }
        } catch {}
        setGoalLoading(false);
      }
    }

    loadGoal();
    return () => { cancelled = true; };
  }, [accountGoalKey, localGoalKey]);

  // Use MCP balance if available, otherwise calculate from trades
  const accountBalance = account?.balance || 0;
  const initialBalance = account?.initialBalance || 0;

  // Calculate trade stats for consistency - works 100% from trades data alone
  const tradeStats = useMemo(() => {
    if (!goal) return null;

    const goalStartDate = new Date(goal.startDate);
    const relevantTrades = trades.filter(t => new Date(t.date) >= goalStartDate);

    // Group by day
    const dailyPnl: Record<string, number> = {};
    relevantTrades.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0];
      dailyPnl[day] = (dailyPnl[day] || 0) + t.pnl;
    });

    const dailyPnlValues = Object.values(dailyPnl);
    const totalPnlFromTrades = dailyPnlValues.reduce((sum, v) => sum + v, 0);
    const bestDayPnl = dailyPnlValues.length > 0 ? Math.max(...dailyPnlValues) : 0;
    const worstDayPnl = dailyPnlValues.length > 0 ? Math.min(...dailyPnlValues) : 0;
    const tradingDaysUsed = Object.keys(dailyPnl).length;

    // Use MCP profit if available, otherwise use trades PnL
    const totalProfit = (accountBalance > 0 && initialBalance > 0)
      ? accountBalance - initialBalance
      : totalPnlFromTrades;

    // 40% consistency check
    const consistencyRatio = totalPnlFromTrades > 0 ? (bestDayPnl / totalPnlFromTrades) * 100 : 0;
    const isConsistent = consistencyRatio <= 40;

    // 2% check - use MCP balance if available, otherwise estimate from goal objective context
    const balanceForCheck = initialBalance > 0 ? initialBalance : (goal.objective / 0.10); // estimate ~10% target
    const profitPercentage = balanceForCheck > 0 ? (totalProfit / balanceForCheck) * 100 : 0;
    const isAbove2Percent = profitPercentage >= 2;

    // Trading Days calculations (Count only days where a trade actually took place)
    const tradingDaysRemaining = Math.max(0, goal.days - tradingDaysUsed);

    // Daily target per remaining trading day
    const remainingProfit = Math.max(0, goal.objective - totalProfit);
    const dailyTarget = tradingDaysRemaining > 0 ? remainingProfit / tradingDaysRemaining : remainingProfit;

    // Max single-day profit (40% rule)
    const maxSingleDayProfit = goal.objective * 0.4;

    // Progress
    const progress = goal.objective > 0 ? Math.min(100, (totalProfit / goal.objective) * 100) : 0;

    return {
      totalProfit,
      totalPnlFromTrades,
      bestDayPnl,
      worstDayPnl,
      tradingDaysUsed,
      consistencyRatio,
      isConsistent,
      profitPercentage,
      isAbove2Percent,
      tradingDaysRemaining,
      dailyTarget,
      maxSingleDayProfit,
      remainingProfit,
      progress,
    };
  }, [trades, goal, accountBalance, initialBalance]);

  const handleSetGoal = async () => {
    const obj = parseFloat(objectiveInput);
    const days = parseInt(daysInput);
    if (!obj || obj <= 0) { toast.error('Enter a valid profit objective'); return; }
    if (!days || days <= 0) { toast.error('Enter valid number of days'); return; }

    const newGoal: PayoutGoal = {
      objective: obj,
      days: days,
      startDate: new Date().toISOString(),
    };
    setGoal(newGoal);
    setIsSetup(true);

    // Save to BOTH localStorage and Supabase
    localStorage.setItem(localGoalKey, JSON.stringify(newGoal));
    await saveGoalToSupabase(newGoal, accountGoalKey);

    toast.success(`Payout goal set: $${obj} in ${days} days!`);
  };

  const handleReset = async () => {
    setGoal(null);
    setIsSetup(false);
    setObjectiveInput('');
    setDaysInput('');

    // Remove from BOTH localStorage and Supabase
    localStorage.removeItem(localGoalKey);
    await removeGoalFromSupabase(accountGoalKey);

    toast.info('Payout goal reset');
  };

  const handleSync = async () => {
    if (token) {
      if (!isConnected) {
        await fnStore.connect(token);
      } else {
        await fnStore.sync();
      }
    } else {
      toast.error('No FundedNext token configured');
    }
  };

  // Get status color and label
  const getStatusInfo = () => {
    if (!tradeStats) return { color: 'text-foreground-subtle', bg: 'bg-white/5', label: 'Not Started', icon: Info };
    if (tradeStats.progress >= 100 && tradeStats.isConsistent && tradeStats.isAbove2Percent) {
      return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '🎉 PAYOUT READY!', icon: CheckCircle2 };
    }
    if (!tradeStats.isConsistent) {
      return { color: 'text-red-400', bg: 'bg-red-500/10', label: '⚠️ Consistency Warning', icon: AlertTriangle };
    }
    if (tradeStats.progress >= 50) {
      return { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'On Track 🔥', icon: TrendingUp };
    }
    return { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'In Progress', icon: Zap };
  };

  const status = getStatusInfo();

  // Show loading state while goal loads
  if (goalLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border-subtle overflow-hidden p-6"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-accent-blue" />
          <span className="text-sm text-foreground-subtle">Loading Payout Tracker...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card border border-border-subtle overflow-hidden"
    >
      {/* Header with gradient accent */}
      <div className="relative p-4 sm:p-5 pb-3 sm:pb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 via-accent-purple/5 to-accent-emerald/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/20">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Payout Goal Tracker</h3>
              <p className="text-xs text-foreground-subtle">
                {isConnected && account
                  ? `${account.accountType} | ${account.accountNumber} • $${accountBalance.toLocaleString()}`
                  : isSyncing
                  ? 'Syncing FundedNext...'
                  : 'Connect FundedNext to auto-sync'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(isConnected || token) && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground-subtle hover:text-foreground transition-all"
                title="Sync FundedNext"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </button>
            )}
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
              {status.label}
            </div>
          </div>
        </div>
      </div>

      {latestPayout && (
        <div className="grid gap-3 border-y border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:grid-cols-[180px_1fr] sm:items-center sm:px-5">
          <div className="aspect-video overflow-hidden rounded-lg border border-emerald-500/20 bg-black">
            <img
              src="/trade-results/payout.png"
              alt="Payout detected"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-emerald-400">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold uppercase">Payout detected automatically</span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              ${latestPayout.amount.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-foreground-subtle">
              Balance returned from ${latestPayout.peakBalance.toLocaleString()} to ${latestPayout.balanceAfterPayout.toLocaleString()} on {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latestPayout.detectedAt))}.
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-300">
              {payoutHistory.length} payout{payoutHistory.length === 1 ? '' : 's'} tracked | ${totalPaid.toFixed(2)} total
            </p>
          </div>
        </div>
      )}

      {/* Setup Form or Tracker */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <AnimatePresence mode="wait">
          {!isSetup ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Connection status */}
              {isConnected && account ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300">
                    Connected: <span className="font-semibold">{account.accountType}</span> • Balance: <span className="font-bold">${accountBalance.toLocaleString()}</span>
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">
                    {isSyncing ? 'Connecting to FundedNext...' : 'Connecting to FundedNext MCP for live balance...'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-foreground-subtle mb-1.5 block font-medium">
                    💰 Profit Objective ($)
                  </label>
                  <input
                    type="number"
                    value={objectiveInput}
                    onChange={(e) => setObjectiveInput(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border-subtle text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue/40 placeholder:text-foreground-subtle/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground-subtle mb-1.5 block font-medium">
                    📅 Trading Days Target
                  </label>
                  <input
                    type="number"
                    value={daysInput}
                    onChange={(e) => setDaysInput(e.target.value)}
                    placeholder="e.g. 5 (traded days)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border-subtle text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue/40 placeholder:text-foreground-subtle/50 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleSetGoal}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-accent-blue/20"
              >
                🎯 Set Payout Goal
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="tracker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Main Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-subtle">
                    Progress: <span className="font-bold text-foreground">${(tradeStats?.totalProfit || 0).toFixed(2)}</span> / <span className="text-foreground-muted">${goal?.objective.toFixed(2)}</span>
                  </span>
                  <span className={`font-bold ${(tradeStats?.progress || 0) >= 100 ? 'text-emerald-400' : 'text-accent-blue'}`}>
                    {(tradeStats?.progress || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/5 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, tradeStats?.progress || 0)}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className={`h-full rounded-full relative ${
                      (tradeStats?.progress || 0) >= 100
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : (tradeStats?.progress || 0) >= 50
                        ? 'bg-gradient-to-r from-accent-blue to-accent-purple'
                        : 'bg-gradient-to-r from-amber-500 to-accent-blue'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Daily Target */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-accent-blue" />
                    <span className="text-[10px] text-foreground-subtle font-medium uppercase tracking-wider">Target / Day</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">${(tradeStats?.dailyTarget || 0).toFixed(0)}</p>
                  <p className="text-[10px] text-foreground-subtle">/traded day needed</p>
                </div>

                {/* Trading Days */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent-purple" />
                    <span className="text-[10px] text-foreground-subtle font-medium uppercase tracking-wider">Trading Days</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {tradeStats?.tradingDaysUsed || 0} <span className="text-xs font-normal text-foreground-subtle">/ {goal?.days}</span>
                  </p>
                  <p className="text-[10px] text-foreground-subtle">
                    {(tradeStats?.tradingDaysRemaining || 0) > 0 ? `${tradeStats?.tradingDaysRemaining} left` : 'Target days reached'}
                  </p>
                </div>

                {/* 40% Rule */}
                <div className={`p-3 rounded-xl border space-y-1 ${
                  tradeStats?.isConsistent
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-foreground-subtle font-medium uppercase tracking-wider">40% Rule</span>
                  </div>
                  <p className={`text-lg font-bold ${tradeStats?.isConsistent ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(tradeStats?.consistencyRatio || 0).toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-foreground-subtle">
                    {tradeStats?.isConsistent ? '✅ Safe' : '⚠️ Fix it!'}
                  </p>
                </div>

                {/* 2% Payout Check */}
                <div className={`p-3 rounded-xl border space-y-1 ${
                  tradeStats?.isAbove2Percent
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-amber-500/5 border-amber-500/20'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] text-foreground-subtle font-medium uppercase tracking-wider">2% Min</span>
                  </div>
                  <p className={`text-lg font-bold ${tradeStats?.isAbove2Percent ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {(tradeStats?.profitPercentage || 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-foreground-subtle">
                    {tradeStats?.isAbove2Percent ? '✅ Eligible' : `Need ${(2 - (tradeStats?.profitPercentage || 0)).toFixed(1)}%`}
                  </p>
                </div>
              </div>

              {/* Expandable Details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-foreground-subtle hover:text-foreground transition-colors"
              >
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDetails ? 'Hide Details' : 'Show More Details'}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-foreground-subtle uppercase tracking-wider">Best Day</p>
                        <p className={`text-sm font-bold mt-1 ${(tradeStats?.bestDayPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${(tradeStats?.bestDayPnl || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-foreground-subtle uppercase tracking-wider">Worst Day</p>
                        <p className={`text-sm font-bold mt-1 ${(tradeStats?.worstDayPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${(tradeStats?.worstDayPnl || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-foreground-subtle uppercase tracking-wider">Max/Day (40%)</p>
                        <p className="text-sm font-bold mt-1 text-foreground">
                          ${(tradeStats?.maxSingleDayProfit || 0).toFixed(0)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-foreground-subtle uppercase tracking-wider">Trading Days</p>
                        <p className="text-sm font-bold mt-1 text-foreground">
                          {tradeStats?.tradingDaysUsed || 0} days
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-foreground-subtle uppercase tracking-wider">Remaining</p>
                        <p className="text-sm font-bold mt-1 text-accent-blue">
                          ${(tradeStats?.remainingProfit || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-foreground-subtle uppercase tracking-wider">Account Balance</p>
                        <p className="text-sm font-bold mt-1 text-foreground">
                          ${accountBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Payout Readiness Summary */}
                    {tradeStats && (
                      <div className={`mt-3 p-4 rounded-xl border ${
                        tradeStats.isAbove2Percent && tradeStats.isConsistent && tradeStats.progress >= 100
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-white/[0.02] border-white/[0.06]'
                      }`}>
                        <h4 className="text-xs font-semibold text-foreground mb-2">📋 Payout Checklist</h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span>{tradeStats.isAbove2Percent ? '✅' : '⬜'}</span>
                            <span className={tradeStats.isAbove2Percent ? 'text-emerald-300' : 'text-foreground-subtle'}>
                              Minimum 2% profit ({tradeStats.profitPercentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span>{tradeStats.isConsistent ? '✅' : '⬜'}</span>
                            <span className={tradeStats.isConsistent ? 'text-emerald-300' : 'text-foreground-subtle'}>
                              40% Consistency Rule ({tradeStats.consistencyRatio.toFixed(0)}% best day ratio)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span>{tradeStats.progress >= 100 ? '✅' : '⬜'}</span>
                            <span className={tradeStats.progress >= 100 ? 'text-emerald-300' : 'text-foreground-subtle'}>
                              Target reached (${(tradeStats?.totalProfit || 0).toFixed(2)} / ${goal?.objective})
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleReset}
                      className="mt-3 w-full py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground-subtle hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                    >
                      Reset Goal
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
