
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MessageCircle, Repeat, Heart, BarChart2, Upload, MoreHorizontal, Save, Trash2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import PostSkeleton from '@/components/post-skeleton';

interface Post {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    content: string;
    image?: string;
    imageHint?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    isLiked: boolean;
    isRetweeted: boolean;
    editedAt?: any;
}

interface ChirpUser {
    savedPosts?: string[];
}

export default function SavedPage() {
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setChirpUser(userDoc.data() as ChirpUser);
                } else {
                     router.push('/login');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        const fetchSavedPosts = async () => {
            if (!user || !chirpUser?.savedPosts || chirpUser.savedPosts.length === 0) {
                setSavedPosts([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Firestore 'in' query is limited to 10 elements. If more, we need to chunk it.
                // For simplicity here, we'll fetch them one by one, but for production, chunking is better.
                const postPromises = chirpUser.savedPosts.map(postId => getDoc(doc(db, 'posts', postId)));
                const postDocs = await Promise.all(postPromises);
                
                const postsData = postDocs
                    .filter(doc => doc.exists())
                    .map(doc => {
                        const data = doc.data() as Omit<Post, 'id' | 'isLiked' | 'isRetweeted' | 'time'>;
                        return {
                            id: doc.id,
                            ...data,
                            time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo',
                            isLiked: data.likes.includes(user.uid),
                            isRetweeted: data.retweets.includes(user.uid),
                        } as Post;
                    });
                
                // Sort by creation date descending
                postsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

                setSavedPosts(postsData);
            } catch (error) {
                console.error("Erro ao buscar posts salvos:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSavedPosts();
    }, [user, chirpUser]);


    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">Itens Salvos</h1>
                        <p className="text-sm text-muted-foreground">{user?.displayName}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <ul className="divide-y divide-border">
                        {[...Array(5)].map((_, i) => <li key={i} className="p-4"><PostSkeleton /></li>)}
                    </ul>
                ) : savedPosts.length === 0 ? (
                    <div className="text-center p-8">
                        <h2 className="text-2xl font-bold">Você não tem posts salvos</h2>
                        <p className="text-muted-foreground mt-2">Salve posts para vê-los aqui mais tarde.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {savedPosts.map((post) => (
                           <li key={post.id} className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                                <div className="flex gap-4">
                                    <Avatar className="cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                                        <AvatarImage src={post.avatar} alt={post.handle} />
                                        <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                                    </Avatar>
                                    <div className='w-full'>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm">
                                                <p className="font-bold text-base">{post.author}</p>
                                                <p className="text-muted-foreground">{post.handle} · {post.time}</p>
                                                {post.editedAt && <p className="text-xs text-muted-foreground">(editado)</p>}
                                            </div>
                                        </div>
                                        <p className="mb-2 whitespace-pre-wrap">{post.content}</p>
                                        {post.image && <Image src={post.image} data-ai-hint={post.imageHint} width={500} height={300} alt="Imagem do post" className="rounded-2xl border" />}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}

