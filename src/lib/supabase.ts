
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This is a singleton pattern to ensure we only have one instance of the Supabase client
let supabase: SupabaseClient | undefined;

export function getSupabase() {
  // If we already have a client instance, return it.
  if (supabase) {
    return supabase;
  }

  // If no instance exists, create a new anonymous client.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL and Anon Key must be provided.');
  }

  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  return supabase;
}
