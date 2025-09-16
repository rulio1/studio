'use server';

import { adminStorage } from '@/lib/firebase-admin';
import { dataURItoFile } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Faz o upload de uma imagem codificada em data URI para o Firebase Storage e retorna a URL de download.
 * Esta é uma Ação de Servidor e deve ser executada apenas no lado do servidor.
 * @param dataURI A imagem como uma string data URI.
 * @param path O caminho no Firebase Storage para salvar a imagem (ex: `users/[userId]/avatar`).
 * @returns A URL de download pública da imagem.
 */
export async function uploadImage(dataURI: string, path: string): Promise<string> {
    try {
        const file = dataURItoFile(dataURI, `${uuidv4()}`);
        const bucket = adminStorage.bucket();
        const filePath = `${path}/${file.name}`;
        const fileUpload = bucket.file(filePath);
        
        const buffer = Buffer.from(await file.arrayBuffer());

        await fileUpload.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Torna o arquivo público e obtém a URL
        await fileUpload.makePublic();
        return fileUpload.publicUrl();

    } catch (error) {
        console.error("Error uploading image to Firebase Storage: ", error);
        throw new Error("Falha no upload da imagem.");
    }
}
