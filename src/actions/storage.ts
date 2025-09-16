
'use server';

import { adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function uploadImageAndGetURL(dataUri: string, userId: string, folder: 'avatar' | 'banner' | 'post'): Promise<string> {
    if (!dataUri) {
        throw new Error("Image data is missing.");
    }
     if (!userId) {
        throw new Error("User ID is missing.");
    }

    try {
        const bucket = adminStorage.bucket();
        const fileExtension = dataUri.substring(dataUri.indexOf('/') + 1, dataUri.indexOf(';'));
        const fileName = `${userId}/${folder}/${uuidv4()}.${fileExtension}`;
        const file = bucket.file(fileName);

        const buffer = Buffer.from(dataUri.split(',')[1], 'base64');
        
        await file.save(buffer, {
            metadata: {
                contentType: `image/${fileExtension}`,
                cacheControl: 'public, max-age=31536000',
            },
        });
        
        // Return the public URL
        return file.publicUrl();

    } catch (error) {
        console.error("Error uploading image: ", error);
        throw new Error("Failed to upload image.");
    }
}
