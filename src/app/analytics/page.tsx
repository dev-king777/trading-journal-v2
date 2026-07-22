'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import { useTradeStore } from '@/lib/store';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Clock, ShieldAlert, Award } from 'lucide-react';

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-black/90 border border-border-subtle p-3 rounded-xl shadow-2xl">
        <p className="text-xs text-foreground-subtle mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color || p.fill }}>
            {p.name}: {typeof p.value === 'number' ? `${p.value > 0 ? '+$' : p.value < 0 ? '-$' : '$'}${Math.abs(p.value).toFixed(2)}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const trades = useTradeStore((s) => s.trades);
  const getStats = useTradeStore((s) => s.getStats);
  const stats = getStats();

  useEffect(() => { setMounted(true); }, []);

  // Chronologically sorted active trades
  const chronologicalTrades = useMemo(() => {
    return [...trades]
      .filter(t => !t.isArchived)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades]);

  // Equity Curve & Drawdown Calculations
  const { equityCurveData, maxDrawdown, bestDay, worstDay } = useMemo(() => {
    let currentEquity = 10000; // Base starting size of $10,000 for realistic simulation
    let peakEquity = 10000;
    let maxDd = 0;
    
    const curve = chronologicalTrades.map((t) => {
      currentEquity += t.pnl;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const dd = peakEquity - currentEquity;
      if (dd > maxDd) {
        maxDd = dd;
      }
      return {
        name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Balance: Number(currentEquity.toFixed(2)),
        Drawdown: Number(dd.toFixed(2)),
        pnl: t.pnl
      };
    });

    // Best/Worst Day aggregation
    const dayPnlAgg: Record<string, number> = {};
    chronologicalTrades.forEach((t) => {
      const dateKey = new Date(t.date).toDateString();
      dayPnlAgg[dateKey] = (dayPnlAgg[dateKey] || 0) + t.pnl;
    });

    const dayAggVals = Object.values(dayPnlAgg);
    const bDay = dayAggVals.length > 0 ? Math.max(...dayAggVals) : 0;
    const wDay = dayAggVals.length > 0 ? Math.min(...dayAggVals) : 0;

    return {
      equityCurveData: curve,
      maxDrawdown: maxDd,
      bestDay: bDay,
      worstDay: wDay
    };
  }, [chronologicalTrades]);

  // Strategy performance
  const strategyData = useMemo(() => {
    const map: Record<string, number> = {};
    chronologicalTrades.forEach((t) => {
      map[t.strategy] = (map[t.strategy] || 0) + t.pnl;
    });
    return Object.entries(map).map(([name, pnl]) => ({
      name: name.substring(0, 15),
      pnl: Number(pnl.toFixed(2)),
    }));
  }, [chronologicalTrades]);

  // Session performance
  const sessionData = useMemo(() => {
    const map: Record<string, number> = { Asian: 0, London: 0, 'New York': 0, Sydney: 0, Overlap: 0 };
    chronologicalTrades.forEach((t) => {
      if (t.session && map[t.session] !== undefined) {
        map[t.session] += t.pnl;
      }
    });
    return Object.entries(map).map(([name, pnl]) => ({ name, pnl: Number(pnl.toFixed(2)) }));
  }, [chronologicalTrades]);

  // Day of week performance
  const dayData = useMemo(() => {
    const dayMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
    chronologicalTrades.forEach((t) => {
      const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' });
      if (dayMap[day] !== undefined) dayMap[day] += t.pnl;
    });
    return Object.entries(dayMap).map(([name, pnl]) => ({ name, pnl: Number(pnl.toFixed(2)) }));
  }, [chronologicalTrades]);

  // Hour performance mapping
  const hourData = useMemo(() => {
    const hourMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourMap[i] = 0;

    chronologicalTrades.forEach((t) => {
      const hour = new Date(t.date).getHours();
      hourMap[hour] += t.pnl;
    });

    return Object.entries(hourMap).map(([hourStr, pnl]) => ({
      name: `${hourStr}:00`,
      pnl: Number(pnl.toFixed(2)),
    })).filter(h => h.pnl !== 0); // only show active hours
  }, [chronologicalTrades]);

  // Market distribution
  const marketData = useMemo(() => {
    const map: Record<string, number> = {};
    chronologicalTrades.forEach((t) => { map[t.market] = (map[t.market] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [chronologicalTrades]);

  // Pair performance
  const pairData = useMemo(() => {
    const map: Record<string, number> = {};
    chronologicalTrades.forEach((t) => {
      map[t.pair] = (map[t.pair] || 0) + t.pnl;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, pnl]) => ({ name, pnl: Number(pnl.toFixed(2)) }));
  }, [chronologicalTrades]);

  // RR Distribution
  const rrData = useMemo(() => {
    const buckets: Record<string, number> = { '<0R': 0, '0-1R': 0, '1-2R': 0, '2-3R': 0, '3R+': 0 };
    chronologicalTrades.forEach((t) => {
      if (t.rrRatio < 0) buckets['<0R']++;
      else if (t.rrRatio < 1) buckets['0-1R']++;
      else if (t.rrRatio < 2) buckets['1-2R']++;
      else if (t.rrRatio < 3) buckets['2-3R']++;
      else buckets['3R+']++;
    });
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [chronologicalTrades]);

  const pieColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Analytics</h2>
          <p className="text-foreground-subtle mt-1">Deep dive into your trading performance metrics</p>
        </motion.div>

        {!mounted ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-lg gradient-blue animate-pulse" />
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"
            >
              {[
                { label: 'Total P&L', value: `$${stats.totalPnl.toFixed(2)}`, color: stats.totalPnl >= 0 ? 'text-profit' : 'text-loss', icon: TrendingUp },
                { label: 'Win Rate', value: `${stats.winRate}%`, color: 'text-accent-blue', icon: Award },
                { label: 'Max Drawdown', value: `$${maxDrawdown.toFixed(2)}`, color: 'text-loss', icon: ShieldAlert },
                { label: 'Average Hold Time', value: stats.averageHoldTime, color: 'text-accent-purple', icon: Clock },
                { label: 'Best Day', value: `$${bestDay.toFixed(2)}`, color: 'text-profit', icon: ArrowUpRight },
                { label: 'Worst Day', value: `$${worstDay.toFixed(2)}`, color: 'text-loss', icon: ArrowDownRight },
              ].map((m) => (
                <div key={m.label} className="p-4 rounded-xl bg-card border border-border-subtle">
                  <div className="flex items-center gap-1.5 mb-1 text-foreground-subtle">
                    <m.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{m.label}</span>
                  </div>
                  <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Main Equity Curve & Drawdown Area Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Equity curve */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="lg:col-span-2 rounded-2xl bg-card border border-border-subtle p-6"
              >
                <h3 className="text-base font-semibold text-foreground mb-1">Equity Curve</h3>
                <p className="text-xs text-foreground-subtle mb-6">Chronological balance growth (Base $10,000)</p>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveData}>
                      <defs>
                        <linearGradient id="equityPnl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Balance" stroke="#3b82f6" strokeWidth={2} fill="url(#equityPnl)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Drawdown Curve */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="rounded-2xl bg-card border border-border-subtle p-6"
              >
                <h3 className="text-base font-semibold text-foreground mb-1">Drawdown</h3>
                <p className="text-xs text-foreground-subtle mb-6">Cumulative decline from peak equity</p>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveData}>
                      <defs>
                        <linearGradient id="drawdownPnl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#drawdownPnl)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Performance breakdown Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pair Performance */}
              <div className="p-6 rounded-2xl bg-card border border-border-subtle">
                <h3 className="text-sm font-bold text-foreground mb-1">Pair Performance</h3>
                <p className="text-xs text-foreground-subtle mb-6">Net P&L of top instruments traded</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pairData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis type="number" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                        {pairData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Strategy Performance */}
              <div className="p-6 rounded-2xl bg-card border border-border-subtle">
                <h3 className="text-sm font-bold text-foreground mb-1">Strategy Performance</h3>
                <p className="text-xs text-foreground-subtle mb-6">Net P&L by setups</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strategyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {strategyData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Session Performance */}
              <div className="p-6 rounded-2xl bg-card border border-border-subtle">
                <h3 className="text-sm font-bold text-foreground mb-1">Session Performance</h3>
                <p className="text-xs text-foreground-subtle mb-6">Net P&L by trading hours session</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {sessionData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Performance breakdown Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Day of Week */}
              <div className="p-6 rounded-2xl bg-card border border-border-subtle lg:col-span-2">
                <h3 className="text-sm font-bold text-foreground mb-1">Day of Week Performance</h3>
                <p className="text-xs text-foreground-subtle mb-6">Net P&L by weekday</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {dayData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hour of Day */}
              <div className="p-6 rounded-2xl bg-card border border-border-subtle">
                <h3 className="text-sm font-bold text-foreground mb-1">Hour Performance</h3>
                <p className="text-xs text-foreground-subtle mb-6">Net P&L by hour</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                        {hourData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Market Distribution */}
              <div className="p-6 rounded-2xl bg-card border border-border-subtle">
                <h3 className="text-sm font-bold text-foreground mb-1">Market Allocation</h3>
                <p className="text-xs text-foreground-subtle mb-6">Number of trades by asset class</p>
                <div className="h-[220px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={marketData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {marketData.map((e, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} trades`, 'Trades']} />
                      <Legend verticalAlign="bottom" iconType="circle" iconSize={6} formatter={(value) => <span className="text-[10px] text-foreground-subtle ml-1">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
