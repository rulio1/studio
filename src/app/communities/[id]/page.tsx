
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove, writeBatch, increment, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MessageCircle, Repeat, Heart, MoreHorizontal, Users } from 'lucide-react';
import PostSkeleton from '@/components/post-skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Community {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    image: string;
    imageHint: string;
    avatar?: string;
    avatarHint?: string;
    isJoined?: boolean;
}

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
    createdAt?: any;
}


export default function CommunityDetailPage() {
    const router = useRouter();
    const params = useParams();
    const communityId = params.id as string;

    const [community, setCommunity] = useState<Community | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!communityId) return;

        const communityRef = doc(db, 'communities', communityId);
        const unsubscribeCommunity = onSnapshot(communityRef, (doc) => {
            if (doc.exists()) {
                const communityData = { id: doc.id, ...doc.data() } as Community;
                setCommunity(communityData);
            } else {
                // Handle community not found
                router.push('/communities');
            }
            setIsLoading(false);
        });

        return () => unsubscribeCommunity();
    }, [communityId, router]);

    useEffect(() => {
        if (!user || !community) return;
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const userCommunities = doc.data().communities || [];
                setIsFollowing(userCommunities.includes(community.id));
            }
        });
        return () => unsubscribeUser();
    }, [user, community]);
    
    useEffect(() => {
        if (!communityId) return;

        setIsLoadingPosts(true);
        const postsQuery = query(collection(db, 'posts'), where('communityId', '==', communityId));
        const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
            const postsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo',
                    isLiked: data.likes.includes(user?.uid || ''),
                    isRetweeted: data.retweets.includes(user?.uid || ''),
                } as Post;
            });
            // Sort client-side to avoid composite index
            postsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setPosts(postsData);
            setIsLoadingPosts(false);
        });

        return () => unsubscribePosts();
    }, [communityId, user]);


     const handleJoinLeaveCommunity = async () => {
        if (!user || !community) return;

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const communityRef = doc(db, 'communities', community.id);

        if (isFollowing) {
            batch.update(userRef, { communities: arrayRemove(community.id) });
            batch.update(communityRef, { memberCount: increment(-1) });
        } else {
            batch.update(userRef, { communities: arrayUnion(community.id) });
            batch.update(communityRef, { memberCount: increment(1) });
        }

        await batch.commit();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!community) {
        return <div>Comunidade não encontrada.</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-background">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm flex items-center gap-4 px-4 py-2 border-b">
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{community.name}</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                 <div className="relative h-48 bg-muted">
                    <Image
                        src={community.image}
                        alt={community.name}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint={community.imageHint}
                    />
                </div>
                <div className="p-4">
                     <div className="flex justify-between items-start">
                        <div className="-mt-20">
                             <Avatar className="h-32 w-32 border-4 border-background rounded-lg">
                                {community.avatar && <AvatarImage src={community.avatar} data-ai-hint={community.avatarHint} alt={community.name} />}
                                <AvatarFallback className="text-4xl rounded-lg">{community.name[0]}</AvatarFallback>
                            </Avatar>
                        </div>
                        <Button variant={isFollowing ? 'secondary' : 'default'} className="rounded-full mt-4 font-bold" onClick={handleJoinLeaveCommunity}>
                            {isFollowing ? 'Membro' : 'Entrar'}
                        </Button>
                    </div>
                    <div className="mt-4">
                        <h1 className="text-2xl font-bold">{community.name}</h1>
                        <p className="text-muted-foreground mt-2">{community.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{community.memberCount.toLocaleString()} membros</span>
                        </div>
                    </div>
                </div>

                <div className="border-t">
                    <h2 className="text-xl font-bold p-4">Posts na Comunidade</h2>
                    {isLoadingPosts ? (
                         <ul className="divide-y divide-border">
                            {[...Array(3)].map((_, i) => <li key={i} className="p-4"><PostSkeleton /></li>)}
                        </ul>
                    ) : posts.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            <h3 className="text-xl font-bold text-foreground">Nenhum post ainda</h3>
                            <p>Seja o primeiro a postar nesta comunidade!</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                             {posts.map((post) => (
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
                                            <div className="mt-4 flex justify-around text-muted-foreground pr-4">
                                                <div className="flex items-center gap-1"><MessageCircle className="h-5 w-5" /><span>{post.comments}</span></div>
                                                <div className="flex items-center gap-1"><Repeat className="h-5 w-5" /><span>{post.retweets.length}</span></div>
                                                <div className="flex items-center gap-1"><Heart className="h-5 w-5" /><span>{post.likes.length}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>
        </div>
    );
}
