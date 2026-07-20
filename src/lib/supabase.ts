import { createClient } from '@supabase/supabase-js';

const getSupabaseCredentials = () => {
  if (typeof window === 'undefined') {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
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
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  };
};

const credentials = getSupabaseCredentials();

// Validate that the URL is actually a real HTTP(S) URL, not a placeholder
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

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase credentials are not configured. Running in Offline LocalStorage Fallback Mode. Configure them in Settings or .env.local.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(credentials.url, credentials.key)
  : null as any;
