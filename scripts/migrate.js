const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://spdodiwssapatogcrtvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1xKH99svVYz-06x9324FwQ_D01be';

const mapTradeToDb = (js, userId) => ({
  id: js.id,
  user_id: userId,
  pair: js.pair,
  market: js.market,
  direction: js.direction,
  result: js.result,
  entry_price: js.entryPrice,
  exit_price: js.exitPrice || 0,
  stop_loss: js.stopLoss || 0,
  take_profit: js.takeProfit || 0,
  position_size: js.positionSize,
  risk_percent: js.riskPercent || 0,
  reward_percent: js.rewardPercent || 0,
  fees: js.fees || 0,
  pnl: js.pnl || 0,
  rr_ratio: js.rrRatio || 0,
  session: js.session,
  strategy: js.strategy,
  setup: js.setup || '',
  timeframe: js.timeframe,
  date: js.date,
  duration: js.duration || '',
  rating: js.rating || 3,
  emotion_before: js.emotionBefore || 'Calm',
  emotion_during: js.emotionDuring || 'Calm',
  emotion_after: js.emotionAfter || 'Calm',
  confidence_level: js.confidenceLevel || 5,
  is_mistake: js.isMistake || false,
  lessons_learned: js.lessonsLearned || '',
  screenshot_url: js.screenshotUrl || '',
  trading_view_link: js.tradingViewLink || '',
  notes: js.notes || '',
  tags: js.tags || [],
  is_favorite: js.isFavorite || false,
  is_archived: js.isArchived || false,
  created_at: js.createdAt || new Date().toISOString(),
  updated_at: js.updatedAt || new Date().toISOString(),
});

const mapJournalToDb = (js, userId) => ({
  id: js.id,
  user_id: userId,
  title: js.title,
  content: js.content,
  mood: js.mood || 'Calm',
  type: js.type || 'daily',
  tags: js.tags || [],
  is_pinned: js.isPinned || false,
  is_favorite: js.isFavorite || false,
  trade_ids: js.tradeIds || [],
  date: js.date,
  folder: js.folder || null,
  created_at: js.createdAt || new Date().toISOString(),
  updated_at: js.updatedAt || new Date().toISOString(),
});

const mapGoalToDb = (js, userId) => ({
  id: js.id,
  user_id: userId,
  title: js.title,
  description: js.description || '',
  type: js.type || 'weekly',
  target: js.target || 0,
  current: js.current || 0,
  unit: js.unit || '',
  start_date: js.startDate || new Date().toISOString(),
  end_date: js.endDate || new Date().toISOString(),
  is_completed: js.isCompleted || false,
  created_at: js.createdAt || new Date().toISOString(),
});

async function main() {
  console.log('Authenticating with Supabase REST API...');
  const email = 'draga4life@draga-ai.com';
  const password = 'dragalolo';

  // 1. Authenticate via Supabase Auth API
  let accessToken = null;
  let userId = null;

  const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  let authRes = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  let authData = await authRes.json();

  if (!authRes.ok) {
    console.log('Sign in response:', authData);
    console.log('Attempting sign up...');
    const signUpUrl = `${SUPABASE_URL}/auth/v1/signup`;
    const signUpRes = await fetch(signUpUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const signUpData = await signUpRes.json();
    console.log('Sign up response:', signUpData);

    authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    authData = await authRes.json();
  }

  if (authData.access_token) {
    accessToken = authData.access_token;
    userId = authData.user.id;
    console.log(`Authenticated as User ID: ${userId}`);
  } else {
    console.error('Failed to authenticate:', authData);
    process.exit(1);
  }

  // 2. Read .draga-db.json
  const dbPath = path.join(process.cwd(), '.draga-db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('.draga-db.json not found!');
    process.exit(1);
  }

  const rawDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  // 3. Extract items
  let trades = [];
  if (rawDb['trading-journal-trades']) {
    const parsed = JSON.parse(rawDb['trading-journal-trades']);
    trades = parsed.state ? parsed.state.trades || [] : [];
  }

  let entries = [];
  if (rawDb['trading-journal-entries']) {
    const parsed = JSON.parse(rawDb['trading-journal-entries']);
    entries = parsed.state ? parsed.state.entries || [] : [];
  }

  let goals = [];
  if (rawDb['trading-journal-goals']) {
    const parsed = JSON.parse(rawDb['trading-journal-goals']);
    goals = parsed.state ? parsed.state.goals || [] : [];
  }

  console.log(`Found ${trades.length} trades, ${entries.length} journal entries, and ${goals.length} goals in .draga-db.json.`);

  // 4. Upload Trades
  if (trades.length > 0) {
    console.log('Uploading trades to Supabase PostgreSQL...');
    const tradeRows = trades.map((t) => mapTradeToDb(t, userId));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trades`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(tradeRows),
    });

    if (res.ok) {
      console.log(`✅ Successfully uploaded ${trades.length} trades!`);
    } else {
      const errText = await res.text();
      console.error('❌ Trade upload error:', errText);
    }
  }

  // 5. Upload Journal Entries
  if (entries.length > 0) {
    console.log('Uploading journal entries to Supabase PostgreSQL...');
    const entryRows = entries.map((e) => mapJournalToDb(e, userId));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/journal_entries`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(entryRows),
    });

    if (res.ok) {
      console.log(`✅ Successfully uploaded ${entries.length} journal entries!`);
    } else {
      const errText = await res.text();
      console.error('❌ Journal entry upload error:', errText);
    }
  }

  // 6. Upload Goals
  if (goals.length > 0) {
    console.log('Uploading goals to Supabase PostgreSQL...');
    const goalRows = goals.map((g) => mapGoalToDb(g, userId));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/goals`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(goalRows),
    });

    if (res.ok) {
      console.log(`✅ Successfully uploaded ${goals.length} goals!`);
    } else {
      const errText = await res.text();
      console.error('❌ Goals upload error:', errText);
    }
  }

  console.log('\n🎉 ALL DATA HAS BEEN MIGRATED AND SYNCED TO YOUR SUPABASE CLOUD DATABASE!');
}

main().catch(console.error);
