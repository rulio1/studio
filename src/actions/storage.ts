
'use server';

import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Função para fazer upload de uma imagem em Base64 para o Firebase Storage.
 * Esta é uma Server Action, garantindo que as credenciais de administrador sejam manuseadas de forma segura no servidor.
 * @param dataUri - A imagem no formato Data URI (ex: "data:image/png;base64,...").
 * @param userId - O ID do usuário que está fazendo o upload.
 * @param bucketType - O diretório de destino no bucket ('posts', 'avatars', 'banners').
 * @returns A URL pública da imagem após o upload.
 */
export async function uploadImage(dataUri: string, userId: string, bucketType: 'posts' | 'avatars' | 'banners'): Promise<string> {
    
    // Garante que o Firebase Admin SDK seja inicializado no ambiente do servidor.
    initializeFirebaseAdmin();

    if (!dataUri) {
        throw new Error("A data URI da imagem está vazia.");
    }
    if (!userId) {
        throw new Error("ID do usuário é necessário para o upload.");
    }

    try {
        const bucket = getStorage().bucket();

        // Extrai o tipo de conteúdo e os dados da data URI
        const matches = dataUri.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error("Data URI inválida.");
        }
        
        const mimeType = matches[1]; // ex: "image/png"
        const base64Data = matches[2];
        const fileExtension = mimeType.split('/')[1];

        // Cria um buffer a partir dos dados em Base64
        const buffer = Buffer.from(base64Data, 'base64');

        // Gera um nome de arquivo único para evitar colisões
        const fileName = `${bucketType}/${userId}/${uuidv4()}.${fileExtension}`;
        const file = bucket.file(fileName);

        // Faz o upload do buffer para o Firebase Storage
        await file.save(buffer, {
            metadata: {
                contentType: mimeType,
            },
            public: true, // Torna o arquivo publicamente acessível
        });

        // Retorna a URL pública da imagem, que pode ser usada diretamente em tags <img>
        const publicUrl = file.publicUrl();
        return publicUrl;

    } catch (error: any) {
        console.error("Erro detalhado no upload para o Firebase Storage:", error);
        // Lança um erro mais genérico para o cliente, mas loga o erro detalhado no servidor.
        throw new Error(`Falha no upload da imagem. Por favor, tente novamente.`);
    }
}
