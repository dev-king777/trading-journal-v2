'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  gradient: string;
  glowClass: string;
  delay?: number;
}

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>(null);
  const startTime = useRef<number>(null);

  useEffect(() => {
    const duration = 1200;
    const startVal = 0;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startVal + (value - startVal) * eased);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value]);

  const formatted = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  icon: Icon,
  trend,
  trendLabel,
  gradient,
  glowClass,
  delay = 0,
}: StatCardProps) {
  const isPositive = value >= 0;
  const isPnl = prefix === '$' || prefix === '+$' || prefix === '-$';
  const displayPrefix = isPnl ? (value >= 0 ? '+$' : '-$') : prefix;
  const displayValue = isPnl ? Math.abs(value) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`relative overflow-hidden rounded-2xl bg-card border border-border-subtle p-5 group hover:border-border transition-all duration-300 stat-card-gradient ${glowClass}`}
    >
      {/* Gradient accent */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 ${gradient}`}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-[13px] font-medium text-foreground-subtle">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${gradient} bg-opacity-10`}
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Icon className="w-4 h-4 text-foreground-muted" />
        </div>
      </div>

      {/* Value */}
      <div className="relative z-10">
        <p className={`text-2xl font-bold tracking-tight ${
          isPnl ? (isPositive ? 'text-profit' : 'text-loss') : 'text-foreground'
        }`}>
          <AnimatedNumber
            value={displayValue}
            prefix={displayPrefix}
            suffix={suffix}
            decimals={decimals}
          />
        </p>

        {/* Trend */}
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-xs font-semibold ${
              trend >= 0 ? 'text-profit' : 'text-loss'
            }`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
            {trendLabel && (
              <span className="text-xs text-foreground-subtle">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
