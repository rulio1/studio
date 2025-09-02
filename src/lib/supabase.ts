import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { dataURItoFile } from './utils';

// As variáveis de ambiente da Vercel podem ter nomes longos e confusos.
// Vamos pegar as chaves corretas, priorizando os nomes mais simples.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL ou Anon Key não encontradas nas variáveis de ambiente.');
    console.error('Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão configuradas no painel da Vercel.');
}

// Usamos uma variável "singleton" para garantir que o cliente seja criado apenas uma vez.
let supabase: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
    // Se o cliente ainda não foi criado e temos as chaves, crie-o.
    if (!supabase && supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Retorna o cliente existente (ou null se as chaves não estiverem disponíveis).
    // O código que o utiliza deve lidar com a possibilidade de ser nulo.
    if (!supabase) {
        console.error("A conexão com o Supabase não pôde ser estabelecida. Verifique as variáveis de ambiente.");
        return null;
    }

    return supabase;
};

/**
 * Faz upload de uma imagem (em formato data URI) para um bucket específico no Supabase Storage.
 * @param dataUri A imagem codificada em data URI.
 * @param bucketPath O caminho do bucket (ex: 'avatars' ou 'posts').
 * @param userId O ID do usuário para organizar os arquivos.
 * @returns A URL pública da imagem após o upload.
 */
export async function uploadImageToSupabase(dataUri: string, bucketPath: 'avatars' | 'banners' | 'posts', userId: string): Promise<string> {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        throw new Error("A conexão com o Supabase não está configurada. Verifique as variáveis de ambiente.");
    }

    const file = dataURItoFile(dataUri, `${userId}-${uuidv4()}.jpg`);
    const filePath = `${bucketPath}/${userId}/${file.name}`;
    
    const { error: uploadError } = await supabaseClient.storage
        .from('zispr')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error(`Falha no upload da imagem: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseClient.storage
        .from('zispr')
        .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
        throw new Error("Não foi possível obter a URL pública da imagem após o upload.");
    }
    
    return urlData.publicUrl;
}
