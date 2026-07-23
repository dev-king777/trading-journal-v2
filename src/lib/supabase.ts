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
export async function uploadScreenshotToStorage(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `screenshots/${fileName}`;

  const { data, error } = await supabase.storage
    .from('trade-screenshots')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('trade-screenshots')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
