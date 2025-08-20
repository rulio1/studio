'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc, onSnapshot, documentId } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bookmark, MessageCircle, Repeat, Heart, BarChart2, Upload, MoreHorizontal, Save, Trash2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatTimeAgo } from '@/lib/utils';
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
    location?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    isLiked: boolean;
    isRetweeted: boolean;
    createdAt: any;
    editedAt?: any;
}

interface ChirpUser {
    savedPosts?: string[];
    handle?: string;
}

const PostContent = ({ content }: { content: string }) => {
    const router = useRouter();
    const parts = content.split(/(#\w+)/g);
    return (
        <p>
            {parts.map((part, index) => {
                if (part.startsWith('#')) {
                    const hashtag = part.substring(1);
                    return (
                        <a 
                            key={index} 
                            className="text-primary hover:underline"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/search?q=%23${hashtag}`);
                            }}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </p>
    );
};

const SavedPostItem = ({ post }: { post: Post }) => {
    const router = useRouter();
    const [time, setTime] = useState('');

    useEffect(() => {
        if (post.createdAt) {
            setTime(formatTimeAgo(post.createdAt.toDate()));
        }
    }, [post.createdAt]);
    
    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
            <div className="flex gap-4">
                <Avatar className="cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                    <AvatarImage src={post.avatar} alt={post.handle} />
                    <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                </Avatar>
                <div className='w-full'>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <p className="font-bold text-base">{post.author}</p>
                            <p className="text-muted-foreground">{post.handle} · {time}</p>
                            {post.editedAt && <p className="text-xs text-muted-foreground">(editado)</p>}
                        </div>
                    </div>
                    <div className="mb-2 whitespace-pre-wrap">
                        <PostContent content={post.content} />
                        {post.image && <Image src={post.image} data-ai-hint={post.imageHint} width={500} height={300} alt="Imagem do post" className="mt-2 rounded-2xl border" />}
                    </div>
                </div>
            </div>
        </li>
    );
};

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
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user) {
            setChirpUser(null);
            return;
        }
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setChirpUser(doc.data() as ChirpUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribeUser();
    }, [user, router]);


    useEffect(() => {
        if (!user || !chirpUser?.savedPosts || chirpUser.savedPosts.length === 0) {
            setSavedPosts([]);
            setIsLoading(false);
            return () => {};
        }

        setIsLoading(true);
        const savedPostIds = chirpUser.savedPosts;
        
        // Firestore 'in' query supports up to 30 elements. Chunking is necessary.
        const chunks = [];
        for (let i = 0; i < savedPostIds.length; i += 30) {
            chunks.push(savedPostIds.slice(i, i + 30));
        }

        const unsubscribes = chunks.map(chunk => {
             const q = query(collection(db, "posts"), where(documentId(), 'in', chunk));
             return onSnapshot(q, (snapshot) => {
                const postsData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        time: '', // will be set in SavedPostItem
                        isLiked: (Array.isArray(data.likes) ? data.likes : []).includes(user.uid),
                        isRetweeted: (Array.isArray(data.retweets) ? data.retweets : []).includes(user.uid),
                    } as Post;
                });

                // This logic needs to be improved to handle updates from multiple listeners
                // For simplicity here, we'll merge new data with existing data
                setSavedPosts(prevPosts => {
                    const postMap = new Map(prevPosts.map(p => [p.id, p]));
                    postsData.forEach(p => postMap.set(p.id, p));
                    const allPosts = Array.from(postMap.values());
                    allPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                    return allPosts.filter(p => savedPostIds.includes(p.id));
                });
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching saved posts chunk:", error);
                setIsLoading(false);
            });
        });
        
        return () => unsubscribes.forEach(unsub => unsub());

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
                        <p className="text-sm text-muted-foreground">{chirpUser?.handle}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <ul className="divide-y divide-border">
                        {[...Array(5)].map((_, i) => <li key={i} className="p-4"><PostSkeleton /></li>)}
                    </ul>
                ) : savedPosts.length === 0 ? (
                    <div className="text-center p-8 mt-16">
                        <Bookmark className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h2 className="text-2xl font-bold mt-4">Você não tem posts salvos</h2>
                        <p className="text-muted-foreground mt-2">Clique no ícone de marcador em um post para salvá-lo aqui.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {savedPosts.map((post) => (
                           <SavedPostItem key={post.id} post={post} />
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
