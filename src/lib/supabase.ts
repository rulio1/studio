
'use server';

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { dataURItoFile } from './utils';

// Esta função agora é chamada apenas no servidor, então podemos usar process.env diretamente.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase server credentials are missing. Check environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
        persistSession: false
    }
});

/**
 * Uploads an image to Supabase Storage using a server-side action.
 * This approach uses the service_role key to bypass RLS policies,
 * removing the need for complex client-side permission setup.
 * 
 * @param dataUri The base64 data URI of the image to upload.
 * @param userId The ID of the user uploading the image. Used to structure the file path.
 * @param bucketName The name of the Supabase Storage bucket (e.g., 'posts', 'avatars').
 * @returns The public URL of the uploaded image.
 */
export async function uploadImage(dataUri: string, userId: string, bucketName: 'posts' | 'avatars' | 'banners'): Promise<string | null> {
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL ou Chave de Serviço estão faltando. Upload cancelado.");
        throw new Error("Configuração do servidor de armazenamento ausente.");
    }
    
    try {
        const file = dataURItoFile(dataUri, `${uuidv4()}.jpg`);
        const filePath = `${userId}/${file.name}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false, 
            });

        if (uploadError) {
            // Throw the specific Supabase error to be caught by the calling function.
            console.error('Supabase Upload Error:', uploadError.message);
            throw new Error(`Erro no Supabase: ${uploadError.message}`);
        }

        const { data } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return data.publicUrl;

    } catch (error: any) {
        console.error("Erro ao fazer upload da imagem para o Supabase:", error.message || error);
        throw new Error(`Falha no upload da imagem. Por favor, tente novamente.`);
    }
}
