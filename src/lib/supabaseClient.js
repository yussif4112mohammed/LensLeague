import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail-safe fallback initialization to prevent application crashes when env variables are empty
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuration keys are missing. Application will run in local-mock fallback mode. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside .env.local to connect to your live database.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key-value'
);
