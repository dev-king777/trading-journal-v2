-- Create app_settings table for key-value storage (payout goals, etc.)
-- This table stores cross-device app settings like the payout goal

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - allow all for anon key since this is a personal app
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated and anonymous users
CREATE POLICY "Allow all access to app_settings" ON app_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
