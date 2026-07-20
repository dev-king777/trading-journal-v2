'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trade } from '@/lib/types';

interface WinRateChartProps {
  trades: Trade[];
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-xs font-medium" style={{ color: payload[0].payload.color }}>
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
}

export default function WinRateChart({ trades }: WinRateChartProps) {
  const wins = trades.filter((t) => t.result === 'Win').length;
  const losses = trades.filter((t) => t.result === 'Loss').length;
  const breakeven = trades.filter((t) => t.result === 'Breakeven').length;
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : '0';

  const data = [
    { name: 'Wins', value: wins, color: '#22C55E' },
    { name: 'Losses', value: losses, color: '#EF4444' },
    { name: 'Breakeven', value: breakeven, color: '#F59E0B' },
  ].filter((d) => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border-subtle p-6"
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Win Rate</h3>
        <p className="text-sm text-foreground-subtle mt-0.5">Trade outcome distribution</p>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{winRate}%</span>
            <span className="text-xs text-foreground-subtle">Win Rate</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-xs text-foreground-subtle">
              {entry.value} {entry.name}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
