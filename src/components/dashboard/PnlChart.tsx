'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Trade } from '@/lib/types';

interface PnlChartProps {
  trades: Trade[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-foreground-subtle mb-1">{label}</p>
        <p className={`text-sm font-semibold ${payload[0].value >= 0 ? 'text-profit' : 'text-loss'}`}>
          {payload[0].value >= 0 ? '+' : ''}${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
}

export default function PnlChart({ trades }: PnlChartProps) {
  // Build cumulative PnL data
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let cumPnl = 0;
  const data = sorted.map((trade, i) => {
    cumPnl += trade.pnl;
    const date = new Date(trade.date);
    return {
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: Number(cumPnl.toFixed(2)),
      trade: trade.pair,
    };
  });

  const maxPnl = Math.max(...data.map((d) => d.pnl), 0);
  const minPnl = Math.min(...data.map((d) => d.pnl), 0);
  const isPositive = data.length > 0 && data[data.length - 1].pnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border-subtle p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Equity Curve</h3>
          <p className="text-sm text-foreground-subtle mt-0.5">Cumulative P&L over time</p>
        </div>
        {data.length > 0 && (
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
            isPositive ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss'
          }`}>
            {isPositive ? '+' : ''}${data[data.length - 1].pnl.toFixed(2)}
          </div>
        )}
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="pnlGradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pnlGradientNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717A', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717A', fontSize: 11 }}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={isPositive ? '#22C55E' : '#EF4444'}
              strokeWidth={2.5}
              fill={isPositive ? 'url(#pnlGradientPositive)' : 'url(#pnlGradientNegative)'}
              dot={false}
              activeDot={{
                r: 5,
                fill: isPositive ? '#22C55E' : '#EF4444',
                stroke: '#111113',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
