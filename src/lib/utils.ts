import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  
  if (value < 0) return `-${formatted}`;
  return value > 0 ? `+${formatted}` : formatted;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function calculatePnL(
  direction: 'Long' | 'Short',
  entry: number,
  exit: number,
  size: number
): number {
  const diff = direction === 'Long' ? exit - entry : entry - exit;
  return diff * size;
}

/**
 * Bulletproof XAUUSD P&L Calculation
 * Gold: 1 standard lot = 100 oz → $100 per $1 price move per lot
 * 
 * LONG:  Profit = (Exit - Entry) * LotSize * 100
 * SHORT: Profit = (Entry - Exit) * LotSize * 100
 * 
 * All inputs are parsed as strings to avoid JS floating-point issues.
 * Result is strictly formatted with .toFixed(2).
 */
export function calculateXAUUSDPnl(
  direction: 'Long' | 'Short',
  entry: string | number,
  exit: string | number,
  lotSize: string | number
): number {
  const e = parseFloat(String(entry));
  const x = parseFloat(String(exit));
  const lots = parseFloat(String(lotSize));

  if (isNaN(e) || isNaN(x) || isNaN(lots) || lots <= 0) return 0;

  const profit = direction === 'Long'
    ? (x - e) * lots * 100
    : (e - x) * lots * 100;

  return parseFloat(profit.toFixed(2));
}

export function calculateRR(
  direction: 'Long' | 'Short',
  entry: number,
  exit: number,
  stopLoss: number
): number {
  const risk = Math.abs(entry - stopLoss);
  const reward = direction === 'Long' ? exit - entry : entry - exit;
  if (risk === 0) return 0;
  return Number((reward / risk).toFixed(2));
}

export function getTradeResult(pnl: number): 'Win' | 'Loss' | 'Breakeven' {
  if (pnl > 0) return 'Win';
  if (pnl < 0) return 'Loss';
  return 'Breakeven';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getEmotionEmoji(emotion: string): string {
  const map: Record<string, string> = {
    Calm: '😌',
    Confident: '💪',
    Anxious: '😰',
    Fearful: '😨',
    Greedy: '🤑',
    Excited: '🤩',
    Frustrated: '😤',
    Revenge: '😡',
    FOMO: '😱',
    Bored: '😐',
    Disciplined: '🎯',
    Euphoric: '🥳',
  };
  return map[emotion] || '😶';
}

export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getDayOfWeek(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
