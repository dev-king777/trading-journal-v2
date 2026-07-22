'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CalendarDays, TrendingUp,
  ArrowUpRight, ArrowDownRight, X, Plus, BookOpen, Clock, Activity
} from 'lucide-react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
  isSameMonth, addMonths, subMonths, getDay, subDays, startOfWeek, endOfWeek
} from 'date-fns';
import AppLayout from '@/components/layout/AppLayout';
import { useTradeStore, useJournalStore } from '@/lib/store';
import Link from 'next/link';

export default function CalendarPage() {
  const trades = useTradeStore((s) => s.trades);
  const entries = useJournalStore((s) => s.entries);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get all days of the month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Group days into weeks (each row of the calendar)
  const weeks = useMemo(() => {
    const list: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // We want the grid to match standard weekly layout starting Sunday to Saturday
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const allGridDays = eachDayOfInterval({ start, end });
    
    allGridDays.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        list.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return list;
  }, [monthStart, monthEnd]);

  // Day mapping for Trades & Journals
  const dayTradesMap = useMemo(() => {
    const map: Record<string, typeof trades> = {};
    trades.filter(t => !t.isArchived).forEach((t) => {
      const key = format(new Date(t.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [trades]);

  const dayEntriesMap = useMemo(() => {
    const map: Record<string, typeof entries> = {};
    entries.forEach((e) => {
      const key = format(new Date(e.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  const dayPnlMap = useMemo(() => {
    const map: Record<string, number> = {};
    trades.filter(t => !t.isArchived).forEach((t) => {
      const key = format(new Date(t.date), 'yyyy-MM-dd');
      map[key] = (map[key] || 0) + t.pnl;
    });
    return map;
  }, [trades]);

  // Monthly stats calculations
  const monthNetPnl = useMemo(() => {
    let total = 0;
    daysInMonth.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd');
      total += dayPnlMap[key] || 0;
    });
    return total;
  }, [daysInMonth, dayPnlMap]);

  // Selected Day Details
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  const selectedDayTrades = selectedDay ? dayTradesMap[selectedDayKey] || [] : [];
  const selectedDayEntries = selectedDay ? dayEntriesMap[selectedDayKey] || [] : [];
  const selectedDayPnl = selectedDay ? dayPnlMap[selectedDayKey] || 0 : 0;

  // GitHub contribution calendar setup (past 365 days)
  const gitContributionDays = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 365; i >= 0; i--) {
      const date = subDays(today, i);
      const key = format(date, 'yyyy-MM-dd');
      const tradesCount = dayTradesMap[key]?.length || 0;
      const journalCount = dayEntriesMap[key]?.length || 0;
      const intensity = Math.min(4, tradesCount + journalCount); // intensity 0-4
      list.push({ date, intensity, key, pnl: dayPnlMap[key] || 0 });
    }
    return list;
  }, [dayTradesMap, dayEntriesMap, dayPnlMap]);

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Calendar</h2>
          <p className="text-foreground-subtle mt-1">Track daily performance, trade logs, and weekly summaries</p>
        </motion.div>

        {/* GitHub Style Contribution Calendar Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border-subtle p-6 space-y-3"
        >
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
            Heatmap Activity
          </h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-[700px] h-32 items-end">
              {/* Group into weekly column chunks */}
              {Array.from({ length: 53 }).map((_, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, rowIndex) => {
                    const dayIndex = colIndex * 7 + rowIndex;
                    const item = gitContributionDays[dayIndex];
                    if (!item) return <div key={rowIndex} className="w-[10px] h-[10px]" />;
                    const isSelected = selectedDay && isSameDay(item.date, selectedDay);

                    // Colors based on pnl/intensity
                    let colorClass = 'bg-white/5';
                    if (item.intensity > 0) {
                      if (item.pnl > 0) {
                        colorClass = item.pnl > 100 ? 'bg-profit' : 'bg-profit/50';
                      } else if (item.pnl < 0) {
                        colorClass = item.pnl < -100 ? 'bg-loss' : 'bg-loss/50';
                      } else {
                        colorClass = 'bg-accent-blue/40';
                      }
                    }

                    return (
                      <button
                        key={rowIndex}
                        onClick={() => setSelectedDay(item.date)}
                        className={`w-[10px] h-[10px] rounded-sm transition-all hover:scale-125 ${colorClass} ${
                          isSelected ? 'ring-2 ring-accent-blue ring-offset-2 ring-offset-black' : ''
                        }`}
                        title={`${format(item.date, 'MMM d, yyyy')}: ${item.intensity} items logged. Day PnL: $${item.pnl.toFixed(0)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-foreground-subtle">
            <span>365 days ago</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-sm bg-white/5" />
              <div className="w-2.5 h-2.5 rounded-sm bg-profit/40" />
              <div className="w-2.5 h-2.5 rounded-sm bg-profit" />
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </motion.div>

        {/* Main Grid Calendar Section */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Calendar Grid Container (Span 3 for 8-column layout spacing) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="xl:col-span-3 rounded-2xl bg-[#0e0e11] border border-border-subtle p-6"
          >
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setCurrentMonth(new Date());
                    setSelectedDay(new Date());
                  }}
                  className="px-4 py-1.5 rounded-lg border border-border-subtle bg-[#18181b] hover:bg-white/[0.04] text-xs font-semibold text-foreground transition-colors"
                >
                  Today
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-foreground-subtle" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-foreground-subtle" />
                  </button>
                </div>
              </div>

              {/* Month & Month Net P&L */}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <span className={`text-sm font-bold ${monthNetPnl > 0 ? 'text-profit' : monthNetPnl < 0 ? 'text-loss' : 'text-gray-400'}`}>
                  {monthNetPnl > 0 ? '+$' : monthNetPnl < 0 ? '-$' : '$'}{Math.abs(monthNetPnl).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Calendar Grid — 8-Column Layout (7 Days + 1 Weekly Summary) */}
            <div className="grid grid-cols-8 gap-[1px] bg-border-subtle/40 rounded-xl overflow-hidden border border-border-subtle/50">
              
              {/* Header Days */}
              {['SUN', 'MON', 'TUE', 'WED', 'THR', 'FRI', 'SAT'].map((d) => (
                <div key={d} className="bg-[#0e0e11] text-center text-[10px] font-bold text-foreground-subtle/60 py-3 uppercase tracking-wider">
                  {d}
                </div>
              ))}
              <div className="bg-[#0e0e11] text-center text-[10px] font-bold text-accent-blue/80 py-3 uppercase tracking-wider">
                WEEKLY
              </div>

              {/* Weeks & Days */}
              {weeks.map((week, weekIndex) => {
                // Calculate weekly summary metrics
                let weekPnl = 0;
                let weekTradesCount = 0;
                let hasWeekActivity = false;

                week.forEach((day) => {
                  if (isSameMonth(day, currentMonth)) {
                    const key = format(day, 'yyyy-MM-dd');
                    weekPnl += dayPnlMap[key] || 0;
                    const tradesCount = dayTradesMap[key]?.length || 0;
                    weekTradesCount += tradesCount;
                    if (tradesCount > 0) hasWeekActivity = true;
                  }
                });

                return (
                  <React.Fragment key={weekIndex}>
                    {/* Render the 7 days of the week */}
                    {week.map((day) => {
                      const key = format(day, 'yyyy-MM-dd');
                      const pnl = dayPnlMap[key];
                      const dayTrades = dayTradesMap[key] || [];
                      const isToday = isSameDay(day, new Date());
                      const isSelected = selectedDay && isSameDay(day, selectedDay);
                      const isCurrentMonth = isSameMonth(day, currentMonth);

                      // Style color-coded background based on PnL value
                      let cellStyle = 'bg-[#0e0e11] border-transparent';
                      let pnlColor = 'text-foreground-subtle';
                      
                      if (isCurrentMonth) {
                        if (dayTrades.length > 0) {
                          if (pnl > 0) {
                            cellStyle = 'bg-[#122420] border-[#22c55e]/25 text-[#22c55e]';
                            pnlColor = 'text-[#22c55e]';
                          } else if (pnl < 0) {
                            cellStyle = 'bg-[#29161a] border-[#ef4444]/25 text-[#ef4444]';
                            pnlColor = 'text-[#ef4444]';
                          } else {
                            cellStyle = 'bg-[#18181b] border-white/5 text-foreground';
                            pnlColor = 'text-foreground';
                          }
                        } else {
                          cellStyle = 'bg-[#0e0e11] hover:bg-white/[0.02] border-transparent';
                        }
                      } else {
                        // Days outside current month
                        cellStyle = 'bg-[#0b0b0d] opacity-25 border-transparent pointer-events-none';
                      }

                      return (
                        <button
                          key={key}
                          onClick={() => isCurrentMonth && setSelectedDay(day)}
                          className={`aspect-video p-2 flex flex-col justify-between text-left transition-all border ${cellStyle} ${
                            isSelected ? 'ring-1 ring-accent-blue/50 z-10' : ''
                          }`}
                        >
                          {/* Day Number */}
                          <div className="flex justify-between items-center w-full">
                            <span className={`text-[11px] font-bold ${isToday ? 'text-accent-blue underline underline-offset-2' : 'text-foreground-subtle'}`}>
                              {format(day, 'd')}
                            </span>
                          </div>

                          {/* P&L Display */}
                          {dayTrades.length > 0 && pnl !== undefined ? (
                            <div className={`text-xs font-bold leading-tight tabular-nums ${pnlColor}`}>
                              {pnl >= 0 ? '+$' : '-$'}{Math.abs(pnl).toFixed(2)}
                            </div>
                          ) : (
                            <div className="h-3" />
                          )}

                          {/* Trades Count */}
                          {dayTrades.length > 0 ? (
                            <div className="text-[9px] text-foreground-subtle/70 leading-none">
                              {dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'}
                            </div>
                          ) : (
                            <div className="h-2" />
                          )}
                        </button>
                      );
                    })}

                    {/* Column 8: Weekly Stats */}
                    <div className="bg-[#111115] border-l border-border-subtle/50 flex flex-col justify-center items-center text-center p-2 text-xs">
                      {weekTradesCount > 0 ? (
                        <div className="space-y-1">
                          <p className={`font-bold tabular-nums ${weekPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {weekPnl >= 0 ? '+$' : '-$'}{Math.abs(weekPnl).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-foreground-subtle font-medium">
                            {weekTradesCount} {weekTradesCount === 1 ? 'Trade' : 'Trades'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-bold text-foreground-subtle/40">$0.00</p>
                          <p className="text-[9px] text-foreground-subtle/30">0 Trades</p>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          {/* Interactive Day Details Drawer */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border border-border-subtle p-6 flex flex-col justify-between h-full"
          >
            {selectedDay ? (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {format(selectedDay, 'EEEE, MMMM d')}
                    </h3>
                    <p className="text-xs text-foreground-subtle mt-0.5">Daily execution breakdown</p>
                  </div>
                </div>

                {/* Day stats card */}
                {selectedDayTrades.length > 0 && (
                  <div className={`p-4 rounded-xl ${
                    selectedDayPnl > 0 ? 'bg-profit/5 border border-profit/10' : selectedDayPnl < 0 ? 'bg-loss/5 border border-loss/10' : 'bg-white/[0.02] border border-white/[0.06]'
                  }`}>
                    <p className="text-xs text-foreground-subtle">Day Net P&L</p>
                    <p className={`text-2xl font-bold ${selectedDayPnl > 0 ? 'text-[#22c55e]' : selectedDayPnl < 0 ? 'text-[#ef4444]' : 'text-gray-400'}`}>
                      {selectedDayPnl > 0 ? '+$' : selectedDayPnl < 0 ? '-$' : '$'}{Math.abs(selectedDayPnl).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Trade details lists */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Trades ({selectedDayTrades.length})</h4>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {selectedDayTrades.map((t) => (
                        <Link href={`/trades/${t.id}`} key={t.id} className="block p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              {t.direction === 'Long' ? <ArrowUpRight className="w-3.5 h-3.5 text-[#22c55e]" /> : <ArrowDownRight className="w-3.5 h-3.5 text-[#ef4444]" />}
                              <span>{t.pair}</span>
                            </div>
                            <span className={`text-xs font-bold ${t.pnl > 0 ? 'text-[#22c55e]' : t.pnl < 0 ? 'text-[#ef4444]' : 'text-gray-400'}`}>
                              {t.pnl > 0 ? '+$' : t.pnl < 0 ? '-$' : '$'}{Math.abs(t.pnl).toFixed(0)}
                            </span>
                          </div>
                          <p className="text-[10px] text-foreground-subtle mt-0.5">{t.strategy} · {t.timeframe}</p>
                        </Link>
                      ))}
                      {selectedDayTrades.length === 0 && (
                        <p className="text-xs text-foreground-subtle">No trades logged.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Journal Notes ({selectedDayEntries.length})</h4>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                      {selectedDayEntries.map((e) => (
                        <Link href="/journal" key={e.id} className="block p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <BookOpen className="w-3.5 h-3.5 text-accent-blue" />
                            <span className="truncate">{e.title}</span>
                          </div>
                          <p className="text-[10px] text-foreground-subtle mt-0.5 capitalize">{e.type}</p>
                        </Link>
                      ))}
                      {selectedDayEntries.length === 0 && (
                        <p className="text-xs text-foreground-subtle">No notes written.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Day additions buttons triggers */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/[0.04]">
                  <Link href={`/trades/new?date=${selectedDayKey}`} className="btn-secondary py-2 text-xs flex justify-center items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Log Trade
                  </Link>
                  <Link href="/journal" className="btn-primary py-2 text-xs flex justify-center items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Note
                  </Link>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 flex-1 flex flex-col justify-center items-center">
                <CalendarDays className="w-10 h-10 text-foreground-subtle/30 mb-3" />
                <p className="text-sm text-foreground-subtle">Select a day on the calendar or heatmap to view detailed executions</p>
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </AppLayout>
  );
}
