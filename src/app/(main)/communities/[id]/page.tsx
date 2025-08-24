
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, writeBatch, arrayUnion, arrayRemove, increment, serverTimestamp, addDoc, runTransaction, limit, getDocs } from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MoreHorizontal, PenSquare, Repeat, Heart, MessageCircle, BarChart2, Bird, Trash2, Edit, Save, Sparkles, X, BadgeCheck, ImageIcon, Smile, Upload, MapPin, Star } from 'lucide-react';
import PostSkeleton from '@/components/post-skeleton';
import { formatTimeAgo } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import CreatePostModal from '@/components/create-post-modal';
import { Textarea } from '@/components/ui/textarea';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { generateImageFromPrompt } from '@/ai/flows/image-generator-flow';
import React from 'react';
import { fileToDataUri } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import ImageViewer from '@/components/image-viewer';

interface Community {
    id: string;
    name: string;
    topic: string;
    memberCount: number;
    image: string;
    imageHint: string;
    avatar?: string;
    avatarHint?: string;
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
    location?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    isLiked: boolean;
    isRetweeted: boolean;
    createdAt: any;
    editedAt?: any;
    hashtags?: string[];
    isVerified?: boolean;
    isFirstPost?: boolean;
    quotedPostId?: string;
    quotedPost?: Omit<Post, 'quotedPost' | 'quotedPostId'>;
}

interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    communities?: string[];
    savedPosts?: string[];
    isVerified?: boolean;
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

const QuotedPostPreview = ({ post }: { post: Omit<Post, 'quotedPost' | 'quotedPostId'> }) => {
    const router = useRouter();
    return (
        <div className="mt-2 border rounded-xl p-3 cursor-pointer hover:bg-muted/50" onClick={(e) => {e.stopPropagation(); router.push(`/post/${post.id}`)}}>
            <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-5 w-5">
                    <AvatarImage src={post.avatar} />
                    <AvatarFallback>{post.author[0]}</AvatarFallback>
                </Avatar>
                <span className="font-bold">{post.author}</span>
                <span className="text-muted-foreground">{post.handle}</span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground line-clamp-3">{post.content}</p>
            {post.image && (
                <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-lg">
                    <Image src={post.image} layout="fill" objectFit="cover" alt="Quoted post image" />
                </div>
            )}
        </div>
    );
};

const PostItem = ({ post, onQuote, onImageClick }: { post: Post, onQuote: (post: Post) => void, onImageClick: (post: Post) => void }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    
    useEffect(() => {
        if (post.createdAt) {
          try {
            setTime(formatTimeAgo(post.createdAt.toDate()));
          } catch(e) {
            setTime('agora')
          }
        }
    }, [post.createdAt]);
    
    const isZisprAccount = post.handle === '@Zispr';
    const isVerified = post.isVerified || post.handle === '@rulio' || isZisprAccount;

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
             {post.isFirstPost && (
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-12">
                    <Star className="h-4 w-4" />
                    <span>Primeiro post</span>
                </div>
            )}
            <div className="flex gap-4">
                 <Avatar className="cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                    {isZisprAccount ? (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 rounded-full">
                            <Bird className="h-5 w-5 text-primary" />
                        </div>
                    ) : (
                        <>
                            <AvatarImage src={post.avatar} alt={post.handle} />
                            <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                        </>
                    )}
                </Avatar>
                <div className='w-full'>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <p className="font-bold text-base flex items-center gap-1">
                                {post.author} 
                                {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                            </p>
                            <p className="text-muted-foreground">{post.handle} · {time}</p>
                        </div>
                    </div>
                    <div className="mb-2 whitespace-pre-wrap">
                        <PostContent content={post.content} />
                    </div>
                     {post.quotedPost && <QuotedPostPreview post={post.quotedPost} />}
                    {post.image && (
                        <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-2xl border cursor-pointer" onClick={(e) => { e.stopPropagation(); onImageClick(post); }}>
                            <Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint={post.imageHint} />
                        </div>
                    )}
                     <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`)}} className="flex items-center gap-1 hover:text-primary transition-colors">
                            <MessageCircle className="h-5 w-5" />
                            <span>{post.comments}</span>
                        </button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button onClick={(e) => e.stopPropagation()} className={`flex items-center gap-1 hover:text-green-500 transition-colors`}>
                                    <Repeat className="h-5 w-5" />
                                    <span>{post.retweets.length}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                <div className="grid gap-2">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        // Add retweet logic here in the future
                                    >
                                        <Repeat className="mr-2 h-4 w-4" />
                                        Repostar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={(e) => { e.stopPropagation(); onQuote(post); }}
                                    >
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        Quotar Post
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <button className={`flex items-center gap-1`}>
                            <Heart className={`h-5 w-5 hover:text-red-500 transition-colors`} />
                            <span>{post.likes.length}</span>
                        </button>
                        <div className="flex items-center gap-1">
                            <BarChart2 className="h-5 w-5" />
                            <span>{post.views}</span>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};


export default function CommunityDetailPage() {
    const router = useRouter();
    const params = useParams();
    const communityId = params.id as string;
    const { toast } = useToast();

    const [community, setCommunity] = useState<Community | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [postToView, setPostToView] = useState<Post | null>(null);
    
    // Post creation modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [postToQuote, setPostToQuote] = useState<Post | null>(null);
    const [isPosting, setIsPosting] = useState(false);


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
            setZisprUser(null);
            return;
        }
        const userDocRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
                const userData = { uid: userDoc.id, ...userDoc.data() } as ZisprUser;
                setZisprUser(userData);
                setIsMember(userData.communities?.includes(communityId) ?? false);
            }
        });
        return () => unsubUser();
    }, [user, communityId]);

    const fetchCommunityData = useCallback((currentCommunityId: string) => {
        setIsLoading(true);
        const communityDocRef = doc(db, 'communities', currentCommunityId);
        const unsubscribe = onSnapshot(communityDocRef, (doc) => {
            if (doc.exists()) {
                setCommunity({ id: doc.id, ...doc.data() } as Community);
            } else {
                toast({ title: "Comunidade não encontrada", variant: "destructive" });
                router.push('/communities');
            }
            setIsLoading(false);
        });
        return unsubscribe;
    }, [router, toast]);

    const fetchCommunityPosts = useCallback((currentCommunityId: string, currentUser: FirebaseUser) => {
        setIsLoadingPosts(true);
        const q = query(collection(db, "posts"), where("communityId", "==", currentCommunityId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: '', // Will be set in PostItem component
                    isLiked: (Array.isArray(data.likes) ? data.likes : []).includes(currentUser.uid),
                    isRetweeted: (Array.isArray(data.retweets) ? data.retweets : []).includes(currentUser.uid),
                } as Post;
            });
            postsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setPosts(postsData);
            setIsLoadingPosts(false);
        }, (error) => {
            console.error("Error fetching community posts:", error);
            setIsLoadingPosts(false);
        });
        return unsubscribe;
    }, []);
    
    useEffect(() => {
        if (!user || !communityId) {
            setIsLoading(false);
            setIsLoadingPosts(false);
            return;
        }
        const unsubCommunity = fetchCommunityData(communityId as string);
        const unsubPosts = fetchCommunityPosts(communityId as string, user);
        return () => {
             unsubCommunity();
             unsubPosts();
        };
    }, [user, communityId, fetchCommunityData, fetchCommunityPosts]);

    const handleJoinLeaveCommunity = async () => {
        if (!user) return;

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const communityRef = doc(db, 'communities', communityId);

        if (isMember) {
            batch.update(userRef, { communities: arrayRemove(communityId) });
            batch.update(communityRef, { memberCount: increment(-1) });
        } else {
            batch.update(userRef, { communities: arrayUnion(communityId) });
            batch.update(communityRef, { memberCount: increment(1) });
        }
        await batch.commit();
    };

    const handleQuoteClick = (postToQuote: Post) => {
        setPostToQuote(postToQuote);
        setIsModalOpen(true);
    };

    const handleOpenCreatePost = () => {
        setPostToQuote(null);
        setIsModalOpen(true);
    }
    
    if (isLoading || !community) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col h-screen bg-background relative">
             <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex items-center gap-4 px-4 py-2 border-b">
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{community.name}</h1>
                    <p className="text-sm text-muted-foreground">{community.memberCount.toLocaleString()} membros</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-20">
                <div className="relative h-48 bg-muted">
                    <Image src={community.image} alt={community.name} layout="fill" objectFit="cover" data-ai-hint={community.imageHint} />
                </div>
                 <div className="p-4">
                    <div className="flex justify-between items-start">
                        <div className="-mt-16">
                            <Avatar className="h-24 w-24 border-4 border-background">
                                <AvatarImage src={community.avatar} data-ai-hint={community.avatarHint} alt={community.name} />
                                <AvatarFallback className="text-2xl">{community.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <Button variant={isMember ? 'secondary' : 'default'} className="rounded-full font-bold" onClick={handleJoinLeaveCommunity}>
                            {isMember ? 'Membro' : 'Entrar'}
                        </Button>
                    </div>
                    <div className="mt-4">
                        <h1 className="text-2xl font-bold">{community.name}</h1>
                        <p className="text-muted-foreground">{community.topic}</p>
                    </div>
                </div>

                 <div className="border-t p-4">
                    <Button className="w-full" variant="outline" onClick={handleOpenCreatePost}>Postar na Comunidade</Button>
                </div>

                <div className="border-t">
                    {isLoadingPosts ? (
                         <ul className="divide-y divide-border">
                            {[...Array(3)].map((_, i) => <li key={i} className="p-4"><PostSkeleton /></li>)}
                        </ul>
                    ) : posts.length === 0 ? (
                        <div className="text-center p-8">
                            <h3 className="text-xl font-bold">Esta comunidade está quieta...</h3>
                            <p className="text-muted-foreground mt-2">Seja o primeiro a postar e inicie a conversa!</p>
                        </div>
                    ) : (
                         <ul className="divide-y divide-border">
                            {posts.map((post) => (
                                <PostItem key={post.id} post={post} onQuote={handleQuoteClick} onImageClick={setPostToView} />
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            {isMember && (
                <CreatePostModal 
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    quotedPost={postToQuote}
                />
            )}
             <ImageViewer post={postToView} onOpenChange={() => setPostToView(null)} />
        </div>
    );
}
