
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Re-export the type for convenience
export type { SupabaseClient };

// This is a singleton pattern to ensure we only have one instance of the Supabase client
let supabase: SupabaseClient | undefined;

export function getSupabase() {
  if (supabase) {
    return supabase;
  }

  // Ensure these variables are set in your environment
  if (!process.env.SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL and Anon Key must be provided.');
  }

  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  return supabase;
}
