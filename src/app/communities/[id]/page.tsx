
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
import { Textarea } from '@/components/ui/textarea';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { generateImageFromPrompt } from '@/ai/flows/image-generator-flow';
import React from 'react';
import { fileToDataUri } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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
}

interface ChirpUser {
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

const PostItem = ({ post }: { post: Post }) => {
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
    
    const isVerified = post.isVerified || post.handle === '@rulio' || post.handle === '@chirp';
    const isChirpAccount = post.handle === '@chirp';

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
                    {isChirpAccount ? (
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
                                {isChirpAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                            </p>
                            <p className="text-muted-foreground">{post.handle} · {time}</p>
                        </div>
                    </div>
                    <div className="mb-2 whitespace-pre-wrap">
                        <PostContent content={post.content} />
                    </div>
                    {post.image && (
                        <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-2xl border">
                            <Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint={post.imageHint} />
                        </div>
                    )}
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
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postImageDataUri, setPostImageDataUri] = useState<string | null>(null);
    const [location, setLocation] = useState('');
    const [showLocationInput, setShowLocationInput] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // AI Generators State
    const [showAiTextGenerator, setShowAiTextGenerator] = useState(false);
    const [aiTextPrompt, setAiTextPrompt] = useState('');
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [showAiImageGenerator, setShowAiImageGenerator] = useState(false);
    const [aiImagePrompt, setAiImagePrompt] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);


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
        setLocation('');
        setShowLocationInput(false);
        setIsGeneratingText(false);
        setShowAiTextGenerator(false);
        setAiImagePrompt('');
        setIsGeneratingImage(false);
        setShowAiImageGenerator(false);
        setPostImageDataUri(null);
        setPostImagePreview(null);
        setIsModalOpen(false);
    }
    
    const extractHashtags = (content: string) => {
        const regex = /#([a-zA-Z0-9_]+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        // Return unique hashtags in lowercase
        return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit for Data URI
            toast({
                title: 'Imagem muito grande',
                description: 'Por favor, selecione uma imagem menor que 2MB.',
                variant: 'destructive',
            });
            return;
        }

        const dataUri = await fileToDataUri(file);
        setPostImagePreview(URL.createObjectURL(file));
        setPostImageDataUri(dataUri);
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !postImageDataUri) {
             toast({
                title: "O post não pode estar vazio.",
                description: "Por favor, escreva algo ou adicione uma imagem.",
                variant: "destructive",
            });
            return;
        }
        if (!user || !chirpUser) return;
        setIsPosting(true);
        
        try {
            // Check if it's the user's first post outside the transaction
            const userPostsQuery = query(collection(db, 'posts'), where('authorId', '==', user.uid), limit(1));
            const userPostsSnapshot = await getDocs(userPostsQuery);
            const isFirstPost = userPostsSnapshot.empty;
            const hashtags = extractHashtags(newPostContent);

            await runTransaction(db, async (transaction) => {
                const postRef = doc(collection(db, "posts"));

                // 1. Perform all reads for hashtags
                const hashtagRefs = hashtags.map(tag => doc(db, "hashtags", tag));
                const hashtagDocs = await Promise.all(hashtagRefs.map(ref => transaction.get(ref)));

                // 2. Perform all writes
                // Create the new post
                transaction.set(postRef, {
                    authorId: user.uid,
                    author: chirpUser.displayName,
                    handle: chirpUser.handle,
                    avatar: chirpUser.avatar,
                    avatarFallback: chirpUser.displayName[0],
                    content: newPostContent,
                    location: location,
                    hashtags: hashtags,
                    image: postImageDataUri || '',
                    imageHint: '',
                    communityId: communityId,
                    createdAt: serverTimestamp(),
                    comments: 0,
                    retweets: [],
                    likes: [],
                    views: 0,
                    isVerified: chirpUser.isVerified || false,
                    isFirstPost: isFirstPost,
                });

                // Update hashtag counts
                 hashtagDocs.forEach((hashtagDoc, index) => {
                    const tag = hashtags[index];
                    const hashtagRef = hashtagRefs[index];
                    if (hashtagDoc.exists()) {
                        transaction.update(hashtagRef, { count: increment(1) });
                    } else {
                        transaction.set(hashtagRef, {
                            name: tag,
                            count: 1,
                            createdAt: serverTimestamp()
                        });
                    }
                });

                // Handle First Post Notification
                if (isFirstPost) {
                    const chirpOfficialUserQuery = query(collection(db, 'users'), where('handle', '==', '@chirp'), limit(1));
                    const chirpUserSnapshot = await getDocs(chirpOfficialUserQuery);

                    if (!chirpUserSnapshot.empty) {
                        const chirpUserData = chirpUserSnapshot.docs[0].data();
                        const notificationRef = doc(collection(db, 'notifications'));
                        transaction.set(notificationRef, {
                            toUserId: user.uid,
                            fromUserId: chirpUserSnapshot.docs[0].id,
                            fromUser: {
                                name: chirpUserData.displayName,
                                handle: chirpUserData.handle,
                                avatar: chirpUserData.avatar,
                                isVerified: true,
                            },
                            type: 'post',
                            text: 'Bem-vindo ao Chirp! Adoramos seu primeiro post.',
                            postContent: newPostContent.substring(0, 50),
                            postId: postRef.id,
                            createdAt: serverTimestamp(),
                            read: false,
                        });
                    }
                }
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

    const handleGenerateImage = async () => {
        if (!aiImagePrompt.trim()) return;
        setIsGeneratingImage(true);
        try {
            const generatedDataUri = await generateImageFromPrompt(aiImagePrompt);
            setPostImageDataUri(generatedDataUri);
            setPostImagePreview(generatedDataUri);
            toast({ title: "Imagem gerada com sucesso!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao gerar a imagem", variant: "destructive" });
        } finally {
            setIsGeneratingImage(false);
        }
    };
    
    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewPostContent(prev => prev + emojiData.emoji);
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
                         <div />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl bg-background/80 backdrop-blur-lg border rounded-2xl">
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
                                         {postImagePreview && (
                                            <div className="mt-4 relative">
                                                <Image src={postImagePreview} alt="Prévia da imagem" width={500} height={300} className="rounded-lg object-cover w-full" />
                                                <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => { setPostImagePreview(null); setPostImageDataUri(null); }}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {showLocationInput && (
                                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        <Input 
                                            placeholder="Adicionar localização"
                                            className="bg-transparent border-b-2 border-primary focus-visible:ring-0 rounded-none"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                        />
                                    </div>
                                )}
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
                                 {showAiImageGenerator && (
                                    <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
                                        <Textarea 
                                            placeholder="Descreva a imagem que você quer criar..."
                                            className="text-sm focus-visible:ring-1 bg-background"
                                            value={aiImagePrompt}
                                            onChange={(e) => setAiImagePrompt(e.target.value)}
                                            rows={2}
                                        />
                                        <Button onClick={handleGenerateImage} disabled={isGeneratingImage || !aiImagePrompt.trim()} className="self-end" size="sm">
                                            {isGeneratingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Gerar Imagem
                                        </Button>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-2 border-t pt-4">
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="file"
                                            className="hidden"
                                            ref={imageInputRef}
                                            accept="image/png, image/jpeg, image/gif"
                                            onChange={handleImageChange}
                                        />
                                         <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                                            <Upload className="h-6 w-6 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setShowAiImageGenerator(!showAiImageGenerator)} disabled={isPosting}>
                                            <ImageIcon className="h-6 w-6 text-primary" />
                                        </Button>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={isPosting}>
                                                    <Smile className="h-6 w-6 text-primary" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-0">
                                                <EmojiPicker onEmojiClick={onEmojiClick} />
                                            </PopoverContent>
                                        </Popover>
                                        <Button variant="ghost" size="icon" onClick={() => setShowLocationInput(!showLocationInput)} disabled={isPosting}>
                                            <MapPin className="h-6 w-6 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => {setShowAiTextGenerator(!showAiTextGenerator);}} disabled={isPosting}>
                                            <Sparkles className="h-6 w-6 text-primary" />
                                        </Button>
                                    </div>
                                    <Button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !postImageDataUri) || isPosting}>
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
