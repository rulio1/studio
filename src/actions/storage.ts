
'use server';

import { collection, doc, runTransaction, serverTimestamp, getFirestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import axios from 'axios';
import FormData from 'form-data';

interface PostData {
    authorId: string;
    author: string;
    handle: string;
    avatar: string;
    avatarFallback: string;
    content: string;
    isVerified: boolean;
    quotedPostId: string | null;
    location: string | null;
    replySettings: 'everyone' | 'following' | 'mentioned';
    poll: {
        options: string[];
        votes: number[];
        voters: Record<string, number>;
    } | null;
}

// Inicializa o Firebase Admin SDK se ainda não tiver sido inicializado
if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            }),
        });
    } catch (error: any) {
        console.error('Firebase admin initialization error', error);
    }
}

const db = getFirestore();

const extractHashtags = (content: string) => {
    const regex = /#(\w+)/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
};

const extractMentions = (content: string) => {
    const regex = /@(\w+)/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches)];
};

const extractSpotifyUrl = (text: string): string | null => {
    if (!text) return null;
    const spotifyRegex = /(https?:\/\/(?:open|play)\.spotify\.com\/(?:track|album|artist|playlist)\/[a-zA-Z0-9]+)/;
    const match = text.match(spotifyRegex);
    return match ? match[0] : null;
};

export async function createPostWithImage(postData: PostData, imageDataUri: string | null) {
    try {
        let imageUrl: string | null = null;
        if (imageDataUri) {
            const apiKey = process.env.IMGBB_API_KEY;
            if (!apiKey) {
                throw new Error("A chave da API do ImgBB não está configurada no servidor.");
            }

            // Remove the data URI prefix
            const base64Data = imageDataUri.split(',')[1];
            
            const form = new FormData();
            form.append('image', base64Data);

            const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, form, {
                headers: {
                    ...form.getHeaders(),
                },
            });

            if (response.data.success) {
                imageUrl = response.data.data.url;
            } else {
                throw new Error(response.data.error?.message || 'Falha ao fazer upload da imagem para o ImgBB.');
            }
        }

        const hashtags = extractHashtags(postData.content);
        const mentionedHandles = extractMentions(postData.content);
        const spotifyUrl = extractSpotifyUrl(postData.content);

        const finalPostData = {
            ...postData,
            image: imageUrl,
            hashtags,
            mentions: mentionedHandles,
            spotifyUrl,
            createdAt: serverTimestamp(),
            comments: 0,
            retweets: [],
            likes: [],
            views: 0,
            status: 'published',
        };
        
        await runTransaction(db, async (transaction) => {
            const postRef = doc(collection(db, "posts"));
            transaction.set(postRef, finalPostData);

            if (hashtags.length > 0) {
                for (const tag of hashtags) {
                    const hashtagRef = doc(db, 'hashtags', tag);
                    const hashtagDoc = await transaction.get(hashtagRef);
                    if (hashtagDoc.exists()) {
                        transaction.update(hashtagRef, { count: (hashtagDoc.data().count || 0) + 1 });
                    } else {
                        transaction.set(hashtagRef, { name: tag, count: 1 });
                    }
                }
            }
        });
        
        return { success: true };

    } catch (error: any) {
        console.error("Erro ao criar post no servidor: ", error);
        return { success: false, error: error.message || "Ocorreu um erro desconhecido." };
    }
}
