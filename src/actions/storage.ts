
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
    if (admin.apps.length === 0) {
        try {
            const serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            };
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error', error);
            return { success: false, error: 'Falha na inicialização do servidor.' };
        }
    }
    
    const db = admin.firestore();

    try {
        let imageUrl: string | null = null;
        if (imageDataUri) {
            const apiKey = process.env.IMGBB_API_KEY;
            if (!apiKey) {
                throw new Error("A chave da API do ImgBB não está configurada no servidor.");
            }

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
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            comments: 0,
            retweets: [],
            likes: [],
            views: 0,
            status: 'published',
        };
        
        await db.runTransaction(async (transaction) => {
            const postRef = db.collection("posts").doc();
            transaction.set(postRef, finalPostData);

            if (hashtags.length > 0) {
                for (const tag of hashtags) {
                    const hashtagRef = db.collection('hashtags').doc(tag);
                    const hashtagDoc = await transaction.get(hashtagRef);
                    if (hashtagDoc.exists) {
                        transaction.update(hashtagRef, { count: admin.firestore.FieldValue.increment(1) });
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
