
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be defined in environment variables');
}

let supabase: ReturnType<typeof createClient>;

export const getSupabase = () => {
    if (!supabase) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabase;
};
