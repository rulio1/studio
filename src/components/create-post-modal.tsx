
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { generateImageFromPrompt } from '@/ai/flows/image-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, runTransaction, increment, query, where, getDocs, writeBatch, getDoc, limit } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Sparkles, Loader2, Plus, ImageIcon, X, Smile, Upload, MapPin, Bird, ListOrdered, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import React from 'react';
import { fileToDataUri, extractSpotifyUrl } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import PollCreator, { PollData } from './poll-creator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import SpotifyEmbed from './spotify-embed';

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
    communityId?: string;
    hashtags?: string[];
    mentions?: string[];
    repostedBy?: { name: string; handle: string; avatar: string };
    repostedAt?: any;
    isPinned?: boolean;
    isVerified?: boolean;
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

interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
}

interface CreatePostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMode?: 'post' | 'image';
    quotedPost?: Post | null;
}

const QuotedPostPreview = ({ post }: { post: Post }) => (
    <div className="mt-2 border rounded-xl p-3">
        <div className="flex items-center gap-2 text-sm">
            <Avatar className="h-5 w-5">
                <AvatarImage src={post.avatar} />
                <AvatarFallback>{post.author[0]}</AvatarFallback>
            </Avatar>
            <span className="font-bold">{post.author}</span>
            <span className="text-muted-foreground">{post.handle}</span>
        </div>
        <p className="text-sm mt-1 text-muted-foreground">{post.content}</p>
        {post.image && (
            <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-lg">
                <Image src={post.image} layout="fill" objectFit="cover" alt="Quoted post image" />
            </div>
        )}
    </div>
);


export default function CreatePostModal({ open, onOpenChange, initialMode = 'post', quotedPost = null}: CreatePostModalProps) {
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    
    // Image state
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postImageDataUri, setPostImageDataUri] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [location, setLocation] = useState('');
    const [showLocationInput, setShowLocationInput] = useState(false);

    // AI Generators State
    const [showAiTextGenerator, setShowAiTextGenerator] = useState(false);
    const [aiTextPrompt, setAiTextPrompt] = useState('');
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [showAiImageGenerator, setShowAiImageGenerator] = useState(initialMode === 'image');
    const [aiImagePrompt, setAiImagePrompt] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    // Poll State
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollData, setPollData] = useState<PollData | null>(null);
    
    // App Update State
    const [isAppUpdate, setIsAppUpdate] = useState(false);
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);

    const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);

    const { toast } = useToast();

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setZisprUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
            }
        });
        return () => unsubscribeUser();
    }, [user]);

    useEffect(() => {
        if (open && initialMode === 'image') {
            setShowAiImageGenerator(true);
        }
         if (!open) {
            // Delay reset to allow animation to finish
            setTimeout(resetModal, 300);
        }
    }, [open, initialMode]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewPostContent(text);
        const url = extractSpotifyUrl(text);
        setSpotifyUrl(url);
    };

    const resetModal = () => {
        setNewPostContent('');
        setAiTextPrompt('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
        setLocation('');
        setShowLocationInput(false);
        setIsGeneratingText(false);
        setShowAiTextGenerator(false);
        setIsGeneratingImage(false);
        setShowAiImageGenerator(false);
        setAiImagePrompt('');
        setShowPollCreator(false);
        setPollData(null);
        setIsAppUpdate(false);
        setSpotifyUrl(null);
        onOpenChange(false);
        setIsPosting(false);
    }

    const extractHashtags = (content: string) => {
        const regex = /#(\w+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
    };
    
    const extractMentions = (content: string) => {
        const regex = /@(\w+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        return [...new Set(matches)]; // Returns handles like '@username'
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
        if (!newPostContent.trim() && !postImageDataUri && !pollData && !quotedPost) {
            toast({
                title: "O post não pode estar vazio.",
                description: "Por favor, escreva algo, adicione uma imagem ou crie uma enquete.",
                variant: "destructive",
            });
            return;
        }
        if (!user || !zisprUser) {
             toast({
                title: "Usuário não autenticado.",
                description: "Por favor, faça login para postar.",
                variant: "destructive",
            });
            return;
        }

        setIsPosting(true);
        
        try {
            // Check if it's the user's first post outside the transaction
            const userPostsQuery = query(collection(db, 'posts'), where('authorId', '==', user.uid), limit(1));
            const userPostsSnapshot = await getDocs(userPostsQuery);
            const isFirstPost = userPostsSnapshot.empty;

            const hashtags = extractHashtags(newPostContent);
            const mentionedHandles = extractMentions(newPostContent);
            const finalSpotifyUrl = extractSpotifyUrl(newPostContent);

            await runTransaction(db, async (transaction) => {
                const postRef = doc(collection(db, "posts"));

                const finalPollData = pollData ? {
                    options: pollData.options.map(o => o.text),
                    votes: pollData.options.map(() => 0), // Initialize votes
                    voters: {} // Map of userId to optionIndex
                } : null;
                
                 // If it's a quote post, increment the original post's retweet count
                 if (quotedPost) {
                    const originalPostRef = doc(db, 'posts', quotedPost.id);
                    transaction.update(originalPostRef, { retweets: increment(1) });
                }

                // 1. Set the main post data
                transaction.set(postRef, {
                    authorId: user.uid,
                    author: zisprUser.displayName,
                    handle: zisprUser.handle,
                    avatar: zisprUser.avatar,
                    avatarFallback: zisprUser.displayName[0],
                    content: newPostContent,
                    location: location,
                    hashtags: hashtags,
                    mentions: mentionedHandles,
                    image: postImageDataUri || '',
                    imageHint: '',
                    communityId: null,
                    createdAt: serverTimestamp(),
                    comments: 0,
                    retweets: [],
                    likes: [],
                    views: 0,
                    isVerified: zisprUser.isVerified || false,
                    isFirstPost: isFirstPost,
                    isUpdate: zisprUser.handle === '@rulio' && isAppUpdate,
                    poll: finalPollData,
                    quotedPostId: quotedPost?.id || null,
                    quotedPost: quotedPost ? {
                        id: quotedPost.id,
                        author: quotedPost.author,
                        authorId: quotedPost.authorId,
                        handle: quotedPost.handle,
                        avatar: quotedPost.avatar,
                        content: quotedPost.content,
                        image: quotedPost.image || '',
                        createdAt: quotedPost.createdAt,
                        isVerified: quotedPost.isVerified || false,
                    } : null,
                    spotifyUrl: finalSpotifyUrl,
                });

                // 2. Handle first post notification
                if (isFirstPost) {
                    const zisprOfficialUserQuery = query(collection(db, 'users'), where('handle', '==', '@Zispr'), limit(1));
                    const zisprUserSnapshot = await getDocs(zisprOfficialUserQuery); 
                    
                    if (!zisprUserSnapshot.empty) {
                        const zisprUserData = zisprUserSnapshot.docs[0].data();
                        const notificationRef = doc(collection(db, 'notifications'));
                        transaction.set(notificationRef, {
                            toUserId: user.uid,
                            fromUserId: zisprUserSnapshot.docs[0].id,
                            fromUser: {
                                name: zisprUserData.displayName,
                                handle: zisprUserData.handle,
                                avatar: zisprUserData.avatar,
                                isVerified: true,
                            },
                            type: 'post',
                            text: 'Bem-vindo ao Zispr! Adoramos seu primeiro post.',
                            postContent: newPostContent.substring(0, 50),
                            postId: postRef.id,
                            createdAt: serverTimestamp(),
                            read: false,
                        });
                    }
                }
                
                // 3. Handle mentions
                if (mentionedHandles.length > 0) {
                     const usersRef = collection(db, "users");
                     const mentionedUserDocs = await Promise.all(mentionedHandles.map(handle => {
                         const mentionQuery = query(usersRef, where("handle", "==", handle), limit(1));
                         return getDocs(mentionQuery);
                     }));

                     mentionedUserDocs.forEach(querySnapshot => {
                        if (!querySnapshot.empty) {
                            const userDoc = querySnapshot.docs[0];
                            const mentionedUserId = userDoc.id;
                            if (mentionedUserId !== user.uid) {
                                const notificationRef = doc(collection(db, 'notifications'));
                                transaction.set(notificationRef, {
                                    toUserId: mentionedUserId,
                                    fromUserId: user.uid,
                                    fromUser: {
                                        name: zisprUser.displayName,
                                        handle: zisprUser.handle,
                                        avatar: zisprUser.avatar,
                                        isVerified: zisprUser.isVerified || false,
                                    },
                                    type: 'mention',
                                    text: 'mencionou você em um post',
                                    postContent: newPostContent.substring(0, 50),
                                    postId: postRef.id,
                                    createdAt: serverTimestamp(),
                                    read: false,
                                });
                            }
                        }
                     });
                }
                
                // 4. Update hashtag counts
                for (const tag of hashtags) {
                    const hashtagRef = doc(db, "hashtags", tag);
                    const hashtagDoc = await transaction.get(hashtagRef);
                    if (hashtagDoc.exists()) {
                        transaction.update(hashtagRef, { count: increment(1) });
                    } else {
                        transaction.set(hashtagRef, {
                            name: tag,
                            count: 1,
                            createdAt: serverTimestamp()
                        });
                    }
                }
            });

            resetModal();
            toast({
                title: "Post criado!",
                description: "Seu post foi publicado com sucesso.",
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao criar o post", description: "Por favor, tente novamente.", variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };
    
    const handleGenerateText = async () => {
        if(!aiTextPrompt.trim()) {
            toast({ title: "O prompt não pode estar vazio", variant: "destructive"});
            return;
        }
        setIsGeneratingText(true);
        try {
            const generatedContent = await generatePost(aiTextPrompt);
            setNewPostContent(generatedContent);
            toast({ title: "Conteúdo do post gerado!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao gerar o post", description: "Por favor, tente novamente.", variant: "destructive" });
        } finally {
            setIsGeneratingText(false);
        }
    };
    
     const handleGenerateImage = async () => {
        if (!aiImagePrompt.trim()) {
             toast({ title: "O prompt não pode estar vazio", variant: "destructive"});
            return;
        }
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

    const isSubmitDisabled = (!newPostContent.trim() && !postImageDataUri && !pollData && !quotedPost) || isPosting;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if(!isPosting) onOpenChange(isOpen); }}>
            <DialogContent className="sm:max-w-xl bg-background/80 backdrop-blur-lg border rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                <DialogHeader>
                <DialogTitle>Criar Post</DialogTitle>
                </DialogHeader>
                    {zisprUser ? (
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <Avatar>
                            <AvatarImage src={zisprUser.avatar} alt={zisprUser.handle} />
                            <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Textarea 
                                placeholder="O que está acontecendo?!" 
                                className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                value={newPostContent}
                                onChange={handleContentChange}
                                disabled={isPosting}
                            />
                            {quotedPost && <QuotedPostPreview post={quotedPost} />}
                            {postImagePreview && (
                                <div className="mt-4 relative">
                                    <Image src={postImagePreview} alt="Prévia da imagem" width={500} height={300} className="rounded-lg object-cover w-full" />
                                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => { setPostImagePreview(null); setPostImageDataUri(null); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                             {showPollCreator && (
                                <div className="mt-4">
                                    <PollCreator onChange={setPollData} />
                                </div>
                            )}
                             {spotifyUrl && (
                                <SpotifyEmbed url={spotifyUrl} />
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
                                disabled={isGeneratingText}
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
                                disabled={isGeneratingImage}
                            />
                            <Button onClick={handleGenerateImage} disabled={isGeneratingImage || !aiImagePrompt.trim()} className="self-end" size="sm">
                                {isGeneratingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Gerar Imagem
                            </Button>
                        </div>
                    )}

                    {zisprUser.handle === '@rulio' && (
                        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                            <Switch id="update-switch" checked={isAppUpdate} onCheckedChange={setIsAppUpdate} />
                            <Label htmlFor="update-switch">Marcar como atualização do app</Label>
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
                             <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting || showPollCreator}>
                                <Upload className="h-6 w-6 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setShowAiImageGenerator(!showAiImageGenerator)} disabled={isPosting || showPollCreator}>
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
                             <Button variant="ghost" size="icon" onClick={() => setShowPollCreator(!showPollCreator)} disabled={isPosting || !!postImageDataUri}>
                                <ListOrdered className="h-6 w-6 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {setShowAiTextGenerator(!showAiTextGenerator);}} disabled={isPosting}>
                                <Sparkles className="h-6 w-6 text-primary" />
                            </Button>
                        </div>
                        <Button onClick={handleCreatePost} disabled={isSubmitDisabled}>
                            {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Postar
                        </Button>
                    </div>
                </div>
                    ) : <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
            </DialogContent>
        </Dialog>
    );
}
