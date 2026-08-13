'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, RefreshCw, Unplug, CheckCircle2,
  TrendingUp, AlertTriangle, ArrowUpRight, Lock, ExternalLink
} from 'lucide-react';
import { useFundedNextStore } from '@/lib/store';
import FundedNextMcpModal from './FundedNextMcpModal';

export default function FundedNextCard({ className = '' }: { className?: string }) {
  const { account, isConnected, isSyncing, sync, disconnect } = useFundedNextStore();
  const [modalOpen, setModalOpen] = useState(false);

  // If Not Connected
  if (!isConnected || !account) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F1424] via-[#0D101E] to-[#120F24] border border-blue-500/20 p-6 shadow-xl ${className}`}
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-500/10">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">FundedNext MCP Server</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    LIVE AI SYNC
                  </span>
                </div>
                <p className="text-xs text-foreground-subtle mt-1">
                  Connect FundedNext to sync balance, payouts, rules & trades automatically via MCP.
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              Connect Account
            </button>
          </div>
        </motion.div>

        <FundedNextMcpModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Calculate Metrics
  const profitTargetPercent = Math.min(
    100,
    Math.max(0, ((account.balance - account.initialBalance) / account.profitTarget) * 100)
  );

  const dailyLossPercent = Math.min(
    100,
    Math.max(0, (account.currentDailyLoss / account.maxDailyLossLimit) * 100)
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F1424] via-[#0D101E] to-[#120F24] border border-blue-500/30 p-6 shadow-xl ${className}`}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
              FN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{account.accountType}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {account.status}
                </span>
              </div>
              <p className="text-xs text-foreground-subtle font-mono mt-0.5">
                Account ID: {account.accountNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => sync()}
              disabled={isSyncing}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground-subtle hover:text-white transition-colors"
              title="Sync via MCP"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={() => disconnect()}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="Disconnect MCP"
            >
              <Unplug className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Balance & Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-white/[0.08] relative z-10">
          <div>
            <span className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider">
              Account Balance
            </span>
            <p className="text-lg font-bold text-white mt-0.5">
              ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider">
              Live Equity
            </span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">
              ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider">
              Profit Target
            </span>
            <p className="text-lg font-bold text-blue-400 mt-0.5">
              +${(account.balance - account.initialBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider">
              Payout Status
            </span>
            <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {account.payoutEligible ? 'Eligible' : 'In Review'}
            </p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 relative z-10">
          {/* Target Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-foreground-subtle font-medium">Profit Target Progress</span>
              <span className="text-blue-400 font-bold">{profitTargetPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                style={{ width: `${profitTargetPercent}%` }}
              />
            </div>
          </div>

          {/* Daily Drawdown Usage */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-foreground-subtle font-medium">Daily Loss Guardrail</span>
              <span className={dailyLossPercent > 70 ? 'text-red-400 font-bold' : 'text-foreground font-semibold'}>
                ${account.currentDailyLoss.toFixed(2)} / ${account.maxDailyLossLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  dailyLossPercent > 70 ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${dailyLossPercent}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <FundedNextMcpModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
