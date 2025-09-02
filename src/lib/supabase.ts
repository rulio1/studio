
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { dataURItoFile } from './utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.error("Supabase URL or Anon Key is missing. Please check your .env.local file.");
}

/**
 * Uploads an image to Supabase Storage.
 * @param dataUri The base64 data URI of the image to upload.
 * @param userId The ID of the user uploading the image.
 * @param bucketName The name of the Supabase Storage bucket (e.g., 'posts', 'avatars').
 * @returns The public URL of the uploaded image.
 */
export async function uploadImage(dataUri: string, userId: string, bucketName: 'posts' | 'avatars' | 'banners'): Promise<string | null> {
    if (!supabase) {
        console.error("Supabase client is not initialized. Cannot upload image.");
        throw new Error("A conexão com o serviço de armazenamento não foi inicializada.");
    }
    
    try {
        const file = dataURItoFile(dataUri, `${uuidv4()}.jpg`);
        const filePath = `${userId}/${file.name}`;

        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false, 
            });

        if (uploadError) {
            // Throw the specific Supabase error to be caught by the calling function.
            // This will give us a more detailed error message.
            throw uploadError;
        }

        const { data } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return data.publicUrl;

    } catch (error: any) {
        // Log the detailed error for easier debugging and re-throw a user-friendly message.
        console.error("Error uploading image to Supabase:", error.message || error);
        // This message can be displayed to the user in a toast.
        throw new Error(`Falha no upload da imagem: ${error.message}`);
    }
}
