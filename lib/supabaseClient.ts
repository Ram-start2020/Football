import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// These environment variables would be set in your hosting environment (e.g., Vercel, Netlify, or a .env file).
// You can get these from your Supabase project settings.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // A console error is used here to avoid crashing the app, allowing the UI to potentially
  // display a more user-friendly message about the misconfiguration.
  console.error("Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are not set.");
}

// By providing the Database type definition, the client becomes type-safe.
export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!);
