
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This is a singleton pattern to ensure we only have one instance of the Supabase client
let supabase: SupabaseClient | undefined;

export function getSupabase(token?: string) {
  // If a token is provided, we're likely in a secure, user-specific context.
  // We should create a new client with the user's auth token.
  if (token) {
    const supabaseWithAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          },
        }
      );
      return supabaseWithAuth;
  }
  
  // If we already have a client instance and no token is provided, return it.
  if (supabase) {
    return supabase;
  }

  // If no instance exists and no token is provided, create a new anonymous client.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL and Anon Key must be provided.');
  }

  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  return supabase;
}
