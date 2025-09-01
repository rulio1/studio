
import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente da Vercel podem ter nomes longos e confusos.
// Vamos pegar as chaves corretas, priorizando os nomes mais simples.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL ou Anon Key não encontradas nas variáveis de ambiente.');
    console.error('URL Encontrada:', supabaseUrl);
    console.error('Chave Encontrada:', supabaseAnonKey ? 'Sim' : 'Não');
    // Não lançamos um erro aqui para permitir que o build não quebre,
    // mas o console mostrará o que está faltando.
}

// Usamos uma variável "singleton" para garantir que o cliente seja criado apenas uma vez.
let supabase: ReturnType<typeof createClient>;

export const getSupabase = () => {
    // Se o cliente ainda não foi criado e temos as chaves, crie-o.
    if (!supabase && supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Retorna o cliente existente (ou null se as chaves não estiverem disponíveis).
    // O código que o utiliza deve lidar com a possibilidade de ser nulo.
    return supabase;
};
