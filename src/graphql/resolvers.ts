
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, ZisprUser } from '@/types/zispr';

const fetchQuotedPost = async (quotedPostId: string) => {
    if (!quotedPostId) return null;
    const postDoc = await getDoc(doc(db, 'posts', quotedPostId));
    if (!postDoc.exists()) return null;
    const postData = postDoc.data();
    return {
        id: postDoc.id,
        ...postData,
        createdAt: postData.createdAt?.toDate().toISOString(),
    };
};

export const resolvers = {
    Query: {
        posts: async (_: any, { limit: queryLimit = 10 }) => {
            try {
                const postsRef = collection(db, 'posts');
                const q = query(postsRef, orderBy('createdAt', 'desc'), limit(queryLimit));
                const querySnapshot = await getDocs(q);

                const posts = await Promise.all(querySnapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const quotedPost = await fetchQuotedPost(data.quotedPostId);
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate().toISOString(),
                        editedAt: data.editedAt?.toDate().toISOString() || null,
                        quotedPost,
                    };
                }));

                return posts;
            } catch (error) {
                console.error("Error fetching posts:", error);
                throw new Error("Failed to fetch posts");
            }
        },
        user: async (_: any, { id }: { id: string }) => {
            try {
                if (!id) return null;
                const userDoc = await getDoc(doc(db, 'users', id));
                if (!userDoc.exists()) return null;

                const userData = userDoc.data() as ZisprUser;

                return {
                    ...userData,
                    createdAt: userData.createdAt?.toDate().toISOString(),
                    birthDate: userData.birthDate?.toDate().toISOString(),
                };
            } catch (error) {
                console.error(`Error fetching user ${id}:`, error);
                throw new Error("Failed to fetch user");
            }
        },
        userPosts: async (_: any, { userId }: { userId: string }) => {
            try {
                const postsQuery = query(collection(db, "posts"), where("authorId", "==", userId), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(postsQuery);
                const posts = await Promise.all(querySnapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const quotedPost = await fetchQuotedPost(data.quotedPostId);
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate().toISOString(),
                        editedAt: data.editedAt?.toDate().toISOString() || null,
                        quotedPost,
                    };
                }));
                return posts;
            } catch (error) {
                console.error(`Error fetching posts for user ${userId}:`, error);
                throw new Error("Failed to fetch user posts");
            }
        },
    },
    Post: {
        author: async (post: Post) => {
            if (!post.authorId) return null;
            const userDoc = await getDoc(doc(db, 'users', post.authorId));
            return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
        }
    }
};
