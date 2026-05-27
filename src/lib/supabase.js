import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasValidSupabaseUrl = (() => {
  if (!supabaseUrl || !/^https?:\/\//.test(supabaseUrl)) return false;

  try {
    new URL(supabaseUrl);
    return true;
  } catch {
    return false;
  }
})();

export const supabaseConfigError =
  hasValidSupabaseUrl && supabaseKey
    ? ''
    : 'Supabase is not configured. Set VITE_SUPABASE_URL to your project URL and VITE_SUPABASE_ANON_KEY to your anon key.';

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseKey);
