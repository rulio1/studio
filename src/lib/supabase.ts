
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { dataURItoFile } from './utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing. Please check your .env.local file.");
    // We don't throw an error here to allow the app to build,
    // but features using Supabase will not work.
}

// Ensure createClient is called only when keys are available
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

/**
 * Uploads an image to Supabase Storage.
 * @param dataUri The base64 data URI of the image to upload.
 * @param userId The ID of the user uploading the image.
 * @param bucketName The name of the Supabase Storage bucket (e.g., 'posts', 'avatars').
 * @returns The public URL of the uploaded image.
 */
export async function uploadImage(dataUri: string, userId: string, bucketName: 'posts' | 'avatars' | 'banners'): Promise<string | null> {
    if (!supabase) {
        console.error("Supabase client is not initialized.");
        return null;
    }
    
    try {
        const file = dataURItoFile(dataUri, `${uuidv4()}.jpg`);
        const filePath = `${userId}/${bucketName}/${file.name}`;

        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return data.publicUrl;

    } catch (error) {
        console.error("Error uploading image to Supabase:", error);
        return null;
    }
}
