'use server';

import { adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads an image from a data URI to Firebase Storage and returns its public URL.
 * @param dataURI The base64 encoded data URI of the image.
 * @param path The path in Firebase Storage where the image will be saved (e.g., 'users/[uid]/posts').
 * @returns The public URL of the uploaded image.
 */
export async function uploadImage(dataURI: string, path: string): Promise<string> {
    const bucket = adminStorage.bucket();
    
    // Extrai o tipo de conteúdo e os dados base64 do dataURI
    const match = dataURI.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!match) {
        throw new Error("Formato de dataURI inválido.");
    }
    
    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const fileExtension = contentType.split('/')[1];
    const fileName = `${path}/${uuidv4()}.${fileExtension}`;
    const file = bucket.file(fileName);

    try {
        await file.save(buffer, {
            metadata: {
                contentType: contentType,
                cacheControl: 'public, max-age=31536000', // Cache por 1 ano
            },
        });

        // Torna o arquivo público e obtém a URL
        await file.makePublic();
        return file.publicUrl();

    } catch (error) {
        console.error("Error uploading image to Firebase Storage: ", error);
        throw new Error("Falha no upload da imagem.");
    }
}
