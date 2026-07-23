-- ============================================================
-- Draga AI Trading Journal - Supabase PostgreSQL Schema & Security
-- Run this in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)
-- ============================================================

-- 1. Create Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- 3. Create Strict User Isolation Policies
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
CREATE POLICY "Users can view their own trades" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own trades" ON public.trades;
CREATE POLICY "Users can insert their own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
CREATE POLICY "Users can update their own trades" ON public.trades
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trades" ON public.trades;
CREATE POLICY "Users can delete their own trades" ON public.trades
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create Storage Bucket for Trade Screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Bucket Security Policies
DROP POLICY IF EXISTS "Public Read Access for Screenshots" ON storage.objects;
CREATE POLICY "Public Read Access for Screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'trade-screenshots');

DROP POLICY IF EXISTS "Authenticated Upload Access for Screenshots" ON storage.objects;
CREATE POLICY "Authenticated Upload Access for Screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'trade-screenshots' AND auth.role() = 'authenticated');
