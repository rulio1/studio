
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, writeBatch, arrayUnion, arrayRemove, increment, serverTimestamp, addDoc } from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MoreHorizontal, PenSquare, Repeat, Heart, MessageCircle, BarChart2, Bird, Trash2, Edit, Save, Sparkles, X, BadgeCheck } from 'lucide-react';
import PostSkeleton from '@/components/post-skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { generatePost } from '@/ai/flows/post-generator-flow';
import React from 'react';

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
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    communities?: string[];
    savedPosts?: string[];
}


const PostItem = ({ post }: { post: Post }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    
    useEffect(() => {
        if (post.createdAt) {
          try {
            setTime(formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ptBR }));
          } catch(e) {
            setTime('agora')
          }
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
                            <p className="font-bold text-base flex items-center gap-1">{post.author} {post.handle.toLowerCase() === '@rulio' && <BadgeCheck className="h-4 w-4 text-primary" />}</p>
                            <p className="text-muted-foreground">{post.handle} · {time}</p>
                        </div>
                    </div>
                    <div className="mb-2 whitespace-pre-wrap">
                        <p>{post.content}</p>
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
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    const [isMember, setIsMember] = useState(false);
    
    // Post creation modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // AI Generators State
    const [showAiTextGenerator, setShowAiTextGenerator] = useState(false);
    const [aiTextPrompt, setAiTextPrompt] = useState('');
    const [isGeneratingText, setIsGeneratingText] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubUser = onSnapshot(userDocRef, (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = { uid: userDoc.id, ...userDoc.data() } as ChirpUser;
                        setChirpUser(userData);
                        setIsMember(userData.communities?.includes(communityId) ?? false);
                    }
                });
                return () => unsubUser();
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router, communityId]);

    const fetchCommunityData = useCallback(async () => {
        setIsLoading(true);
        const communityDocRef = doc(db, 'communities', communityId);
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
    }, [communityId, router, toast]);

    const fetchCommunityPosts = useCallback(async () => {
        setIsLoadingPosts(true);
        const q = query(collection(db, "posts"), where("communityId", "==", communityId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: '', // Will be set in PostItem component
                    isLiked: data.likes.includes(auth.currentUser?.uid || ''),
                    isRetweeted: data.retweets.includes(auth.currentUser?.uid || ''),
                } as Post;
            });
            postsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setPosts(postsData);
            setIsLoadingPosts(false);
        });
        return unsubscribe;
    }, [communityId]);
    
    useEffect(() => {
        const unsubCommunity = fetchCommunityData();
        const unsubPosts = fetchCommunityPosts();
        return () => {
             unsubCommunity.then(u => u());
             unsubPosts.then(u => u());
        };
    }, [fetchCommunityData, fetchCommunityPosts]);

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

    const resetModal = () => {
        setNewPostContent('');
        setAiTextPrompt('');
        setIsGeneratingText(false);
        setShowAiTextGenerator(false);
        setIsModalOpen(false);
    }

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) {
             toast({
                title: "O post não pode estar vazio.",
                description: "Por favor, escreva algo antes de postar.",
                variant: "destructive",
            });
            return;
        }
        if (!user || !chirpUser) return;
        setIsPosting(true);

        try {
            await addDoc(collection(db, "posts"), {
                authorId: user.uid,
                author: chirpUser.displayName,
                handle: chirpUser.handle,
                avatar: chirpUser.avatar,
                avatarFallback: chirpUser.displayName[0],
                content: newPostContent,
                image: '',
                imageHint: '',
                communityId: communityId,
                createdAt: serverTimestamp(),
                comments: 0,
                retweets: [],
                likes: [],
                views: 0,
            });

            resetModal();
            toast({ title: "Post criado na comunidade!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao criar o post", variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };

    const handleGenerateText = async () => {
        if (!aiTextPrompt.trim()) return;
        setIsGeneratingText(true);
        try {
            const generatedContent = await generatePost(aiTextPrompt);
            setNewPostContent(generatedContent);
            toast({ title: "Conteúdo do post gerado!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao gerar o post", variant: "destructive" });
        } finally {
            setIsGeneratingText(false);
        }
    };
    
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
                                <PostItem key={post.id} post={post} />
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            {isMember && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                         <Button className="fixed bottom-20 right-4 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50">
                            <PenSquare className="h-6 w-6" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Postar na comunidade {community.name}</DialogTitle>
                        </DialogHeader>
                         {chirpUser ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <Avatar>
                                        <AvatarImage src={chirpUser.avatar} alt={chirpUser.handle} />
                                        <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="w-full">
                                        <Textarea
                                            placeholder="O que está acontecendo?"
                                            value={newPostContent}
                                            onChange={(e) => setNewPostContent(e.target.value)}
                                            rows={5}
                                        />
                                    </div>
                                </div>

                                 {showAiTextGenerator && (
                                    <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
                                        <Textarea 
                                            placeholder="ex: Um post sobre o futuro da exploração espacial"
                                            className="text-sm focus-visible:ring-1 bg-background"
                                            value={aiTextPrompt}
                                            onChange={(e) => setAiTextPrompt(e.target.value)}
                                            rows={2}
                                        />
                                        <Button onClick={handleGenerateText} disabled={isGeneratingText || !aiTextPrompt.trim()} className="self-end" size="sm">
                                            {isGeneratingText && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Gerar Texto
                                        </Button>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-2 border-t pt-4">
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => {setShowAiTextGenerator(!showAiTextGenerator);}} disabled={isPosting}>
                                            <Sparkles className="h-6 w-6 text-primary" />
                                        </Button>
                                    </div>
                                    <Button onClick={handleCreatePost} disabled={!newPostContent.trim() || isPosting}>
                                        {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Postar
                                    </Button>
                                </div>
                            </div>
                         ) : <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
