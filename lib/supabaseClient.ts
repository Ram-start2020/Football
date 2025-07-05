
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// The createClient function can be called with placeholder values, but it's better
// to prevent network requests if the config is invalid.
// The app expects a client object to exist. We initialize it here,
// and the logic in App.tsx will prevent its use if the config is invalid,
// showing a friendly error message instead of crashing.
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.error("Supabase configuration is missing. Please add your URL and Anon Key to config.ts");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
