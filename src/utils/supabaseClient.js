import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseUrl = configuredUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
