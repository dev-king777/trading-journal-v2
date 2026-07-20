'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trade } from '@/lib/types';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, isSameDay, getDay, subMonths, addMonths
} from 'date-fns';

interface CalendarHeatmapProps {
  trades: Trade[];
}

export default function CalendarHeatmap({ trades }: CalendarHeatmapProps) {
  const now = new Date();

  // Build a 5-month view
  const months = useMemo(() => {
    const result = [];
    for (let i = 4; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const days = eachDayOfInterval({ start, end });

      result.push({
        label: format(monthDate, 'MMM'),
        days,
      });
    }
    return result;
  }, []);

  // Map trades to days
  const dayPnlMap = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach((trade) => {
      const key = format(new Date(trade.date), 'yyyy-MM-dd');
      map[key] = (map[key] || 0) + trade.pnl;
    });
    return map;
  }, [trades]);

  const getColor = (pnl: number | undefined): string => {
    if (pnl === undefined) return 'rgba(255,255,255,0.03)';
    if (pnl > 200) return 'rgba(34, 197, 94, 0.7)';
    if (pnl > 100) return 'rgba(34, 197, 94, 0.5)';
    if (pnl > 0) return 'rgba(34, 197, 94, 0.3)';
    if (pnl === 0) return 'rgba(245, 158, 11, 0.3)';
    if (pnl > -100) return 'rgba(239, 68, 68, 0.3)';
    if (pnl > -200) return 'rgba(239, 68, 68, 0.5)';
    return 'rgba(239, 68, 68, 0.7)';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border-subtle p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Trading Calendar</h3>
          <p className="text-sm text-foreground-subtle mt-0.5">Daily P&L heatmap</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-foreground-subtle">
          <span>Loss</span>
          <div className="flex gap-0.5">
            {['rgba(239,68,68,0.5)', 'rgba(239,68,68,0.3)', 'rgba(255,255,255,0.03)', 'rgba(34,197,94,0.3)', 'rgba(34,197,94,0.5)'].map(
              (c, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: c }}
                />
              )
            )}
          </div>
          <span>Profit</span>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-2">
        {months.map((month) => (
          <div key={month.label} className="flex-shrink-0">
            <p className="text-[11px] font-medium text-foreground-subtle mb-2">{month.label}</p>
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div
                  key={i}
                  className="w-4 h-4 flex items-center justify-center text-[8px] text-foreground-subtle/40"
                >
                  {d}
                </div>
              ))}

              {/* Empty cells for offset */}
              {Array.from({ length: (getDay(month.days[0]) + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="w-4 h-4" />
              ))}

              {/* Day cells */}
              {month.days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const pnl = dayPnlMap[key];
                const isToday = isSameDay(day, now);

                return (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.5 }}
                    className="relative w-4 h-4 rounded-sm cursor-pointer group"
                    style={{ background: getColor(pnl) }}
                    title={pnl !== undefined ? `${format(day, 'MMM d')}: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : format(day, 'MMM d')}
                  >
                    {isToday && (
                      <div className="absolute inset-0 rounded-sm border border-accent-blue" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
