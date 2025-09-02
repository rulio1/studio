
'use server';

import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase'; // Reutilizando a instância do cliente
import { v4 as uuidv4 } from 'uuid';

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
    try {
        let imageUrl: string | null = null;
        if (imageDataUri) {
            const imageRef = storageRef(storage, `posts/${postData.authorId}/${uuidv4()}`);
            const snapshot = await uploadString(imageRef, imageDataUri, 'data_url');
            imageUrl = await getDownloadURL(snapshot.ref);
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
