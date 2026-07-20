-- ============================================================
-- SQL SCHEMA FOR PREMIUM TRADING JOURNAL
-- Paste this into your Supabase SQL Editor to initialize tables
-- ============================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(255) NOT NULL,
    market VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    result VARCHAR(20) NOT NULL,
    entry_price DOUBLE PRECISION NOT NULL,
    exit_price DOUBLE PRECISION,
    stop_loss DOUBLE PRECISION,
    take_profit DOUBLE PRECISION,
    position_size DOUBLE PRECISION NOT NULL,
    risk_percent DOUBLE PRECISION DEFAULT 1.0,
    reward_percent DOUBLE PRECISION DEFAULT 2.0,
    fees DOUBLE PRECISION DEFAULT 0.0,
    pnl DOUBLE PRECISION DEFAULT 0.0,
    rr_ratio DOUBLE PRECISION DEFAULT 0.0,
    session VARCHAR(50),
    strategy VARCHAR(255),
    setup TEXT,
    timeframe VARCHAR(20),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration VARCHAR(50),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    emotion_before VARCHAR(50),
    emotion_during VARCHAR(50),
    emotion_after VARCHAR(50),
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 10),
    is_mistake BOOLEAN DEFAULT FALSE,
    lessons_learned TEXT,
    screenshot_url TEXT,
    tradingview_link TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    mood VARCHAR(50),
    type VARCHAR(50) DEFAULT 'daily',
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    trade_ids TEXT[] DEFAULT '{}',
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    folder VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GOALS TABLE
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'risk', 'habit'
    target DOUBLE PRECISION NOT NULL,
    current DOUBLE PRECISION DEFAULT 0.0,
    unit VARCHAR(20) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    color VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MOOD ENTRIES / PSYCHOLOGY TRACKER
CREATE TABLE IF NOT EXISTS public.mood_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mood VARCHAR(50) NOT NULL,
    discipline_score INTEGER CHECK (discipline_score >= 1 AND discipline_score <= 10),
    fear_score INTEGER CHECK (fear_score >= 1 AND fear_score <= 10),
    greed_score INTEGER CHECK (greed_score >= 1 AND greed_score <= 10),
    confidence_score INTEGER CHECK (confidence_score >= 1 AND confidence_score <= 10),
    notes TEXT,
    reflection TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5 HABITS TABLE
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(255) NOT NULL,
    streak INTEGER DEFAULT 0,
    done BOOLEAN DEFAULT FALSE,
    last_done_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMENTS TABLE (for Trades detail timeline/history)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simple Row Level Security policies (allow all read/write for now to make it easy for users to plug & play)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read on trades" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on trades" ON public.trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on trades" ON public.trades FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on trades" ON public.trades FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read on journal" ON public.journal_entries FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on journal" ON public.journal_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on journal" ON public.journal_entries FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on journal" ON public.journal_entries FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read on goals" ON public.goals FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on goals" ON public.goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on goals" ON public.goals FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on goals" ON public.goals FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read on mood" ON public.mood_entries FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on mood" ON public.mood_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on mood" ON public.mood_entries FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on mood" ON public.mood_entries FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read on habits" ON public.habits FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on habits" ON public.habits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on habits" ON public.habits FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on habits" ON public.habits FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read on comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on comments" ON public.comments FOR DELETE USING (true);

-- Trigger to update update_at timestamp on edit
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trades_modtime BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_journal_modtime BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
