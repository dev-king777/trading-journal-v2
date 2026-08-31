import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://spdodiwssapatogcrtvx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_1xKH99svVYz-06x9324FwQ_D01be';

const getSupabaseCredentials = () => {
  if (typeof window === 'undefined') {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    };
  }

  try {
    const localSettings = localStorage.getItem('trading-journal-settings');
    if (localSettings) {
      const parsed = JSON.parse(localSettings);
      const settings = parsed.state?.settings;
      if (settings?.supabaseUrl && settings?.supabaseAnonKey) {
        return { url: settings.supabaseUrl, key: settings.supabaseAnonKey };
      }
    }
  } catch (e) {
    console.error('Failed to parse local storage settings for Supabase:', e);
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  };
};

const credentials = getSupabaseCredentials();

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  credentials.url && credentials.key && isValidUrl(credentials.url)
);

export const supabase = isSupabaseConfigured
  ? createClient(credentials.url, credentials.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null as any;

/**
 * Upload screenshot to Supabase Storage Bucket 'trade-screenshots'
 */
const MAX_SCREENSHOT_BYTES = 12 * 1024 * 1024;

export async function uploadScreenshotToStorage(file: File, tradeId?: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file.');
  }

  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error('Screenshot must be smaller than 12 MB.');
  }

  const rawExt = file.name.split('.').pop()?.toLowerCase();
  const fileExt = rawExt && /^[a-z0-9]+$/.test(rawExt) ? rawExt : 'jpg';
  const owner = tradeId?.replace(/[^a-zA-Z0-9_-]/g, '') || 'drafts';
  const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const filePath = `trades/${owner}/${uniqueId}.${fileExt}`;

  const { error } = await supabase.storage
    .from('trade-screenshots')
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('trade-screenshots')
    .getPublicUrl(filePath);

  if (!publicUrlData.publicUrl) {
    throw new Error('Storage did not return a public screenshot URL.');
  }

  return publicUrlData.publicUrl;
}
