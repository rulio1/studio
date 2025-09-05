
'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc, onSnapshot, documentId, runTransaction } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bookmark, Frown, MoreHorizontal, Repeat, MessageCircle, Heart, BarChart2, Edit, Save, Trash2, Pin, Sparkles, Flag, Megaphone, UserRound, PenSquare, BadgeCheck, Bird } from 'lucide-react';
import PostSkeleton from '@/components/post-skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTimeAgo } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import Poll from '@/components/poll';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SpotifyEmbed from '@/components/spotify-embed';

const CreatePostModal = lazy(() => import('@/components/create-post-modal'));
const ImageViewer = lazy(() => import('@/components/image-viewer'));
const PostAnalyticsModal = lazy(() => import('@/components/post-analytics-modal'));

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
    communityId?: string | null;
    hashtags?: string[];
    repostedBy?: { name: string; handle: string };
    repostedAt?: any;
    isPinned?: boolean;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    isFirstPost?: boolean;
    isUpdate?: boolean;
    poll?: {
        options: string[];
        votes: number[];
        voters: Record<string, number>;
    } | null;
    quotedPostId?: string;
    quotedPost?: Omit<Post, 'quotedPost' | 'quotedPostId'>;
    spotifyUrl?: string;
}

interface Collection {
    id: string;
    name: string;
    postIds: string[];
}

interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    collections?: Collection[];
    pinnedPostId?: string;
    isVerified?: boolean;
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

const PostContent = ({ content, spotifyUrl }: { content: string, spotifyUrl?: string }) => {
    const router = useRouter();
    const parts = content.split(/(#\w+|@\w+|https?:\/\/[^\s]+)/g);
    return (
        <p>
            {parts.map((part, index) => {
                if (!part) return null;
                if (part.startsWith('#')) return <a key={index} className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); router.push(`/search?q=%23${part.substring(1)}`); }}>{part}</a>;
                if (part.startsWith('@')) return <a key={index} className="text-primary hover:underline" onClick={async (e) => { e.stopPropagation(); const usersRef = collection(db, "users"); const q = query(usersRef, where("handle", "==", part)); const querySnapshot = await getDocs(q); if (!querySnapshot.empty) router.push(`/profile/${querySnapshot.docs[0].id}`); }}>{part}</a>;
                if (part.includes('spotify.com')) return spotifyUrl ? null : <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{part}</a>;
                return part;
            })}
        </p>
    );
};

const QuotedPostPreview = ({ post }: { post: Omit<Post, 'quotedPost' | 'quotedPostId'> }) => {
    const router = useRouter();
    const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';
    return (
        <div className="mt-2 border rounded-xl p-3 cursor-pointer hover:bg-muted/50" onClick={(e) => {e.stopPropagation(); router.push(`/post/${post.id}`)}}>
            <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-5 w-5"><AvatarImage src={post.avatar} /><AvatarFallback>{post.avatarFallback || post.author[0]}</AvatarFallback></Avatar>
                <span className="font-bold flex items-center gap-1">{post.author} {(post.isVerified || post.handle === '@Rulio') && <BadgeCheck className={`h-4 w-4 ${badgeColor}`} />}</span>
                <span className="text-muted-foreground">{post.handle}</span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground line-clamp-3">{post.content}</p>
            {post.image && <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-lg"><Image src={post.image} layout="fill" objectFit="cover" alt="Quoted post image" /></div>}
        </div>
    );
};

export default function CollectionPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const collectionId = params.id as string;
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [collection, setCollection] = useState<Collection | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) setUser(currentUser);
            else router.push('/login');
        });
    }, [router]);

    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = { uid: doc.id, ...doc.data() } as ZisprUser;
                setZisprUser(userData);
                const targetCollection = userData.collections?.find(c => c.id === collectionId);
                setCollection(targetCollection || null);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [user, collectionId, router]);

    useEffect(() => {
        if (!user || !collection) {
            setIsLoading(false);
            return;
        }

        const fetchPosts = async () => {
            setIsLoading(true);
            const postIds = collection.postIds;
            if (postIds.length === 0) {
                setPosts([]);
                setIsLoading(false);
                return;
            }

            const chunks = [];
            for (let i = 0; i < postIds.length; i += 30) {
                chunks.push(postIds.slice(i, i + 30));
            }

            const postsData: Post[] = [];
            for (const chunk of chunks) {
                const q = query(collection(db, "posts"), where(documentId(), "in", chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    postsData.push({ 
                        id: doc.id, 
                        ...data,
                        isLiked: Array.isArray(data.likes) ? data.likes.includes(user.uid) : false,
                        isRetweeted: Array.isArray(data.retweets) ? data.retweets.includes(user.uid) : false,
                    } as Post);
                });
            }
            postsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setPosts(postsData);
            setIsLoading(false);
        };

        fetchPosts();
    }, [user, collection]);

    const PostItem = ({ post }: { post: Post }) => {
        const [time, setTime] = useState('');
        useEffect(() => {
            if (post.createdAt) setTime(formatTimeAgo(post.createdAt.toDate()));
        }, [post.createdAt]);
        
        const isVerified = post.isVerified || post.handle === '@Rulio';
        const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';

        return (
            <li className="p-4 hover:bg-muted/20" onClick={() => router.push(`/post/${post.id}`)}>
                <div className="flex gap-4">
                    <Avatar><AvatarImage src={post.avatar} /><AvatarFallback>{post.avatarFallback}</AvatarFallback></Avatar>
                    <div className="w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <p className="font-bold flex items-center gap-1">{post.author} {isVerified && <BadgeCheck className={`h-4 w-4 ${badgeColor}`} />}</p>
                                <p className="text-muted-foreground">{post.handle} · {time}</p>
                            </div>
                        </div>
                        <div className="mb-2 whitespace-pre-wrap"><PostContent content={post.content} spotifyUrl={post.spotifyUrl} /></div>
                        {post.quotedPost && <QuotedPostPreview post={post.quotedPost} />}
                        {post.spotifyUrl && <SpotifyEmbed url={post.spotifyUrl} />}
                        {post.image && <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-2xl border"><Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint={post.imageHint} /></div>}
                        {/* Actions can be added here */}
                    </div>
                </div>
            </li>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
                    <div>
                        <h1 className="text-xl font-bold">{collection?.name || 'Coleção'}</h1>
                        <p className="text-sm text-muted-foreground">{zisprUser?.handle}</p>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <ul className="divide-y divide-border">{[...Array(5)].map((_, i) => <li key={i} className="p-4"><PostSkeleton /></li>)}</ul>
                ) : posts.length === 0 ? (
                    <div className="text-center p-8 mt-16">
                        <Bookmark className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h2 className="mt-4 text-2xl font-bold">Nenhum post salvo aqui</h2>
                        <p className="mt-2 text-muted-foreground">Quando você salvar posts nesta coleção, eles aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">{posts.map((post) => <PostItem key={post.id} post={post} />)}</ul>
                )}
            </main>
        </div>
    );
}
