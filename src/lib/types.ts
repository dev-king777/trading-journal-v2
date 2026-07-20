import { z } from 'zod';

// ============================================================
// Enums
// ============================================================

export const MARKETS = ['Forex', 'Crypto', 'Stocks', 'Indices', 'Commodities', 'Futures', 'Options'] as const;
export const DIRECTIONS = ['Long', 'Short'] as const;
export const SESSIONS = ['Asian', 'London', 'New York', 'Sydney', 'Overlap'] as const;
export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily', 'Weekly', 'Monthly'] as const;
export const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'Excited', 'Frustrated', 'Revenge', 'FOMO', 'Bored', 'Disciplined', 'Euphoric'] as const;
export const TRADE_RESULTS = ['Win', 'Loss', 'Breakeven'] as const;

export type Market = typeof MARKETS[number];
export type Direction = typeof DIRECTIONS[number];
export type Session = typeof SESSIONS[number];
export type Timeframe = typeof TIMEFRAMES[number];
export type Emotion = typeof EMOTIONS[number];
export type TradeResult = typeof TRADE_RESULTS[number];

// ============================================================
// Trade
// ============================================================

export interface Trade {
  id: string;
  pair: string;
  market: Market;
  direction: Direction;
  result: TradeResult;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  riskPercent: number;
  rewardPercent: number;
  fees: number;
  pnl: number;
  rrRatio: number;
  session: Session;
  strategy: string;
  setup: string;
  timeframe: Timeframe;
  date: string; // ISO date
  duration: string;
  rating: number; // 1-5
  emotionBefore: Emotion;
  emotionDuring: Emotion;
  emotionAfter: Emotion;
  confidenceLevel: number; // 1-10
  isMistake: boolean;
  lessonsLearned: string;
  screenshotUrl: string;
  tradingViewLink: string;
  notes: string;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const tradeSchema = z.object({
  pair: z.string().min(1, 'Pair is required'),
  market: z.enum(MARKETS),
  direction: z.enum(DIRECTIONS),
  entryPrice: z.number().nonnegative('Entry price must be 0 or positive'),
  exitPrice: z.number().nonnegative('Exit price must be 0 or positive'),
  stopLoss: z.number().nonnegative('Stop loss must be 0 or positive'),
  takeProfit: z.number().nonnegative('Take profit must be 0 or positive'),
  positionSize: z.number().nonnegative('Position size must be 0 or positive'),
  riskPercent: z.number().min(0).max(100),
  rewardPercent: z.number().min(0).max(100),
  fees: z.number().min(0),
  session: z.enum(SESSIONS),
  strategy: z.string().min(1, 'Strategy is required'),
  setup: z.string(),
  timeframe: z.enum(TIMEFRAMES),
  date: z.string(),
  duration: z.string(),
  rating: z.number().min(1).max(5),
  emotionBefore: z.enum(EMOTIONS),
  emotionDuring: z.enum(EMOTIONS),
  emotionAfter: z.enum(EMOTIONS),
  confidenceLevel: z.number().min(1).max(10),
  isMistake: z.boolean(),
  lessonsLearned: z.string(),
  screenshotUrl: z.string(),
  tradingViewLink: z.string(),
  notes: z.string(),
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
});

export type TradeFormData = z.infer<typeof tradeSchema>;

// ============================================================
// Journal Entry
// ============================================================

export interface JournalEntry {
  id: string;
  title: string;
  content: string; // markdown / rich text
  mood: Emotion;
  type: 'daily' | 'weekly' | 'monthly' | 'reflection' | 'lesson' | 'idea';
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  tradeIds: string[];
  date: string;
  folder?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Goal
// ============================================================

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'monthly' | 'risk' | 'habit';
  target: number;
  current: number;
  unit: string;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  createdAt: string;
}

// ============================================================
// Psychology
// ============================================================

export interface MoodEntry {
  id: string;
  date: string;
  mood: Emotion;
  disciplineScore: number; // 1-10
  fearScore: number;       // 1-10
  greedScore: number;      // 1-10
  confidenceScore: number; // 1-10
  notes: string;
  reflection: string;
}

// ============================================================
// Settings
// ============================================================

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  currency: string;
  timezone: string;
  language: string;
  defaultMarket: Market;
  defaultTimeframe: Timeframe;
  riskPerTrade: number;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

// ============================================================
// Stats
// ============================================================

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  lossRate: number;
  breakEvenRate: number;
  totalPnl: number;
  todayPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  averageRR: number;
  averageHoldTime: string;
  currentStreak: number;
  currentLossStreak: number;
  bestStreak: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  psychologyScore: number;
  moodScore: number;
}

// ============================================================
// Habit & Comment
// ============================================================

export interface Habit {
  id: string;
  label: string;
  streak: number;
  done: boolean;
  lastDoneDate: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  tradeId: string;
  content: string;
  createdAt: string;
}

