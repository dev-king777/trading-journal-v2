'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

// ============================================================
// Local Storage Engine (Browser LocalStorage Engine)
// ============================================================
const customStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.error('customStorage getItem error:', e);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.error('customStorage setItem error:', e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.error('customStorage removeItem error:', e);
    }
  },
};
import {
  Trade, TradeStats, JournalEntry, AppSettings, Goal, MoodEntry, Habit, Comment, FundedNextAccount, FundedNextPayoutEvent
} from './types';
import { generateSampleTrades, generateSampleJournalEntries } from './sample-data';
import { generateId } from './utils';
import { isSupabaseConfigured, supabase } from './supabase';
export { isSupabaseConfigured, supabase };
import { toast } from 'sonner';
import {
  startOfDay, startOfWeek, startOfMonth,
  isAfter, isSameDay
} from 'date-fns';

// ============================================================
// P&L Calculation Helper with Contract Multipliers
// ============================================================

export function calculateTradePnl(
  market: string,
  pair: string,
  direction: 'Long' | 'Short' | string,
  entryPrice: number | string,
  exitPrice: number | string,
  positionSize: number | string,
  fees: number | string
): number {
  // Data Type Safety: Parse as floats to avoid string concatenation bugs
  const entry = parseFloat(String(entryPrice)) || 0;
  const exit = parseFloat(String(exitPrice)) || 0;
  const size = parseFloat(String(positionSize)) || 0;
  const netFees = Math.abs(parseFloat(String(fees)) || 0);

  let multiplier = 1;
  const p = (pair || '').toUpperCase();
  
  if (market === 'Forex') {
    multiplier = 100000; // standard lot is 100,000 units
  } else if (market === 'Commodities') {
    if (p.includes('XAU') || p.includes('GOLD')) {
      multiplier = 100; // Gold standard lot is 100 oz
    } else if (p.includes('XAG') || p.includes('SILVER')) {
      multiplier = 5000; // Silver standard lot is 5000 oz
    } else {
      multiplier = 100;
    }
  } else if (market === 'Indices') {
    multiplier = 10; // Standard index lot multiplier
  } else if (market === 'Crypto') {
    multiplier = 1; // 1 BTC = 1 coin contract
  }
  
  // Auto-detect Direction if missing or invalid
  let safeDirection = direction;
  if (safeDirection !== 'Long' && safeDirection !== 'Short') {
    safeDirection = exit > entry ? 'Long' : 'Short';
  }

  // Differentiate Long vs. Short mathematically
  const priceDiff = safeDirection === 'Long'
    ? (exit - entry)
    : (entry - exit);
    
  const grossPnl = priceDiff * size * multiplier;
  const finalPnl = grossPnl - netFees;
  
  // Floating-Point Fix: strictly format to 2 decimal places to avoid JS glitches
  return parseFloat(finalPnl.toFixed(2));
}

// ============================================================
// Model Database Mappers (snake_case DB -> camelCase JS)
// ============================================================

export const mapTradeFromDb = (db: any): Trade => ({
  id: db.id,
  pair: db.pair,
  market: db.market,
  direction: db.direction,
  result: db.result,
  entryPrice: db.entry_price,
  exitPrice: db.exit_price || 0,
  stopLoss: db.stop_loss || 0,
  takeProfit: db.take_profit || 0,
  positionSize: db.position_size,
  riskPercent: db.risk_percent || 0,
  rewardPercent: db.reward_percent || 0,
  fees: db.fees || 0,
  pnl: db.pnl || 0,
  rrRatio: db.rr_ratio || 0,
  session: db.session,
  strategy: db.strategy,
  setup: db.setup || '',
  timeframe: db.timeframe,
  date: db.date,
  duration: db.duration || '',
  rating: db.rating || 3,
  emotionBefore: db.emotion_before || 'Calm',
  emotionDuring: db.emotion_during || 'Calm',
  emotionAfter: db.emotion_after || 'Calm',
  confidenceLevel: db.confidence_level || 5,
  isMistake: db.is_mistake || false,
  lessonsLearned: db.lessons_learned || '',
  screenshotUrl: db.screenshot_url || '',
  tradingViewLink: db.tradingview_link || '',
  notes: db.notes || '',
  tags: db.tags || [],
  isFavorite: db.is_favorite || false,
  isArchived: db.is_archived || false,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const mapTradeToDb = (js: Partial<Trade>) => {
  const db: any = {};
  if (js.id !== undefined) {
    db.id = UUID_REGEX.test(js.id) ? js.id : generateId();
  }
  if (js.pair !== undefined) db.pair = js.pair;
  if (js.market !== undefined) db.market = js.market;
  if (js.direction !== undefined) db.direction = js.direction;
  if (js.result !== undefined) db.result = js.result;
  if (js.entryPrice !== undefined) db.entry_price = js.entryPrice;
  if (js.exitPrice !== undefined) db.exit_price = js.exitPrice;
  if (js.stopLoss !== undefined) db.stop_loss = js.stopLoss;
  if (js.takeProfit !== undefined) db.take_profit = js.takeProfit;
  if (js.positionSize !== undefined) db.position_size = js.positionSize;
  if (js.riskPercent !== undefined) db.risk_percent = js.riskPercent;
  if (js.rewardPercent !== undefined) db.reward_percent = js.rewardPercent;
  if (js.fees !== undefined) db.fees = js.fees;
  if (js.pnl !== undefined) db.pnl = js.pnl;
  if (js.rrRatio !== undefined) db.rr_ratio = js.rrRatio;
  if (js.session !== undefined) db.session = js.session;
  if (js.strategy !== undefined) db.strategy = js.strategy;
  if (js.setup !== undefined) db.setup = js.setup;
  if (js.timeframe !== undefined) db.timeframe = js.timeframe;
  if (js.date !== undefined) db.date = js.date;
  if (js.duration !== undefined) db.duration = js.duration;
  if (js.rating !== undefined) db.rating = js.rating;
  if (js.emotionBefore !== undefined) db.emotion_before = js.emotionBefore;
  if (js.emotionDuring !== undefined) db.emotion_during = js.emotionDuring;
  if (js.emotionAfter !== undefined) db.emotion_after = js.emotionAfter;
  if (js.confidenceLevel !== undefined) db.confidence_level = js.confidenceLevel;
  if (js.isMistake !== undefined) db.is_mistake = js.isMistake;
  if (js.lessonsLearned !== undefined) db.lessons_learned = js.lessonsLearned;
  if (js.screenshotUrl !== undefined) db.screenshot_url = js.screenshotUrl;
  if (js.tradingViewLink !== undefined) db.tradingview_link = js.tradingViewLink;
  if (js.notes !== undefined) db.notes = js.notes;
  if (js.tags !== undefined) db.tags = js.tags;
  if (js.isFavorite !== undefined) db.is_favorite = js.isFavorite;
  if (js.isArchived !== undefined) db.is_archived = js.isArchived;
  return db;
};

export const mapJournalFromDb = (db: any): JournalEntry => ({
  id: db.id,
  title: db.title,
  content: db.content,
  mood: db.mood || 'Calm',
  type: db.type || 'daily',
  tags: db.tags || [],
  isPinned: db.is_pinned || false,
  isFavorite: db.is_favorite || false,
  tradeIds: db.trade_ids || [],
  date: db.date,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const mapJournalToDb = (js: Partial<JournalEntry>) => {
  const db: any = {};
  if (js.id !== undefined) db.id = js.id;
  if (js.title !== undefined) db.title = js.title;
  if (js.content !== undefined) db.content = js.content;
  if (js.mood !== undefined) db.mood = js.mood;
  if (js.type !== undefined) db.type = js.type;
  if (js.tags !== undefined) db.tags = js.tags;
  if (js.isPinned !== undefined) db.is_pinned = js.isPinned;
  if (js.isFavorite !== undefined) db.is_favorite = js.isFavorite;
  if (js.tradeIds !== undefined) db.trade_ids = js.tradeIds;
  if (js.date !== undefined) db.date = js.date;
  return db;
};

export const mapGoalFromDb = (db: any): Goal => ({
  id: db.id,
  title: db.title,
  description: db.description || '',
  type: db.type || 'weekly',
  target: db.target,
  current: db.current || 0,
  unit: db.unit || '',
  startDate: db.start_date,
  endDate: db.end_date,
  isCompleted: db.is_completed || false,
  createdAt: db.created_at,
});

export const mapGoalToDb = (js: Partial<Goal>) => {
  const db: any = {};
  if (js.id !== undefined) db.id = js.id;
  if (js.title !== undefined) db.title = js.title;
  if (js.description !== undefined) db.description = js.description;
  if (js.type !== undefined) db.type = js.type;
  if (js.target !== undefined) db.target = js.target;
  if (js.current !== undefined) db.current = js.current;
  if (js.unit !== undefined) db.unit = js.unit;
  if (js.startDate !== undefined) db.start_date = js.startDate;
  if (js.endDate !== undefined) db.end_date = js.endDate;
  if (js.isCompleted !== undefined) db.is_completed = js.isCompleted;
  return db;
};

export const mapMoodFromDb = (db: any): MoodEntry => ({
  id: db.id,
  date: db.date,
  mood: db.mood || 'Calm',
  disciplineScore: db.discipline_score || 5,
  fearScore: db.fear_score || 5,
  greedScore: db.greed_score || 5,
  confidenceScore: db.confidence_score || 5,
  notes: db.notes || '',
  reflection: db.reflection || '',
});

export const mapMoodToDb = (js: Partial<MoodEntry>) => {
  const db: any = {};
  if (js.id !== undefined) db.id = js.id;
  if (js.date !== undefined) db.date = js.date;
  if (js.mood !== undefined) db.mood = js.mood;
  if (js.disciplineScore !== undefined) db.discipline_score = js.disciplineScore;
  if (js.fearScore !== undefined) db.fear_score = js.fearScore;
  if (js.greedScore !== undefined) db.greed_score = js.greedScore;
  if (js.confidenceScore !== undefined) db.confidence_score = js.confidenceScore;
  if (js.notes !== undefined) db.notes = js.notes;
  if (js.reflection !== undefined) db.reflection = js.reflection;
  return db;
};

export const mapHabitFromDb = (db: any): Habit => ({
  id: db.id,
  label: db.label,
  streak: db.streak || 0,
  done: db.done || false,
  lastDoneDate: db.last_done_date || null,
  createdAt: db.created_at,
});

export const mapHabitToDb = (js: Partial<Habit>) => {
  const db: any = {};
  if (js.id !== undefined) db.id = js.id;
  if (js.label !== undefined) db.label = js.label;
  if (js.streak !== undefined) db.streak = js.streak;
  if (js.done !== undefined) db.done = js.done;
  if (js.lastDoneDate !== undefined) db.last_done_date = js.lastDoneDate;
  return db;
};

export const mapCommentFromDb = (db: any): Comment => ({
  id: db.id,
  tradeId: db.trade_id,
  content: db.content,
  createdAt: db.created_at,
});

const EMOTION_SCORES: Record<string, number> = {
  Calm: 80, Confident: 90, Anxious: 40, Fearful: 30, Greedy: 40,
  Excited: 70, Frustrated: 20, Revenge: 10, FOMO: 20, Bored: 50,
  Disciplined: 95, Euphoric: 85
};

// ============================================================
// Trade Store
// ============================================================

interface TradeStore {
  trades: Trade[];
  initialized: boolean;
  initializeWithSampleData: () => void;
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'result' | 'pnl' | 'rrRatio'> & { pnl?: number }) => Promise<string>;
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  duplicateTrade: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  archiveTrade: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  deleteAllTrades: () => Promise<void>;
  bulkArchive: (ids: string[], archive: boolean) => Promise<void>;
  bulkEdit: (ids: string[], updates: Partial<Trade>) => Promise<void>;
  getTradeById: (id: string) => Trade | undefined;
  getStats: (tradesOverride?: Trade[]) => TradeStats;
  getFilteredTrades: (filters: {
    market?: string;
    direction?: string;
    strategy?: string;
    result?: string;
    dateRange?: [string, string];
    search?: string;
  }) => Trade[];
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set, get) => ({
      trades: [],
      initialized: false,

      initializeWithSampleData: () => {
        if (!get().initialized) {
          set({ trades: [], initialized: true });
        }
      },

      addTrade: async (tradeData) => {
        const now = new Date().toISOString();
        const activeAccountNumber = useFundedNextStore.getState().selectedAccountNumber;
        const scopedTags = activeAccountNumber
          ? Array.from(new Set([...(tradeData.tags || []), fundedNextAccountTag(activeAccountNumber)]))
          : tradeData.tags;
        const direction = tradeData.direction;
        const rawPnl = (tradeData as any).pnl;
        const pnl = rawPnl !== undefined && !isNaN(rawPnl) && rawPnl !== 0
          ? rawPnl
          : calculateTradePnl(
              tradeData.market,
              tradeData.pair,
              tradeData.direction,
              tradeData.entryPrice,
              tradeData.exitPrice,
              tradeData.positionSize,
              tradeData.fees
            );
        const risk = Math.abs(tradeData.entryPrice - tradeData.stopLoss);
        const reward = direction === 'Long'
          ? tradeData.exitPrice - tradeData.entryPrice
          : tradeData.entryPrice - tradeData.exitPrice;
        const rrRatio = risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
        const result = pnl > 0.01 ? 'Win' : pnl < -0.01 ? 'Loss' : 'Breakeven';
        const id = generateId();

        const newTrade: Trade = {
          ...tradeData,
          tags: scopedTags,
          id,
          pnl: Number(pnl.toFixed(2)),
          rrRatio,
          result: result as Trade['result'],
          createdAt: now,
          updatedAt: now,
          isArchived: false,
        };

        // UI updates instantly
        set((state) => ({ trades: [newTrade, ...state.trades], initialized: true }));

        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase.from('trades').upsert(mapTradeToDb(newTrade), { onConflict: 'id' });
            if (error) throw error;
          } catch (err) {
            console.error('Supabase insert failed:', err);
            // Local persistence is authoritative while cloud sync is unavailable.
            // Removing the trade here also erased successful MCP imports.
          }
        }
        return id;
      },

      updateTrade: async (id, updates) => {
        const now = new Date().toISOString();
        const currentTrades = get().trades;
        const existing = currentTrades.find((t) => t.id === id);
        if (!existing) return;

        // Apply edits to calculations if prices changed
        const safeUpdates = { ...updates };
        if (!safeUpdates.screenshotUrl?.trim() && existing.screenshotUrl) {
          delete safeUpdates.screenshotUrl;
        }
        const merged = { ...existing, ...safeUpdates };
        const entryPrice = merged.entryPrice;
        const exitPrice = merged.exitPrice;
        const stopLoss = merged.stopLoss;
        const positionSize = merged.positionSize;
        const fees = merged.fees;
        const direction = merged.direction;

        const pnl = calculateTradePnl(
          merged.market,
          merged.pair,
          merged.direction,
          entryPrice,
          exitPrice,
          positionSize,
          fees
        );
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = direction === 'Long' ? exitPrice - entryPrice : entryPrice - exitPrice;
        const rrRatio = risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
        const result = pnl > 0.01 ? 'Win' : pnl < -0.01 ? 'Loss' : 'Breakeven';

        const updatedTrade: Trade = {
          ...merged,
          pnl: Number(pnl.toFixed(2)),
          rrRatio,
          result: result as Trade['result'],
          updatedAt: now,
        };

        set((state) => ({
          trades: state.trades.map((t) => (t.id === id ? updatedTrade : t)),
        }));

        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase.from('trades').upsert(mapTradeToDb(updatedTrade), { onConflict: 'id' });
            if (error) throw error;
          } catch (err) {
            console.error('Supabase update failed:', err);
            // Keep the local edit. A later successful initialization merges it
            // back into the cloud without losing screenshots or notes.
          }
        }
      },

      deleteTrade: async (id) => {
        set((state) => ({
          trades: state.trades.filter((t) => t.id !== id),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('trades').delete().eq('id', id);
          } catch (err) {
            console.error('Supabase delete failed:', err);
          }
        }
      },

      duplicateTrade: async (id) => {
        const trade = get().trades.find((t) => t.id === id);
        if (trade) {
          const now = new Date().toISOString();
          const duplicated: Trade = {
            ...trade,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
          };

          set((state) => ({ trades: [duplicated, ...state.trades] }));

          if (isSupabaseConfigured) {
            try {
              await supabase.from('trades').insert(mapTradeToDb(duplicated));
            } catch (err) {
              console.error('Supabase insert duplicated trade failed:', err);
            }
          }
        }
      },

      toggleFavorite: async (id) => {
        const trade = get().trades.find((t) => t.id === id);
        if (!trade) return;
        const fav = !trade.isFavorite;

        set((state) => ({
          trades: state.trades.map((t) => (t.id === id ? { ...t, isFavorite: fav } : t)),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('trades').update({ is_favorite: fav }).eq('id', id);
          } catch (err) {
            console.error('Supabase toggleFavorite failed:', err);
          }
        }
      },

      archiveTrade: async (id) => {
        const trade = get().trades.find((t) => t.id === id);
        if (!trade) return;
        const arch = !trade.isArchived;

        set((state) => ({
          trades: state.trades.map((t) => (t.id === id ? { ...t, isArchived: arch } : t)),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('trades').update({ is_archived: arch }).eq('id', id);
          } catch (err) {
            console.error('Supabase archiveTrade failed:', err);
          }
        }
      },

      bulkDelete: async (ids) => {
        set((state) => ({
          trades: state.trades.filter((t) => !ids.includes(t.id)),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('trades').delete().in('id', ids);
          } catch (err) {
            console.error('Supabase bulk delete failed:', err);
          }
        }
      },

      deleteAllTrades: async () => {
        set({ trades: [] });
        if (isSupabaseConfigured) {
          try {
            await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          } catch (err) {
            console.error('Supabase deleteAllTrades failed:', err);
          }
        }
      },

      bulkArchive: async (ids, archive) => {
        set((state) => ({
          trades: state.trades.map((t) => ids.includes(t.id) ? { ...t, isArchived: archive } : t),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('trades').update({ is_archived: archive }).in('id', ids);
          } catch (err) {
            console.error('Supabase bulk archive failed:', err);
          }
        }
      },

      bulkEdit: async (ids, updates) => {
        set((state) => ({
          trades: state.trades.map((t) => ids.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('trades').update(mapTradeToDb(updates)).in('id', ids);
          } catch (err) {
            console.error('Supabase bulk edit failed:', err);
          }
        }
      },

      getTradeById: (id) => get().trades.find((t) => t.id === id),

      getStats: (tradesOverride) => {
        const sourceTrades = tradesOverride || filterTradesForFundedNextAccount(
          get().trades,
          useFundedNextStore.getState().selectedAccountNumber
        );
        const trades = sourceTrades.filter((t) => !t.isArchived);
        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const monthStart = startOfMonth(now);

        const wins = trades.filter((t) => t.result === 'Win');
        const losses = trades.filter((t) => t.result === 'Loss');
        const breakevens = trades.filter((t) => t.result === 'Breakeven');

        const todayTrades = trades.filter((t) => isSameDay(new Date(t.date), now));
        const weekTrades = trades.filter((t) => isAfter(new Date(t.date), weekStart));
        const monthTrades = trades.filter((t) => isAfter(new Date(t.date), monthStart));

        // Streaks
        let currentStreak = 0;
        let currentLossStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const trade of sorted) {
          if (trade.result === 'Win') {
            tempStreak++;
            if (tempStreak > bestStreak) bestStreak = tempStreak;
          } else {
            tempStreak = 0;
          }
        }

        // Current win/loss streak from most recent active trade
        if (sorted.length > 0) {
          const firstResult = sorted[0].result;
          if (firstResult === 'Win') {
            for (const trade of sorted) {
              if (trade.result === 'Win') currentStreak++;
              else break;
            }
          } else if (firstResult === 'Loss') {
            for (const trade of sorted) {
              if (trade.result === 'Loss') currentLossStreak++;
              else break;
            }
          }
        }

        const totalGross = wins.reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

        // Psychology Score (calm/confident/disciplined trades vs total)
        const disciplinedTrades = trades.filter(
          (t) => t.emotionBefore === 'Calm' || t.emotionBefore === 'Confident' || t.emotionBefore === 'Disciplined'
        ).length;
        const psychologyScore = trades.length > 0 ? Math.round((disciplinedTrades / trades.length) * 100) : 0;

        // Mood Score (Mapping emotions to numeric values)
        let totalMoodScore = 0;
        trades.forEach((t) => {
          totalMoodScore += (EMOTION_SCORES[t.emotionBefore] || 50) +
                            (EMOTION_SCORES[t.emotionDuring] || 50) +
                            (EMOTION_SCORES[t.emotionAfter] || 50);
        });
        const moodScore = trades.length > 0 ? Math.round(totalMoodScore / (trades.length * 3)) : 0;

        return {
          totalTrades: trades.length,
          winRate: trades.length > 0 ? Number(((wins.length / trades.length) * 100).toFixed(1)) : 0,
          lossRate: trades.length > 0 ? Number(((losses.length / trades.length) * 100).toFixed(1)) : 0,
          breakEvenRate: trades.length > 0 ? Number(((breakevens.length / trades.length) * 100).toFixed(1)) : 0,
          totalPnl: Number(trades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)),
          todayPnl: Number(todayTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)),
          weeklyPnl: Number(weekTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)),
          monthlyPnl: Number(monthTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)),
          averageRR: trades.length > 0 ? Number((trades.reduce((sum, t) => sum + t.rrRatio, 0) / trades.length).toFixed(2)) : 0,
          averageHoldTime: '2h 15m',
          currentStreak,
          currentLossStreak,
          bestStreak,
          largestWin: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0,
          largestLoss: losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0,
          profitFactor: totalLoss > 0 ? Number((totalGross / totalLoss).toFixed(2)) : totalGross > 0 ? Infinity : 0,
          expectancy: trades.length > 0
            ? Number(((wins.length / trades.length) * (totalGross / (wins.length || 1)) - (losses.length / trades.length) * (totalLoss / (losses.length || 1))).toFixed(2))
            : 0,
          psychologyScore,
          moodScore,
        };
      },

      getFilteredTrades: (filters) => {
        let trades = get().trades;
        if (filters.market) trades = trades.filter((t) => t.market === filters.market);
        if (filters.direction) trades = trades.filter((t) => t.direction === filters.direction);
        if (filters.strategy) trades = trades.filter((t) => t.strategy === filters.strategy);
        if (filters.result) trades = trades.filter((t) => t.result === filters.result);
        if (filters.search) {
          const q = filters.search.toLowerCase();
          trades = trades.filter(
            (t) =>
              t.pair.toLowerCase().includes(q) ||
              t.strategy.toLowerCase().includes(q) ||
              t.notes.toLowerCase().includes(q) ||
              t.tags.some((tag) => tag.toLowerCase().includes(q))
          );
        }
        return trades;
      },
    }),
    {
      name: 'trading-journal-trades',
      storage: createJSONStorage(() => customStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.initialized) {
          state.initializeWithSampleData();
        }
      },
    }
  )
);

// ============================================================
// Journal Store
// ============================================================

interface JournalStore {
  entries: JournalEntry[];
  initialized: boolean;
  initializeWithSampleData: () => void;
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: [],
      initialized: false,

      initializeWithSampleData: () => {
        if (!get().initialized) {
          set({ entries: [], initialized: true });
        }
      },

      addEntry: async (entryData) => {
        const now = new Date().toISOString();
        const newEntry: JournalEntry = {
          ...entryData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ entries: [newEntry, ...state.entries], initialized: true }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('journal_entries').insert(mapJournalToDb(newEntry));
          } catch (err) {
            console.error('Supabase journal insert failed:', err);
          }
        }
      },

      updateEntry: async (id, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: now } : e
          ),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('journal_entries').update(mapJournalToDb(updates)).eq('id', id);
          } catch (err) {
            console.error('Supabase journal update failed:', err);
          }
        }
      },

      deleteEntry: async (id) => {
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('journal_entries').delete().eq('id', id);
          } catch (err) {
            console.error('Supabase journal delete failed:', err);
          }
        }
      },

      togglePin: async (id) => {
        const entry = get().entries.find((e) => e.id === id);
        if (!entry) return;
        const pin = !entry.isPinned;
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, isPinned: pin } : e)),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('journal_entries').update({ is_pinned: pin }).eq('id', id);
          } catch (err) {
            console.error('Supabase togglePin failed:', err);
          }
        }
      },

      toggleFavorite: async (id) => {
        const entry = get().entries.find((e) => e.id === id);
        if (!entry) return;
        const fav = !entry.isFavorite;
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, isFavorite: fav } : e)),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('journal_entries').update({ is_favorite: fav }).eq('id', id);
          } catch (err) {
            console.error('Supabase toggleFavorite failed:', err);
          }
        }
      },
    }),
    {
      name: 'trading-journal-entries',
      storage: createJSONStorage(() => customStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.initialized) {
          state.initializeWithSampleData();
        }
      },
    }
  )
);

// ============================================================
// Goals Store
// ============================================================

interface GoalsStore {
  goals: Goal[];
  initialized: boolean;
  initializeWithSampleData: () => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'isCompleted'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set, get) => ({
      goals: [],
      initialized: false,

      initializeWithSampleData: () => {
        if (!get().initialized) {
          const now = new Date();
          const end = new Date();
          end.setDate(end.getDate() + 30);
          set({
            goals: [
              {
                id: generateId(),
                title: 'Monthly P&L Target',
                description: 'Achieve $500 profit this month',
                type: 'monthly',
                target: 500,
                current: 0,
                unit: '$',
                startDate: now.toISOString(),
                endDate: end.toISOString(),
                isCompleted: false,
                createdAt: now.toISOString(),
              },
            ],
            initialized: true,
          });
        }
      },

      addGoal: async (goalData) => {
        const now = new Date().toISOString();
        const newGoal: Goal = {
          ...goalData,
          id: generateId(),
          isCompleted: false,
          createdAt: now,
        };
        set((state) => ({ goals: [newGoal, ...state.goals], initialized: true }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('goals').insert(mapGoalToDb(newGoal));
          } catch (err) {
            console.error('Supabase goals insert failed:', err);
          }
        }
      },

      updateGoal: async (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('goals').update(mapGoalToDb(updates)).eq('id', id);
          } catch (err) {
            console.error('Supabase goals update failed:', err);
          }
        }
      },

      deleteGoal: async (id) => {
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('goals').delete().eq('id', id);
          } catch (err) {
            console.error('Supabase goals delete failed:', err);
          }
        }
      },
    }),
    {
      name: 'trading-journal-goals',
      storage: createJSONStorage(() => customStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.initialized) {
          state.initializeWithSampleData();
        }
      },
    }
  )
);

// ============================================================
// Habits Store
// ============================================================

interface HabitsStore {
  habits: Habit[];
  initialized: boolean;
  initializeWithSampleData: () => void;
  addHabit: (label: string) => Promise<void>;
  toggleHabit: (id: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
}

export const useHabitsStore = create<HabitsStore>()(
  persist(
    (set, get) => ({
      habits: [],
      initialized: false,

      initializeWithSampleData: () => {
        if (!get().initialized) {
          const sample = [
            { id: generateId(), label: 'Pre-market analysis before 8 AM', streak: 12, done: true, lastDoneDate: new Date().toISOString(), createdAt: new Date().toISOString() },
            { id: generateId(), label: 'Journal every trading day', streak: 8, done: true, lastDoneDate: new Date().toISOString(), createdAt: new Date().toISOString() },
            { id: generateId(), label: 'Review previous day trades', streak: 5, done: false, lastDoneDate: null, createdAt: new Date().toISOString() },
          ];
          set({ habits: sample, initialized: true });
        }
      },

      addHabit: async (label) => {
        const newHabit: Habit = {
          id: generateId(),
          label,
          streak: 0,
          done: false,
          lastDoneDate: null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ habits: [...state.habits, newHabit], initialized: true }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('habits').insert(mapHabitToDb(newHabit));
          } catch (err) {
            console.error('Supabase habits insert failed:', err);
          }
        }
      },

      toggleHabit: async (id) => {
        const current = get().habits.find((h) => h.id === id);
        if (!current) return;

        const done = !current.done;
        const today = new Date().toISOString().split('T')[0];
        let streak = current.streak;

        if (done) {
          streak += 1;
        } else {
          streak = Math.max(0, streak - 1);
        }

        const updated: Habit = {
          ...current,
          done,
          streak,
          lastDoneDate: done ? today : current.lastDoneDate,
        };

        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? updated : h)),
        }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('habits').update(mapHabitToDb(updated)).eq('id', id);
          } catch (err) {
            console.error('Supabase habits toggle failed:', err);
          }
        }
      },

      deleteHabit: async (id) => {
        set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('habits').delete().eq('id', id);
          } catch (err) {
            console.error('Supabase habits delete failed:', err);
          }
        }
      },
    }),
    {
      name: 'trading-journal-habits',
      storage: createJSONStorage(() => customStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.initialized) {
          state.initializeWithSampleData();
        }
      },
    }
  )
);

// ============================================================
// Mood / Psychology Store
// ============================================================

interface MoodStore {
  moodEntries: MoodEntry[];
  initialized: boolean;
  initializeWithSampleData: () => void;
  addMoodEntry: (entry: Omit<MoodEntry, 'id'>) => Promise<void>;
  deleteMoodEntry: (id: string) => Promise<void>;
}

export const useMoodStore = create<MoodStore>()(
  persist(
    (set, get) => ({
      moodEntries: [],
      initialized: false,

      initializeWithSampleData: () => {
        if (!get().initialized) {
          set({
            moodEntries: [
              {
                id: generateId(),
                date: new Date().toISOString(),
                mood: 'Calm',
                disciplineScore: 8,
                fearScore: 2,
                greedScore: 3,
                confidenceScore: 9,
                notes: 'Excellent day following all rules.',
                reflection: 'Patience paid off.',
              },
            ],
            initialized: true,
          });
        }
      },

      addMoodEntry: async (entryData) => {
        const newEntry: MoodEntry = {
          ...entryData,
          id: generateId(),
        };
        set((state) => ({ moodEntries: [newEntry, ...state.moodEntries], initialized: true }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('mood_entries').insert(mapMoodToDb(newEntry));
          } catch (err) {
            console.error('Supabase mood insert failed:', err);
          }
        }
      },

      deleteMoodEntry: async (id) => {
        set((state) => ({ moodEntries: state.moodEntries.filter((m) => m.id !== id) }));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('mood_entries').delete().eq('id', id);
          } catch (err) {
            console.error('Supabase mood delete failed:', err);
          }
        }
      },
    }),
    {
      name: 'trading-journal-moods',
      storage: createJSONStorage(() => customStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.initialized) {
          state.initializeWithSampleData();
        }
      },
    }
  )
);

// ============================================================
// Comments Store
// ============================================================

interface CommentsStore {
  comments: Comment[];
  addComment: (tradeId: string, content: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  fetchComments: (tradeId: string) => Promise<void>;
}

export const useCommentsStore = create<CommentsStore>((set, get) => ({
  comments: [],
  addComment: async (tradeId, content) => {
    const newComment: Comment = {
      id: generateId(),
      tradeId,
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ comments: [newComment, ...state.comments] }));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('comments').insert({
          id: newComment.id,
          trade_id: tradeId,
          content,
        });
      } catch (err) {
        console.error('Supabase comment insert failed:', err);
      }
    }
  },
  deleteComment: async (id) => {
    set((state) => ({ comments: state.comments.filter((c) => c.id !== id) }));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('comments').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase comment delete failed:', err);
      }
    }
  },
  fetchComments: async (tradeId) => {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('comments').select('*').eq('trade_id', tradeId).order('created_at', { ascending: false });
        if (data) {
          set({ comments: data.map(mapCommentFromDb) });
        }
      } catch (err) {
        console.error('Supabase comment fetch failed:', err);
      }
    }
  },
}));

// ============================================================
// Settings Store
// ============================================================

interface SettingsStore {
  settings: AppSettings;
  sidebarCollapsed: boolean;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        theme: 'dark',
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
        defaultMarket: 'Forex',
        defaultTimeframe: '15m',
        riskPerTrade: 1,
      },
      sidebarCollapsed: false,
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'trading-journal-settings',
      storage: createJSONStorage(() => customStorage),
    }
  )
);

// ============================================================
// Database Synchronization Setup
// ============================================================

const waitForPersistHydration = (store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
}) => {
  if (store.persist.hasHydrated()) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
    if (store.persist.hasHydrated()) {
      unsubscribe();
      resolve();
    }
  });
};

export const initializeAllStores = async () => {
  await Promise.all([
    waitForPersistHydration(useTradeStore),
    waitForPersistHydration(useJournalStore),
    waitForPersistHydration(useGoalsStore),
    waitForPersistHydration(useHabitsStore),
    waitForPersistHydration(useMoodStore),
    waitForPersistHydration(useSettingsStore),
    waitForPersistHydration(useFundedNextStore),
  ]);

  const hydratedTrades = useTradeStore.getState().trades || [];
  const scopedHydratedTrades = scopeLegacyFundedNextTrades(hydratedTrades);
  if (scopedHydratedTrades !== hydratedTrades) {
    useTradeStore.setState({ trades: scopedHydratedTrades, initialized: true });
  }

  const fundedNextState = useFundedNextStore.getState();
  const recoveredAccounts = recoverFundedNextAccounts(
    scopedHydratedTrades,
    fundedNextState.accounts
  );
  if (recoveredAccounts !== fundedNextState.accounts) {
    useFundedNextStore.setState({
      accounts: recoveredAccounts,
      hasLoadedAccounts: true,
    });
  }

  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const [tradesRes, journalRes, goalsRes, moodRes, habitsRes] = await Promise.all([
      supabase.from('trades').select('*').order('date', { ascending: false }),
      supabase.from('journal_entries').select('*').order('date', { ascending: false }),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('mood_entries').select('*').order('date', { ascending: false }),
      supabase.from('habits').select('*').order('created_at', { ascending: true }),
    ]);

    const allRemoteTrades: Trade[] = tradesRes.data ? tradesRes.data.map(mapTradeFromDb) : [];
    let remoteTrades = allRemoteTrades.filter((trade: Trade) => !trade.tags?.includes('Legacy History'));
    let remoteJournal = journalRes.data ? journalRes.data.map(mapJournalFromDb) : [];

    // Migration of the local database is only for real Supabase-authenticated users.
    if (userId) {
      try {
        let localTrades: Trade[] = [];
        let localEntries: JournalEntry[] = [];

        try {
          const tRes = await fetch('/api/local-db?key=trading-journal-trades');
          if (tRes.ok) {
            const tJson = await tRes.json();
            if (tJson.value) {
              const parsed = JSON.parse(tJson.value);
              localTrades = parsed.state?.trades || [];
            }
          }
          const jRes = await fetch('/api/local-db?key=trading-journal-entries');
          if (jRes.ok) {
            const jJson = await jRes.json();
            if (jJson.value) {
              const parsed = JSON.parse(jJson.value);
              localEntries = parsed.state?.entries || [];
            }
          }
        } catch (e) {
          console.error('Error fetching local DB file:', e);
        }

        if (localTrades.length === 0 && typeof window !== 'undefined') {
          const l = localStorage.getItem('trading-journal-trades');
          if (l) localTrades = JSON.parse(l)?.state?.trades || [];
        }
        if (localEntries.length === 0 && typeof window !== 'undefined') {
          const l = localStorage.getItem('trading-journal-entries');
          if (l) localEntries = JSON.parse(l)?.state?.entries || [];
        }

        const remoteTradeIds = new Set(remoteTrades.map((t: Trade) => t.id));
        const tradesToMigrate = localTrades.filter((t: Trade) => !remoteTradeIds.has(t.id));

        if (tradesToMigrate.length > 0) {
          const dbRows = tradesToMigrate.map((trade: Trade) => ({
            ...mapTradeToDb(trade),
            user_id: userId,
          }));
          const { error: insertErr } = await supabase.from('trades').upsert(dbRows, { onConflict: 'id' });
          if (!insertErr) remoteTrades = [...tradesToMigrate, ...remoteTrades];
        }

        const remoteJournalIds = new Set(remoteJournal.map((j: JournalEntry) => j.id));
        const journalToMigrate = localEntries.filter((j: JournalEntry) => !remoteJournalIds.has(j.id));

        if (journalToMigrate.length > 0) {
          const journalRows = journalToMigrate.map((j) => ({
            ...mapJournalToDb(j),
            user_id: userId,
          }));

          const { error: insertJErr } = await supabase.from('journal_entries').upsert(journalRows, { onConflict: 'id' });
          if (!insertJErr) {
            remoteJournal = [...journalToMigrate, ...remoteJournal];
          }
        }
      } catch (migrationErr) {
        console.error('Data migration error:', migrationErr);
      }
    }

    // Safe Merge: Merge remote trades with local trades intelligently.
    // Match by exact ID or by FundedNext Ticket in notes, and ALWAYS keep screenshots/notes if present!
    const currentLocalTrades = (useTradeStore.getState().trades || [])
      .filter((trade) => !trade.tags?.includes('Legacy History'));
    const mergedTradesMap = new Map<string, Trade>();

    const mergeKeyForTrade = (trade: Trade) => {
      const ticket = getFundedNextTicket(trade);
      return ticket ? `fundednext-ticket:${ticket}` : trade.id;
    };

    // 1. Add remote trades first
    remoteTrades.forEach((rt: Trade) => {
      const key = mergeKeyForTrade(rt);
      mergedTradesMap.set(key, rt);
    });

    // 2. Merge local trades: preserve any custom screenshotUrl / user notes / edits
    currentLocalTrades.forEach((lt: Trade) => {
      const key = mergeKeyForTrade(lt);
      if (mergedTradesMap.has(key)) {
        const existing = mergedTradesMap.get(key)!;
        mergedTradesMap.set(key, {
          ...existing,
          ...lt,
          // Always keep screenshot if either remote or local has one
          screenshotUrl: lt.screenshotUrl || existing.screenshotUrl || '',
          notes: lt.notes || existing.notes || '',
          lessonsLearned: lt.lessonsLearned || existing.lessonsLearned || '',
          tags: lt.tags?.length ? lt.tags : existing.tags,
        });
      } else {
        mergedTradesMap.set(key, lt);
      }
    });

    const screenshotDonors = [...allRemoteTrades, ...currentLocalTrades]
      .filter((trade, index, list) => Boolean(trade.screenshotUrl) && list.findIndex((item) => item.id === trade.id) === index);
    screenshotRecoveryPool = screenshotDonors;

    const screenshotRepairs: Array<{ id: string; screenshotUrl: string }> = [];
    const finalTrades = Array.from(mergedTradesMap.values()).map((trade) => {
      if (trade.screenshotUrl) return trade;
      const donor = screenshotDonors.find((candidate) =>
        candidate.id !== trade.id && isSameFundedNextTrade(candidate, trade)
      );
      if (!donor?.screenshotUrl) return trade;
      screenshotRepairs.push({ id: trade.id, screenshotUrl: donor.screenshotUrl });
      return { ...trade, screenshotUrl: donor.screenshotUrl };
    });

    const remoteTradesById = new Map(allRemoteTrades.map((trade: Trade) => [trade.id, trade]));
    finalTrades.forEach((trade) => {
      const remoteTrade = remoteTradesById.get(trade.id);
      if (trade.screenshotUrl && remoteTrade && !remoteTrade.screenshotUrl && !screenshotRepairs.some((repair) => repair.id === trade.id)) {
        screenshotRepairs.push({ id: trade.id, screenshotUrl: trade.screenshotUrl });
      }
    });

    if (screenshotRepairs.length > 0) {
      await Promise.all(screenshotRepairs.map(async (repair) => {
        const { error } = await supabase
          .from('trades')
          .update({ screenshot_url: repair.screenshotUrl, updated_at: new Date().toISOString() })
          .eq('id', repair.id);
        if (error) console.warn('[Trades] Could not restore a screenshot:', error);
      }));
    }

    // Safe Merge: Merge remote journal entries with local journal entries
    const currentLocalEntries = useJournalStore.getState().entries || [];
    const remoteJournalIds = new Set(remoteJournal.map((j: JournalEntry) => j.id));
    const nonRemoteEntries = currentLocalEntries.filter((j: JournalEntry) => !remoteJournalIds.has(j.id));
    const finalJournal = [...nonRemoteEntries, ...remoteJournal];

    useTradeStore.setState({ trades: finalTrades, initialized: true });

    if (finalJournal.length > 0) {
      useJournalStore.setState({ entries: finalJournal, initialized: true });
    } else if (remoteJournal.length > 0) {
      useJournalStore.setState({ entries: remoteJournal, initialized: true });
    }

    if (goalsRes.data && goalsRes.data.length > 0) {
      useGoalsStore.setState({ goals: goalsRes.data.map(mapGoalFromDb), initialized: true });
    }
    if (moodRes.data && moodRes.data.length > 0) {
      useMoodStore.setState({ moodEntries: moodRes.data.map(mapMoodFromDb), initialized: true });
    }
    if (habitsRes.data && habitsRes.data.length > 0) {
      useHabitsStore.setState({ habits: habitsRes.data.map(mapHabitFromDb), initialized: true });
    }
  } catch (err) {
    console.error('Failed to load from Supabase:', err);
    // Hydrated browser data must survive an unavailable cloud database.
    if (!useTradeStore.getState().initialized) {
      useTradeStore.setState({ initialized: true });
    }
    if (!useJournalStore.getState().initialized) {
      useJournalStore.setState({ initialized: true });
    }
    if (!useGoalsStore.getState().initialized) {
      useGoalsStore.setState({ initialized: true });
    }
    if (!useHabitsStore.getState().initialized) {
      useHabitsStore.setState({ initialized: true });
    }
    if (!useMoodStore.getState().initialized) {
      useMoodStore.setState({ initialized: true });
    }
  }
};

export const subscribeToRealtime = () => {
  if (!isSupabaseConfigured) return;

  const tradesChannel = supabase
    .channel('trades-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, (payload: any) => {
      const current = useTradeStore.getState().trades;
      if (payload.eventType === 'INSERT') {
        const newTrade = mapTradeFromDb(payload.new);
        if (!current.some((t) => t.id === newTrade.id)) {
          useTradeStore.setState({ trades: [newTrade, ...current] });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = mapTradeFromDb(payload.new);
        useTradeStore.setState({
          trades: current.map((trade) => (
            trade.id === updated.id
              ? { ...updated, screenshotUrl: updated.screenshotUrl || trade.screenshotUrl }
              : trade
          )),
        });
      } else if (payload.eventType === 'DELETE') {
        const id = payload.old.id;
        useTradeStore.setState({ trades: current.filter((t) => t.id !== id) });
      }
    })
    .subscribe();

  const journalChannel = supabase
    .channel('journal-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, (payload: any) => {
      const current = useJournalStore.getState().entries;
      if (payload.eventType === 'INSERT') {
        const newEntry = mapJournalFromDb(payload.new);
        if (!current.some((e) => e.id === newEntry.id)) {
          useJournalStore.setState({ entries: [newEntry, ...current] });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = mapJournalFromDb(payload.new);
        useJournalStore.setState({ entries: current.map((e) => (e.id === updated.id ? updated : e)) });
      } else if (payload.eventType === 'DELETE') {
        const id = payload.old.id;
        useJournalStore.setState({ entries: current.filter((e) => e.id !== id) });
      }
    })
    .subscribe();

  const goalsChannel = supabase
    .channel('goals-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, (payload: any) => {
      const current = useGoalsStore.getState().goals;
      if (payload.eventType === 'INSERT') {
        const newGoal = mapGoalFromDb(payload.new);
        if (!current.some((g) => g.id === newGoal.id)) {
          useGoalsStore.setState({ goals: [newGoal, ...current] });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = mapGoalFromDb(payload.new);
        useGoalsStore.setState({ goals: current.map((g) => (g.id === updated.id ? updated : g)) });
      } else if (payload.eventType === 'DELETE') {
        const id = payload.old.id;
        useGoalsStore.setState({ goals: current.filter((g) => g.id !== id) });
      }
    })
    .subscribe();

  const habitsChannel = supabase
    .channel('habits-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, (payload: any) => {
      const current = useHabitsStore.getState().habits;
      if (payload.eventType === 'INSERT') {
        const newHabit = mapHabitFromDb(payload.new);
        if (!current.some((h) => h.id === newHabit.id)) {
          useHabitsStore.setState({ habits: [...current, newHabit] });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = mapHabitFromDb(payload.new);
        useHabitsStore.setState({ habits: current.map((h) => (h.id === updated.id ? updated : h)) });
      } else if (payload.eventType === 'DELETE') {
        const id = payload.old.id;
        useHabitsStore.setState({ habits: current.filter((h) => h.id !== id) });
      }
    })
    .subscribe();

  return () => {
    tradesChannel.unsubscribe();
    journalChannel.unsubscribe();
    goalsChannel.unsubscribe();
    habitsChannel.unsubscribe();
  };
};

// ============================================================
// FundedNext MCP Store
// ============================================================

export const fundedNextAccountTag = (accountNumber: string) => `FundedNext:${accountNumber}`;

const LEGACY_FUNDEDNEXT_ACCOUNT = '14180952';
const LEGACY_FUNDEDNEXT_ACCOUNT_SIZES: Record<string, number> = {
  '14180952': 6000,
  '14189805': 15000,
};

const isUnscopedFundedNextMcpTrade = (trade: Trade) => {
  const tags = trade.tags || [];
  const isFundedNextTrade = tags.includes('FundedNext') || /FundedNext\s+Ticket/i.test(trade.notes || '');
  const isMcpTrade = tags.includes('MCP') || /FundedNext\s+Ticket/i.test(trade.notes || '');
  const hasAccountTag = tags.some((tag) => tag.startsWith('FundedNext:'));
  return isFundedNextTrade && isMcpTrade && !hasAccountTag && !tags.includes('Legacy History');
};

const scopeLegacyFundedNextTrades = (trades: Trade[]): Trade[] => {
  let changed = false;
  const accountTag = fundedNextAccountTag(LEGACY_FUNDEDNEXT_ACCOUNT);
  const scoped = trades.map((trade) => {
    if (!isUnscopedFundedNextMcpTrade(trade)) return trade;
    changed = true;
    return { ...trade, tags: Array.from(new Set([...(trade.tags || []), accountTag])) };
  });
  return changed ? scoped : trades;
};

const createRecoveredFundedNextAccount = (accountNumber: string): FundedNextAccount => {
  const accountSize = LEGACY_FUNDEDNEXT_ACCOUNT_SIZES[accountNumber] || 6000;
  return {
    providerAccountId: `cached-${accountNumber}`,
    accountNumber,
    accountType: `FundedNext ${accountSize / 1000}K Account`,
    balance: accountSize,
    equity: accountSize,
    initialBalance: accountSize,
    profitTarget: accountSize * 0.10,
    maxDailyLossLimit: accountSize * 0.05,
    currentDailyLoss: 0,
    maxOverallLossLimit: accountSize * 0.10,
    currentOverallLoss: 0,
    payoutEligible: false,
    status: 'Active',
    lastSyncedAt: new Date(0).toISOString(),
  };
};

const recoverFundedNextAccounts = (
  trades: Trade[],
  existingAccounts: FundedNextAccount[]
): FundedNextAccount[] => {
  if (existingAccounts.length > 0) {
    let changed = false;
    const repairedAccounts = existingAccounts.map((account) => {
      const expectedSize = LEGACY_FUNDEDNEXT_ACCOUNT_SIZES[account.accountNumber];
      const isRecoveredAccount = account.providerAccountId.startsWith('cached-');
      if (!expectedSize || !isRecoveredAccount || (
        account.initialBalance === expectedSize
        && account.balance === expectedSize
        && account.equity === expectedSize
      )) {
        return account;
      }
      changed = true;
      return createRecoveredFundedNextAccount(account.accountNumber);
    });
    return changed ? repairedAccounts : existingAccounts;
  }

  const hasFundedNextHistory = trades.some((trade) => {
    const tags = trade.tags || [];
    return tags.includes('FundedNext') && tags.includes('MCP');
  });
  if (!hasFundedNextHistory) return existingAccounts;

  const accountNumbers = new Set(
    trades.flatMap((trade) => (trade.tags || [])
      .filter((tag) => tag.startsWith('FundedNext:'))
      .map((tag) => tag.slice('FundedNext:'.length))
      .filter(Boolean))
  );
  Object.keys(LEGACY_FUNDEDNEXT_ACCOUNT_SIZES)
    .forEach((accountNumber) => accountNumbers.add(accountNumber));

  return Array.from(accountNumbers).map(createRecoveredFundedNextAccount);
};

const getFundedNextTicket = (trade: Pick<Trade, 'notes'>): string | null => {
  const match = trade.notes?.match(/\bTicket\s*#?\s*([A-Za-z0-9-]+)/i);
  return match?.[1]?.toLowerCase() || null;
};

const isSameFundedNextTrade = (left: Partial<Trade>, right: Partial<Trade>): boolean => {
  const leftTicket = getFundedNextTicket({ notes: left.notes || '' });
  const rightTicket = getFundedNextTicket({ notes: right.notes || '' });
  if (leftTicket && rightTicket) return leftTicket === rightTicket;

  if (!left.pair || left.pair !== right.pair) return false;
  const leftPnl = Number(left.pnl);
  const rightPnl = Number(right.pnl);
  const pnlMatches = Number.isFinite(leftPnl) && Number.isFinite(rightPnl) && Math.abs(leftPnl - rightPnl) <= 0.02;

  const leftDate = new Date(left.date || '').getTime();
  const rightDate = new Date(right.date || '').getTime();
  const dateMatches = Number.isFinite(leftDate) && Number.isFinite(rightDate) && Math.abs(leftDate - rightDate) <= 48 * 60 * 60 * 1000;

  const leftEntry = Number(left.entryPrice);
  const rightEntry = Number(right.entryPrice);
  const entryMatches = Number.isFinite(leftEntry) && Number.isFinite(rightEntry) && Math.abs(leftEntry - rightEntry) <= 0.001;

  return (pnlMatches && dateMatches) || (entryMatches && dateMatches);
};

let screenshotRecoveryPool: Trade[] = [];

export function filterTradesForFundedNextAccount(trades: Trade[], accountNumber: string | null): Trade[] {
  if (!accountNumber) return trades;
  const accountTag = fundedNextAccountTag(accountNumber);
  return trades.filter((trade) =>
    trade.tags?.includes(accountTag)
    || (accountNumber === LEGACY_FUNDEDNEXT_ACCOUNT && isUnscopedFundedNextMcpTrade(trade))
  );
}

async function importFundedNextTrades(trades: Partial<Trade>[], accountNumber: string): Promise<number> {
  const addTrade = useTradeStore.getState().addTrade;
  const accountTag = fundedNextAccountTag(accountNumber);
  if (!Array.isArray(trades) || trades.length === 0) return 0;

  let importedCount = 0;

  for (const trade of trades) {
    const currentTrades = useTradeStore.getState().trades;
    const matchingTrades = [...currentTrades, ...screenshotRecoveryPool]
      .filter((existing) => isSameFundedNextTrade(existing, trade));
    const screenshotDonor = matchingTrades.find((existing) => Boolean(existing.screenshotUrl));
    const existingTrade = currentTrades.find((existing) =>
      existing.tags?.includes(accountTag) && isSameFundedNextTrade(existing, trade)
    );

    if (existingTrade) {
      if (!existingTrade.screenshotUrl && screenshotDonor?.screenshotUrl) {
        const screenshotUrl = screenshotDonor.screenshotUrl;
        useTradeStore.setState((state) => ({
          trades: state.trades.map((item) => item.id === existingTrade.id
            ? { ...item, screenshotUrl, updatedAt: new Date().toISOString() }
            : item),
        }));
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('trades')
            .update({ screenshot_url: screenshotUrl, updated_at: new Date().toISOString() })
            .eq('id', existingTrade.id);
          if (error) console.warn('[FundedNext] Could not repair trade screenshot:', error);
        }
      }
      continue;
    }

    await addTrade({
      pair: trade.pair || 'XAUUSD',
      market: trade.market || 'Commodities',
      direction: trade.direction || 'Long',
      entryPrice: trade.entryPrice || 0,
      exitPrice: trade.exitPrice || 0,
      stopLoss: trade.stopLoss || 0,
      takeProfit: trade.takeProfit || 0,
      positionSize: trade.positionSize || 1,
      riskPercent: 1,
      rewardPercent: 2,
      fees: trade.fees || 0,
      session: trade.session || 'New York',
      strategy: trade.strategy || 'FundedNext Trade',
      setup: trade.setup || 'FundedNext MCP Sync',
      timeframe: trade.timeframe || '15m',
      date: trade.date || new Date().toISOString(),
      duration: trade.duration || '45m',
      rating: trade.rating || 5,
      emotionBefore: trade.emotionBefore || 'Calm',
      emotionDuring: trade.emotionDuring || 'Disciplined',
      emotionAfter: trade.emotionAfter || 'Calm',
      confidenceLevel: trade.confidenceLevel || 8,
      isMistake: trade.isMistake || false,
      lessonsLearned: trade.lessonsLearned || 'Synced automatically via FundedNext MCP Server.',
      screenshotUrl: trade.screenshotUrl || screenshotDonor?.screenshotUrl || '',
      tradingViewLink: trade.tradingViewLink || '',
      notes: trade.notes || `FundedNext ${accountNumber} Prop Trade Sync`,
      tags: Array.from(new Set([...(trade.tags || []), 'FundedNext', accountTag, 'PropFirm', 'MCP'])),
      isFavorite: trade.isFavorite || false,
      isArchived: false,
      pnl: trade.pnl,
    });
    importedCount++;
  }

  return importedCount;
}

interface FundedNextBalanceTracking {
  balancePeaks: Record<string, number>;
  detectedPayouts: Record<string, FundedNextPayoutEvent[]>;
}

let latestFundedNextSelectionRequest = 0;

async function reconcileFundedNextBalances(
  tracking: FundedNextBalanceTracking,
  accounts: FundedNextAccount[]
): Promise<FundedNextBalanceTracking> {
  const balancePeaks = { ...tracking.balancePeaks };
  const detectedPayouts = { ...tracking.detectedPayouts };

  for (const account of accounts) {
    const key = account.accountNumber;
    const currentBalance = Number(account.balance);
    const initialBalance = Number(account.initialBalance);
    if (!key || !Number.isFinite(currentBalance) || !Number.isFinite(initialBalance)) continue;

    const storageKey = `fundednext_balance_${key}`;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', storageKey)
          .maybeSingle();
        if (data?.value) {
          const remote = JSON.parse(data.value) as {
            peak?: number;
            payouts?: FundedNextPayoutEvent[];
          };
          if (Number.isFinite(remote.peak)) balancePeaks[key] = Number(remote.peak);
          if (Array.isArray(remote.payouts)) detectedPayouts[key] = remote.payouts.slice(0, 20);
        }
      } catch (error) {
        console.warn('[FundedNext] Could not load cloud balance history:', error);
      }
    }

    const previousPeak = balancePeaks[key];
    if (!Number.isFinite(previousPeak)) {
      balancePeaks[key] = Math.max(initialBalance, currentBalance);
    } else {
      const resetTolerance = Math.max(1, initialBalance * 0.001);
      const minimumPayout = Math.max(10, initialBalance * 0.0025);
      const returnedToStart = Math.abs(currentBalance - initialBalance) <= resetTolerance;
      const hadWithdrawableProfit = previousPeak >= initialBalance + minimumPayout;
      const balanceWasReset = previousPeak - currentBalance >= minimumPayout;

      if (returnedToStart && hadWithdrawableProfit && balanceWasReset) {
        const amount = Math.round((previousPeak - currentBalance) * 100) / 100;
        const event: FundedNextPayoutEvent = {
          id: `${key}-${Date.now()}-${amount.toFixed(2)}`,
          accountNumber: key,
          amount,
          peakBalance: previousPeak,
          balanceAfterPayout: currentBalance,
          detectedAt: new Date().toISOString(),
        };
        detectedPayouts[key] = [event, ...(detectedPayouts[key] || [])].slice(0, 20);
        balancePeaks[key] = Math.max(initialBalance, currentBalance);
      } else {
        balancePeaks[key] = Math.max(previousPeak, currentBalance);
      }
    }

    const inferredPayoutTotal = Number(account.inferredPayoutTotal || 0);
    const knownPayoutTotal = (detectedPayouts[key] || []).reduce((sum, payout) => sum + payout.amount, 0);
    const unrecordedPayout = Math.round((inferredPayoutTotal - knownPayoutTotal) * 100) / 100;
    const inferenceThreshold = Math.max(10, initialBalance * 0.0025);

    if (unrecordedPayout >= inferenceThreshold) {
      const event: FundedNextPayoutEvent = {
        id: `${key}-history-${Math.round(inferredPayoutTotal * 100)}`,
        accountNumber: key,
        amount: unrecordedPayout,
        peakBalance: Math.round((currentBalance + unrecordedPayout) * 100) / 100,
        balanceAfterPayout: currentBalance,
        detectedAt: new Date().toISOString(),
      };
      detectedPayouts[key] = [event, ...(detectedPayouts[key] || [])].slice(0, 20);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('app_settings').upsert({
          key: storageKey,
          value: JSON.stringify({ peak: balancePeaks[key], payouts: detectedPayouts[key] || [] }),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      } catch (error) {
        console.warn('[FundedNext] Could not save cloud balance history:', error);
      }
    }
  }

  return { balancePeaks, detectedPayouts };
}

interface FundedNextStore {
  token: string;
  accounts: FundedNextAccount[];
  account: FundedNextAccount | null;
  selectedAccountNumber: string | null;
  isConnected: boolean;
  isSyncing: boolean;
  hasLoadedAccounts: boolean;
  lastError: string | null;
  balancePeaks: Record<string, number>;
  detectedPayouts: Record<string, FundedNextPayoutEvent[]>;
  setToken: (token: string) => void;
  connect: (token: string) => Promise<boolean>;
  selectAccount: (accountNumber: string) => Promise<boolean>;
  sync: () => Promise<boolean>;
  clearSelection: () => void;
  disconnect: () => void;
}

const DEFAULT_FUNDEDNEXT_TOKEN = '';

export const useFundedNextStore = create<FundedNextStore>()(
  persist(
    (set, get) => ({
      token: DEFAULT_FUNDEDNEXT_TOKEN,
      accounts: [],
      account: null,
      selectedAccountNumber: null,
      isConnected: false,
      isSyncing: false,
      hasLoadedAccounts: false,
      lastError: null,
      balancePeaks: {},
      detectedPayouts: {},

      setToken: (token: string) => set({ token }),

      connect: async (tokenInput: string) => {
        const cleanToken = (tokenInput || DEFAULT_FUNDEDNEXT_TOKEN).trim();
        if (!cleanToken) {
          toast.error('FundedNext token is required');
          return false;
        }

        set({ isSyncing: true, lastError: null });
        try {
          const selectedAccountNumber = get().selectedAccountNumber;
          const res = await fetch('/api/fundednext-mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'connect', token: cleanToken, accountNumber: selectedAccountNumber }),
          });

          const data = await res.json();
          if (data.success && data.selectionRequired) {
            const nextAccounts = data.accounts || [];
            const balanceTracking = await reconcileFundedNextBalances(get(), nextAccounts);
            set({
              token: cleanToken,
              accounts: nextAccounts,
              account: null,
              selectedAccountNumber: null,
              isConnected: true,
              isSyncing: false,
              hasLoadedAccounts: true,
              lastError: null,
              ...balanceTracking,
            });
            return true;
          }

          if (data.success && data.account) {
            const nextAccounts = data.accounts || [data.account];
            const previousPayoutCount = (get().detectedPayouts[data.account.accountNumber] || []).length;
            const balanceTracking = await reconcileFundedNextBalances(get(), nextAccounts);
            set({
              token: cleanToken,
              accounts: nextAccounts,
              account: data.account,
              selectedAccountNumber: data.account.accountNumber,
              isConnected: true,
              isSyncing: false,
              hasLoadedAccounts: true,
              lastError: null,
              ...balanceTracking,
            });

            if ((balanceTracking.detectedPayouts[data.account.accountNumber] || []).length > previousPayoutCount) {
              const payout = balanceTracking.detectedPayouts[data.account.accountNumber][0];
              toast.success(`Payout detected: $${payout.amount.toFixed(2)}`);
            }

            const importedCount = await importFundedNextTrades(data.trades, data.account.accountNumber);
            if (importedCount > 0) toast.success(`Imported ${importedCount} FundedNext trades`);

            toast.success(`Account ${data.account.accountNumber} is ready`);
            return true;
          } else {
            const message = data.error || 'Failed to connect FundedNext MCP';
            const tokenRejected = /invalid|revoked/i.test(message);
            toast.error(message);
            set({
              ...(tokenRejected ? { token: '', isConnected: false } : {}),
              isSyncing: false,
              hasLoadedAccounts: true,
              lastError: message,
            });
            return false;
          }
        } catch (err: any) {
          console.error('FundedNext MCP Connect error:', err);
          const message = 'Could not reach the FundedNext MCP server';
          toast.error(message);
          set({ isSyncing: false, hasLoadedAccounts: true, lastError: message });
          return false;
        }
      },

      selectAccount: async (accountNumber: string) => {
        const { token, accounts } = get();
        if (!accountNumber) return false;

        const cachedAccount = accounts.find((candidate) => candidate.accountNumber === accountNumber);
        if (!token) {
          if (!cachedAccount) return false;
          set({
            account: cachedAccount,
            selectedAccountNumber: accountNumber,
            isConnected: false,
            isSyncing: false,
          });
          toast.warning('Showing cached account data. Add a new MCP token to resume live sync.');
          return true;
        }

        const requestId = ++latestFundedNextSelectionRequest;

        // Switch the visible account immediately; live MCP data refreshes in the background.
        set({
          ...(cachedAccount ? { account: cachedAccount } : {}),
          selectedAccountNumber: accountNumber,
          isConnected: true,
          isSyncing: true,
          lastError: null,
        });

        try {
          const res = await fetch('/api/fundednext-mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', token, accountNumber }),
          });
          const data = await res.json();
          if (requestId !== latestFundedNextSelectionRequest || get().selectedAccountNumber !== accountNumber) {
            return true;
          }
          if (!data.success || !data.account) {
            const message = data.error || 'Could not load this FundedNext account';
            const tokenRejected = /invalid|revoked/i.test(message);
            set({
              ...(tokenRejected ? { token: '', isConnected: false } : {}),
              isSyncing: false,
              lastError: message,
              accounts: data.accounts || get().accounts,
            });
            toast.error(cachedAccount ? `${message} Showing cached account data.` : message);
            return false;
          }

          const nextAccounts = data.accounts || get().accounts;
          const previousPayoutCount = (get().detectedPayouts[data.account.accountNumber] || []).length;
          const balanceTracking = await reconcileFundedNextBalances(get(), nextAccounts);
          set({
            accounts: nextAccounts,
            account: data.account,
            selectedAccountNumber: data.account.accountNumber,
            isConnected: true,
            isSyncing: false,
            hasLoadedAccounts: true,
            lastError: null,
            ...balanceTracking,
          });

          if ((balanceTracking.detectedPayouts[data.account.accountNumber] || []).length > previousPayoutCount) {
            const payout = balanceTracking.detectedPayouts[data.account.accountNumber][0];
            toast.success(`Payout detected: $${payout.amount.toFixed(2)}`);
          }

          const importedCount = await importFundedNextTrades(data.trades, data.account.accountNumber);
          toast.success(importedCount > 0
            ? `${data.account.accountNumber}: ${importedCount} new trades imported`
            : `${data.account.accountNumber} is up to date`);
          return true;
        } catch (err) {
          if (requestId !== latestFundedNextSelectionRequest || get().selectedAccountNumber !== accountNumber) {
            return true;
          }
          const message = 'Could not reach the FundedNext MCP server';
          set({ isSyncing: false, lastError: message });
          toast.error(cachedAccount ? `${message}. Showing cached account data.` : message);
          return false;
        }
      },

      sync: async () => {
        const { token, isConnected, selectedAccountNumber, isSyncing } = get();
        if (!token || !isConnected || !selectedAccountNumber || isSyncing) return false;

        set({ isSyncing: true });
        try {
          const res = await fetch('/api/fundednext-mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', token, accountNumber: selectedAccountNumber }),
          });

          const data = await res.json();
          if (get().selectedAccountNumber !== selectedAccountNumber) return true;
          if (data.success && data.account) {
            const nextAccounts = data.accounts || get().accounts;
            const previousPayoutCount = (get().detectedPayouts[data.account.accountNumber] || []).length;
            const balanceTracking = await reconcileFundedNextBalances(get(), nextAccounts);
            set({
              account: data.account,
              accounts: nextAccounts,
              isSyncing: false,
              lastError: null,
              ...balanceTracking,
            });

            if ((balanceTracking.detectedPayouts[data.account.accountNumber] || []).length > previousPayoutCount) {
              const payout = balanceTracking.detectedPayouts[data.account.accountNumber][0];
              toast.success(`Payout detected: $${payout.amount.toFixed(2)}`);
            }

            const importedCount = await importFundedNextTrades(data.trades, data.account.accountNumber);
            if (importedCount > 0) toast.success(`Synced ${importedCount} new FundedNext trades`);

            return true;
          } else {
            const message = data.error || 'FundedNext sync failed';
            const tokenRejected = /invalid|revoked/i.test(message);
            set({
              ...(tokenRejected ? { token: '', isConnected: false } : {}),
              isSyncing: false,
              lastError: message,
            });
            return false;
          }
        } catch (e) {
          set({ isSyncing: false, lastError: 'Could not reach the FundedNext MCP server' });
          return false;
        }
      },

      clearSelection: () => set({ account: null, selectedAccountNumber: null, lastError: null }),

      disconnect: () => {
        set({
          token: '',
          accounts: [],
          account: null,
          selectedAccountNumber: null,
          isConnected: false,
          isSyncing: false,
          hasLoadedAccounts: false,
          lastError: null,
        });
        toast.info('FundedNext MCP account disconnected.');
      },
    }),
    {
      name: 'draga-fundednext-mcp',
      storage: createJSONStorage(() => customStorage),
    }
  )
);

