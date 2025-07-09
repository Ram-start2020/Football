
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// The createClient function can be called with placeholder values, but it's better
// to prevent network requests if the config is invalid.
// The app expects a client object to exist. We initialize it here,
// and the logic in App.tsx will prevent its use if the config is invalid,
// showing a friendly error message instead of crashing.
if (SUPABASE_URL === 'https://sodopikctzypkmczimfe.supabase.co' || SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvZG9waWtjdHp5cGttY3ppbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3Mjk2NTksImV4cCI6MjA2NzMwNTY1OX0.6Yus-NmgQ8xSC0odS91g5GudoXtC64oUOMICYDg09Kw') {
  console.error("Supabase configuration is missing. Please add your URL and Anon Key to config.ts");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
