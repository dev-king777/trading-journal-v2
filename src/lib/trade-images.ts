import type { Trade } from './types';

export const TRADE_RESULT_IMAGES = {
  win: '/trade-results/win.png',
  loss: '/trade-results/loss.png',
  breakeven: '/trade-results/breakeven.png',
  payout: '/trade-results/payout.png',
} as const;

export function isPayoutTrade(trade: Pick<Trade, 'tags' | 'strategy' | 'setup' | 'notes'>): boolean {
  return (
    trade.tags?.some((tag) => tag.toLowerCase() === 'payout') ||
    /\bpayout\b/i.test(`${trade.strategy} ${trade.setup} ${trade.notes}`)
  );
}

export function getTradeResultImage(
  trade: Pick<Trade, 'result' | 'pnl' | 'tags' | 'strategy' | 'setup' | 'notes'>
): string {
  if (isPayoutTrade(trade)) return TRADE_RESULT_IMAGES.payout;
  if (trade.result === 'Breakeven' || Math.abs(trade.pnl) <= 0.01) return TRADE_RESULT_IMAGES.breakeven;
  if (trade.result === 'Win' || trade.pnl > 0) return TRADE_RESULT_IMAGES.win;
  return TRADE_RESULT_IMAGES.loss;
}

export function getManualTradeImages(screenshotUrl: string): string[] {
  if (!screenshotUrl) return [];
  if (screenshotUrl.startsWith('data:image')) return [screenshotUrl];

  return screenshotUrl
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'));
}
