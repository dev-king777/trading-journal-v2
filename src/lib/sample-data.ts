import { Trade, JournalEntry } from './types';

const strategies = ['Order Block', 'Fair Value Gap', 'Break of Structure', 'Liquidity Sweep', 'Supply & Demand', 'ICT Silver Bullet'];
const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD', 'NAS100', 'SPX500', 'XAUUSD', 'GBP/JPY', 'AUD/USD'];

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 7);
  d.setMinutes(Math.floor(Math.random() * 60));
  return d.toISOString();
}

function r(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

const emotions = ['Calm', 'Confident', 'Disciplined', 'Anxious', 'Fearful', 'Excited', 'Frustrated', 'FOMO', 'Greedy'] as const;

function createTrade(daysBack: number, idx: number): Trade {
  const direction = Math.random() > 0.45 ? 'Long' : 'Short' as const;
  const pair = pairs[idx % pairs.length];
  const isWin = Math.random() > 0.4;
  const entry = pair.includes('BTC') ? r(60000, 72000) : pair.includes('XAU') ? r(2300, 2500) : pair.includes('NAS') ? r(18000, 20000) : r(1.05, 1.85);
  const sl = direction === 'Long' ? entry * (1 - r(0.002, 0.01)) : entry * (1 + r(0.002, 0.01));
  const risk = Math.abs(entry - sl);
  const rrTarget = r(1.5, 4);
  const exit = isWin
    ? (direction === 'Long' ? entry + risk * rrTarget : entry - risk * rrTarget)
    : (direction === 'Long' ? entry - risk * r(0.3, 1) : entry + risk * r(0.3, 1));
  const pnl = direction === 'Long' ? (exit - entry) * r(0.1, 2) : (entry - exit) * r(0.1, 2);
  const rr = risk > 0 ? (direction === 'Long' ? (exit - entry) / risk : (entry - exit) / risk) : 0;
  const date = randomDate(daysBack);

  return {
    id: `trade-${Date.now()}-${idx}`,
    pair,
    market: pair.includes('BTC') || pair.includes('ETH') ? 'Crypto' : pair.includes('NAS') || pair.includes('SPX') ? 'Indices' : pair.includes('XAU') ? 'Commodities' : 'Forex',
    direction,
    result: pnl > 5 ? 'Win' : pnl < -5 ? 'Loss' : 'Breakeven',
    entryPrice: Number(entry.toFixed(pair.includes('JPY') ? 3 : 5)),
    exitPrice: Number(exit.toFixed(pair.includes('JPY') ? 3 : 5)),
    stopLoss: Number(sl.toFixed(pair.includes('JPY') ? 3 : 5)),
    takeProfit: Number((direction === 'Long' ? entry + risk * rrTarget : entry - risk * rrTarget).toFixed(pair.includes('JPY') ? 3 : 5)),
    positionSize: r(0.1, 2),
    riskPercent: r(0.5, 2),
    rewardPercent: r(1.5, 6),
    fees: r(0.5, 5),
    pnl: Number(pnl.toFixed(2)),
    rrRatio: Number(rr.toFixed(2)),
    session: ['Asian', 'London', 'New York', 'Sydney'][Math.floor(Math.random() * 4)] as Trade['session'],
    strategy: strategies[Math.floor(Math.random() * strategies.length)],
    setup: `${pair} ${direction} ${strategies[Math.floor(Math.random() * strategies.length)]}`,
    timeframe: ['15m', '1H', '4H', 'Daily'][Math.floor(Math.random() * 4)] as Trade['timeframe'],
    date,
    duration: `${Math.floor(Math.random() * 4)}h ${Math.floor(Math.random() * 59)}m`,
    rating: Math.floor(Math.random() * 3) + 3,
    emotionBefore: emotions[Math.floor(Math.random() * emotions.length)] as Trade['emotionBefore'],
    emotionDuring: emotions[Math.floor(Math.random() * emotions.length)] as Trade['emotionDuring'],
    emotionAfter: isWin ? 'Confident' : emotions[Math.floor(Math.random() * 4) + 3] as Trade['emotionAfter'],
    confidenceLevel: Math.floor(Math.random() * 5) + 5,
    isMistake: !isWin && Math.random() > 0.6,
    lessonsLearned: isWin ? 'Followed the plan perfectly. Patience paid off.' : 'Need to wait for confirmation. Entered too early.',
    screenshotUrl: '',
    tradingViewLink: '',
    notes: isWin ? 'Great execution. Clear setup with confluence.' : 'Setup was valid but timing was off. Review entry criteria.',
    tags: [pair.split('/')[0], strategies[Math.floor(Math.random() * strategies.length)].split(' ')[0]],
    isFavorite: Math.random() > 0.8,
    isArchived: false,
    createdAt: date,
    updatedAt: date,
  };
}

export function generateSampleTrades(count = 30): Trade[] {
  const trades: Trade[] = [];
  for (let i = 0; i < count; i++) {
    trades.push(createTrade(60, i));
  }
  return trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generateSampleJournalEntries(): JournalEntry[] {
  return [
    {
      id: 'journal-1',
      title: 'Weekly Review — Staying Disciplined',
      content: '# Key Takeaways\n\nThis week was about patience. I noticed I perform best during the London session when volatility is high and setups are clean.\n\n## What went well\n- Followed my trading plan on 4/5 trades\n- Cut losses quickly on losing trades\n- Maintained 2:1 RR minimum\n\n## Areas to improve\n- Avoid trading during Asian session overlap\n- Wait for BOS confirmation before entry\n- Size positions based on ATR, not fixed lots',
      mood: 'Disciplined',
      type: 'weekly',
      tags: ['review', 'discipline', 'london'],
      isPinned: true,
      isFavorite: true,
      tradeIds: [],
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'journal-2',
      title: 'Psychology Check — Managing Fear After a Loss',
      content: '## Today\'s Reflection\n\nAfter yesterday\'s loss on GBP/USD, I noticed fear creeping in. I was hesitant to take the next setup even though it was A+ quality.\n\n> "The goal is not to avoid losses, but to manage your response to them."\n\n### Action Items\n1. Review the loss objectively — was it a valid setup?\n2. If yes, the loss was just the cost of doing business\n3. Take a 15-minute break between trades\n4. Journal before the next session',
      mood: 'Anxious',
      type: 'reflection',
      tags: ['psychology', 'fear', 'loss-management'],
      isPinned: false,
      isFavorite: false,
      tradeIds: [],
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'journal-3',
      title: 'New Strategy Idea — Asian Range Breakout',
      content: '## Concept\n\nMark the Asian session high and low. Wait for London open to break one side with momentum. Enter on the retest.\n\n## Rules\n- Define Asian range from 00:00 to 08:00 GMT\n- Wait for a clean break with a full candle close\n- Enter on the first pullback to the broken level\n- Stop loss behind the range\n- Target 2:1 minimum RR\n\n## Backtesting needed\n- [ ] Test on EUR/USD last 3 months\n- [ ] Test on GBP/USD last 3 months\n- [ ] Track win rate and average RR',
      mood: 'Excited',
      type: 'idea',
      tags: ['strategy', 'asian-range', 'backtesting'],
      isPinned: false,
      isFavorite: true,
      tradeIds: [],
      date: new Date(Date.now() - 86400000 * 8).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
  ];
}
