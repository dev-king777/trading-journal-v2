'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  DollarSign, TrendingUp, Target, Clock,
  Flame, Trophy, ArrowUp, ArrowDown,
  Brain, Smile, BarChart3, Zap
} from 'lucide-react';
import { useTradeStore } from '@/lib/store';
import { getGreeting } from '@/lib/utils';
import StatCard from '@/components/dashboard/StatCard';
import RecentTrades from '@/components/dashboard/RecentTrades';
import LotSizeCalculator from '@/components/LotSizeCalculator';

const PnlChart = dynamic(() => import('@/components/dashboard/PnlChart'), { ssr: false });
const CalendarHeatmap = dynamic(() => import('@/components/dashboard/CalendarHeatmap'), { ssr: false });
const WinRateChart = dynamic(() => import('@/components/dashboard/WinRateChart'), { ssr: false });
import { motion } from 'framer-motion';

export default function DashboardContent() {
  const trades = useTradeStore((s) => s.trades);
  const getStats = useTradeStore((s) => s.getStats);
  const stats = getStats();

  return (
    <div className="max-w-[1440px] mx-auto space-y-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-foreground tracking-tight">
          {getGreeting()}, El Houssaine 🔥
        </h2>
        <p className="text-foreground-subtle mt-1">
          Time for cocke — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Today's P&L"
          value={stats.todayPnl}
          prefix="$"
          decimals={2}
          icon={DollarSign}
          gradient="gradient-blue"
          glowClass="stat-card-gradient stat-card-blue"
          delay={0}
        />
        <StatCard
          title="Weekly P&L"
          value={stats.weeklyPnl}
          prefix="$"
          decimals={2}
          icon={TrendingUp}
          trend={12.5}
          trendLabel="vs last week"
          gradient="gradient-emerald"
          glowClass="stat-card-gradient stat-card-emerald"
          delay={1}
        />
        <StatCard
          title="Monthly P&L"
          value={stats.monthlyPnl}
          prefix="$"
          decimals={2}
          icon={BarChart3}
          trend={8.3}
          trendLabel="vs last month"
          gradient="gradient-purple"
          glowClass="stat-card-gradient stat-card-purple"
          delay={2}
        />
        <StatCard
          title="Win Rate"
          value={stats.winRate}
          suffix="%"
          decimals={1}
          icon={Target}
          gradient="gradient-blue"
          glowClass="stat-card-gradient stat-card-cyan"
          delay={3}
        />
        <StatCard
          title="Average RR"
          value={stats.averageRR}
          suffix="R"
          decimals={2}
          icon={Zap}
          gradient="gradient-emerald"
          glowClass="stat-card-gradient stat-card-emerald"
          delay={4}
        />
        <StatCard
          title="Total Trades"
          value={stats.totalTrades}
          icon={BarChart3}
          gradient="gradient-purple"
          glowClass="stat-card-gradient stat-card-purple"
          delay={5}
        />
        <StatCard
          title="Current Streak"
          value={stats.currentStreak}
          suffix=" wins"
          icon={Flame}
          gradient="gradient-orange"
          glowClass="stat-card-gradient stat-card-orange"
          delay={6}
        />
        <StatCard
          title="Largest Win"
          value={stats.largestWin}
          prefix="$"
          decimals={2}
          icon={Trophy}
          gradient="gradient-emerald"
          glowClass="stat-card-gradient stat-card-emerald"
          delay={7}
        />
        <StatCard
          title="Largest Loss"
          value={stats.largestLoss}
          prefix="$"
          decimals={2}
          icon={ArrowDown}
          gradient="gradient-orange"
          glowClass="stat-card-gradient stat-card-rose"
          delay={8}
        />
        <StatCard
          title="Profit Factor"
          value={stats.profitFactor === Infinity ? 99 : stats.profitFactor}
          decimals={2}
          icon={TrendingUp}
          gradient="gradient-blue"
          glowClass="stat-card-gradient stat-card-blue"
          delay={9}
        />
        <StatCard
          title="Psychology Score"
          value={stats.psychologyScore}
          suffix="%"
          icon={Brain}
          gradient="gradient-purple"
          glowClass="stat-card-gradient stat-card-purple"
          delay={10}
        />
        <StatCard
          title="Mood Score"
          value={stats.moodScore}
          suffix="/100"
          icon={Smile}
          gradient="gradient-emerald"
          glowClass="stat-card-gradient stat-card-emerald"
          delay={11}
        />
        <StatCard
          title="Total P&L"
          value={stats.totalPnl}
          prefix="$"
          decimals={2}
          icon={DollarSign}
          gradient={stats.totalPnl >= 0 ? "gradient-emerald" : "gradient-orange"}
          glowClass={stats.totalPnl >= 0 ? "stat-card-gradient stat-card-emerald" : "stat-card-gradient stat-card-rose"}
          delay={12}
        />
        <StatCard
          title="Expectancy"
          value={stats.expectancy}
          prefix="$"
          decimals={2}
          icon={Target}
          gradient="gradient-blue"
          glowClass="stat-card-gradient stat-card-blue"
          delay={13}
        />
        <StatCard
          title="Loss Rate"
          value={stats.lossRate}
          suffix="%"
          decimals={1}
          icon={ArrowDown}
          gradient="gradient-orange"
          glowClass="stat-card-gradient stat-card-rose"
          delay={14}
        />
        <StatCard
          title="Break-even %"
          value={stats.breakEvenRate}
          suffix="%"
          decimals={1}
          icon={Zap}
          gradient="gradient-purple"
          glowClass="stat-card-gradient stat-card-purple"
          delay={15}
        />
        <StatCard
          title="Current Loss Streak"
          value={stats.currentLossStreak}
          suffix=" losses"
          icon={Flame}
          gradient="gradient-orange"
          glowClass="stat-card-gradient stat-card-rose"
          delay={16}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PnlChart trades={trades} />
        </div>
        <WinRateChart trades={trades} />
      </div>

      {/* Calendar */}
      <CalendarHeatmap trades={trades} />

      {/* Recent Trades & Calculator Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <RecentTrades trades={trades} />
        
        {/* Right Column: Quote + Lot Size Calculator */}
        <div className="space-y-4 w-full">
          {/* Journal Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="rounded-2xl bg-card border border-border-subtle p-6"
          >
            <h3 className="text-base font-semibold text-foreground mb-1">Trading Quote</h3>
            <p className="text-sm text-foreground-subtle mb-5">Daily inspiration</p>
            <div className="relative p-6 rounded-xl bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 border border-white/[0.04]">
              <div className="text-4xl text-accent-blue/20 absolute top-3 left-4">&ldquo;</div>
              <blockquote className="text-[15px] text-foreground/90 leading-relaxed italic pl-4">
                The goal of a successful trader is to make the best trades. Money is secondary.
              </blockquote>
              <p className="text-sm text-foreground-subtle mt-4 pl-4">— Alexander Elder</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-foreground-subtle">Best Strategy</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {trades.length > 0
                    ? (() => {
                        const strategyWins: Record<string, number> = {};
                        trades.filter(t => t.result === 'Win').forEach(t => {
                          strategyWins[t.strategy] = (strategyWins[t.strategy] || 0) + 1;
                        });
                        const entries = Object.entries(strategyWins);
                        return entries.length > 0
                          ? entries.sort((a, b) => b[1] - a[1])[0][0]
                          : 'N/A';
                      })()
                    : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-foreground-subtle">Best Session</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {trades.length > 0
                    ? (() => {
                        const sessionPnl: Record<string, number> = {};
                        trades.forEach(t => {
                          sessionPnl[t.session] = (sessionPnl[t.session] || 0) + t.pnl;
                        });
                        const entries = Object.entries(sessionPnl);
                        return entries.length > 0
                          ? entries.sort((a, b) => b[1] - a[1])[0][0]
                          : 'N/A';
                      })()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* XAUUSD Lot Size Calculator Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <LotSizeCalculator className="w-full" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
