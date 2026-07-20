'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Clock } from 'lucide-react';
import { Trade } from '@/lib/types';
import { getEmotionEmoji, getRelativeTime } from '@/lib/utils';

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  const recent = trades.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border-subtle p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Trades</h3>
          <p className="text-sm text-foreground-subtle mt-0.5">Your latest activity</p>
        </div>
        <Link
          href="/trades"
          className="text-xs font-medium text-accent-blue hover:text-accent-blue-light transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-2">
        {recent.map((trade, i) => (
          <motion.div
            key={trade.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.06, duration: 0.3 }}
          >
            <Link href={`/trades/${trade.id}`}>
              <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all duration-200 group cursor-pointer">
                {/* Direction icon */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    trade.direction === 'Long'
                      ? 'bg-profit/10 text-profit'
                      : 'bg-loss/10 text-loss'
                  }`}
                >
                  {trade.direction === 'Long' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>

                {/* Pair & Strategy */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {trade.pair}
                    </span>
                    <span className={`badge text-[10px] ${
                      trade.result === 'Win' ? 'badge-win' : trade.result === 'Loss' ? 'badge-loss' : 'badge-breakeven'
                    }`}>
                      {trade.result}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-foreground-subtle">{trade.strategy}</span>
                    <span className="text-foreground-subtle/30">·</span>
                    <span className="text-xs text-foreground-subtle">{trade.timeframe}</span>
                  </div>
                </div>

                {/* PnL & Emotion */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${
                    trade.pnl >= 0 ? 'text-profit' : 'text-loss'
                  }`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className="text-xs">{getEmotionEmoji(trade.emotionBefore)}</span>
                    <span className="text-[11px] text-foreground-subtle">
                      {getRelativeTime(trade.date)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
