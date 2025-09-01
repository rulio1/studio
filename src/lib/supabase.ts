
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This is a singleton pattern to ensure we only have one instance of the Supabase client
let supabase: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided.');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}
