
'use server';

import { adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function uploadImageAndGetURL(imageDataUri: string, userId: string): Promise<string> {
    if (!imageDataUri.startsWith('data:image')) {
        throw new Error('Invalid data URI');
    }

    try {
        const bucket = adminStorage.bucket();
        const fileType = imageDataUri.split(';')[0].split('/')[1] || 'png';
        const mimeType = imageDataUri.split(';')[0].split(':')[1] || 'image/png';
        const fileName = `${userId}/${uuidv4()}.${fileType}`;
        
        // Remove the data URI prefix to get the pure base64 string
        const base64EncodedImageString = imageDataUri.split(',')[1];
        const imageBuffer = Buffer.from(base64EncodedImageString, 'base64');
        
        const file = bucket.file(fileName);

        await file.save(imageBuffer, {
            metadata: {
                contentType: mimeType,
            },
        });

        // Make the file public and get the URL
        await file.makePublic();
        
        return file.publicUrl();

    } catch (error) {
        console.error("Error uploading image: ", error);
        throw new Error("Failed to upload image.");
    }
}
