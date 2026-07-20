'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight, Star
} from 'lucide-react';
import { Trade } from '@/lib/types';
import { getRelativeTime } from '@/lib/utils';
import { useTradeStore } from '@/lib/store';

interface TradeCardProps {
  trade: Trade;
  index: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  selectionMode?: boolean;
}

const DEFAULT_CHARTS = [
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1618044733300-9472054094ee?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
];

export default function TradeCard({
  trade,
  index,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: TradeCardProps) {
  const toggleFavorite = useTradeStore((s) => s.toggleFavorite);

  // Pick a chart image based on the trade ID so it remains consistent
  const getChartImage = () => {
    if (trade.screenshotUrl && (trade.screenshotUrl.startsWith('http') || trade.screenshotUrl.startsWith('data:image'))) {
      return trade.screenshotUrl;
    }
    // Fall back to a premium Unsplash chart screenshot
    const charCodeSum = trade.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return DEFAULT_CHARTS[charCodeSum % DEFAULT_CHARTS.length];
  };

  const chartUrl = getChartImage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className={`group relative rounded-2xl overflow-hidden bg-card border transition-all duration-200 hover:shadow-xl hover:shadow-black/20 ${
        isSelected ? 'border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue/30' : 'border-border-subtle hover:border-white/15'
      }`}
    >
      {/* Selection Checkbox */}
      {(selectionMode || isSelected) && onSelect && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(trade.id);
          }}
          className={`absolute top-3 left-3 z-20 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-accent-blue border-accent-blue text-white'
              : 'border-white/30 bg-black/60 backdrop-blur-sm hover:border-white/60'
          }`}
        >
          {isSelected && <span className="text-[10px] font-bold">✓</span>}
        </button>
      )}

      <Link href={`/trades/${trade.id}`} className="block">
        {/* Large Screenshot Header Image (h-56 instead of h-36 for major prominence) */}
        <div className="relative w-full h-56 bg-black/20 overflow-hidden border-b border-white/[0.04]">
          <img
            src={chartUrl}
            alt={`${trade.pair} chart`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          
          {/* Overlaid badges */}
          <div className="absolute top-3 right-3 z-10">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${
              trade.result === 'Win'
                ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                : trade.result === 'Loss'
                ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                : 'bg-white/10 text-foreground-subtle border border-white/10'
            }`}>
              {trade.result}
            </span>
          </div>
          
          <div className="absolute top-3 left-3 z-10">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm ${
              trade.direction === 'Long' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'
            }`}>
              {trade.direction === 'Long' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Minimal Content Body — Clean product details card */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground group-hover:text-accent-blue transition-colors tracking-tight">{trade.pair}</h3>
              <p className="text-[11px] text-foreground-subtle">{trade.strategy} · {trade.timeframe}</p>
            </div>
            
            <div className="text-right">
              <p className={`text-base font-bold tabular-nums ${trade.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
              </p>
              <span className="text-[10px] text-foreground-subtle">{getRelativeTime(trade.date)}</span>
            </div>
          </div>

          {/* Action trigger overlay indicator */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
            <span className="text-[10px] text-foreground-subtle/50">Click to enter trade details</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(trade.id);
              }}
              className="p-1 rounded hover:bg-white/[0.04] transition-colors"
            >
              <Star className={`w-3.5 h-3.5 ${
                trade.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-foreground-subtle/30'
              }`} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
