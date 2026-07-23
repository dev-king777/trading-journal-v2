-- ============================================================
-- Draga AI Trading Journal - Supabase PostgreSQL Schema & Security
-- Run this in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)
-- ============================================================

-- 1. Create Trades Table (Uses TEXT for primary key to support all trade ID formats)
CREATE TABLE IF NOT EXISTS public.trades (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  pair TEXT NOT NULL,
  market TEXT NOT NULL,
  direction TEXT NOT NULL,
  result TEXT NOT NULL,
  entry_price NUMERIC DEFAULT 0,
  exit_price NUMERIC DEFAULT 0,
  stop_loss NUMERIC DEFAULT 0,
  take_profit NUMERIC DEFAULT 0,
  position_size NUMERIC DEFAULT 0,
  risk_percent NUMERIC DEFAULT 0,
  reward_percent NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  pnl NUMERIC DEFAULT 0,
  rr_ratio NUMERIC DEFAULT 0,
  session TEXT,
  strategy TEXT,
  setup TEXT,
  timeframe TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  duration TEXT,
  rating INTEGER DEFAULT 3,
  emotion_before TEXT,
  emotion_during TEXT,
  emotion_after TEXT,
  confidence_level INTEGER DEFAULT 5,
  is_mistake BOOLEAN DEFAULT false,
  lessons_learned TEXT,
  screenshot_url TEXT,
  trading_view_link TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Journal Entries Table
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT DEFAULT 'Calm',
  type TEXT DEFAULT 'daily',
  tags JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  trade_ids JSONB DEFAULT '[]'::jsonb,
  date TIMESTAMPTZ DEFAULT now(),
  folder TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'weekly',
  target NUMERIC DEFAULT 0,
  current NUMERIC DEFAULT 0,
  unit TEXT,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ DEFAULT now(),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 5. Create Strict User Isolation Policies for Trades
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
CREATE POLICY "Users can view their own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own trades" ON public.trades;
CREATE POLICY "Users can insert their own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
CREATE POLICY "Users can update their own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trades" ON public.trades;
CREATE POLICY "Users can delete their own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- 6. User Isolation Policies for Journal Entries
DROP POLICY IF EXISTS "Users can view their own journal" ON public.journal_entries;
CREATE POLICY "Users can view their own journal" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own journal" ON public.journal_entries;
CREATE POLICY "Users can insert their own journal" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own journal" ON public.journal_entries;
CREATE POLICY "Users can update their own journal" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own journal" ON public.journal_entries;
CREATE POLICY "Users can delete their own journal" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

-- 7. User Isolation Policies for Goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
CREATE POLICY "Users can view their own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
CREATE POLICY "Users can insert their own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
CREATE POLICY "Users can update their own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;
CREATE POLICY "Users can delete their own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- 8. Create Storage Bucket for Trade Screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Storage Bucket Security Policies
DROP POLICY IF EXISTS "Public Read Access for Screenshots" ON storage.objects;
CREATE POLICY "Public Read Access for Screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'trade-screenshots');

DROP POLICY IF EXISTS "Authenticated Upload Access for Screenshots" ON storage.objects;
CREATE POLICY "Authenticated Upload Access for Screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'trade-screenshots' AND auth.role() = 'authenticated');
