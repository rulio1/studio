
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, runTransaction, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Loader2, X, ImageIcon, ListOrdered, Smile, MapPin, Globe, Users, AtSign } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import React from 'react';
import { fileToDataUri, extractSpotifyUrl, dataURItoFile } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import PollCreator, { PollData } from './poll-creator';


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
    isUpdate?: boolean;
    communityId?: string;
    hashtags?: string[];
    mentions?: string[];
    isVerified?: boolean;
    isFirstPost?: boolean;
    poll?: {
        options: string[];
        votes: number[];
        voters: Record<string, number>;
    } | null;
    quotedPostId?: string;
    quotedPost?: Omit<Post, 'quotedPost' | 'quotedPostId'>;
    spotifyUrl?: string;
    replySettings?: 'everyone' | 'following' | 'mentioned';
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
    quotedPost?: Post | null;
}

type ReplySetting = 'everyone' | 'following' | 'mentioned';

const replyOptions: Record<ReplySetting, { icon: React.ElementType, text: string }> = {
    everyone: { icon: Globe, text: 'Qualquer pessoa pode responder' },
    following: { icon: Users, text: 'Contas que você segue' },
    mentioned: { icon: AtSign, text: 'Apenas contas que você menciona' }
};

const MAX_CHARS = 280;

export default function CreatePostModal({ open, onOpenChange, quotedPost }: CreatePostModalProps) {
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postImageDataUri, setPostImageDataUri] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [replySetting, setReplySetting] = useState<ReplySetting>('everyone');
    const [location, setLocation] = useState('');
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollData, setPollData] = useState<PollData | null>(null);

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

    const resetModalState = useCallback(() => {
        setNewPostContent('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
        setReplySetting('everyone');
        setLocation('');
        setShowPollCreator(false);
        setPollData(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        onOpenChange(false);
        setIsPosting(false);
    }, [onOpenChange]);

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 150);
        } else {
            resetModalState();
        }
    }, [open, resetModalState]);

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

     const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            toast({
                title: 'Imagem muito grande',
                description: 'Por favor, selecione uma imagem menor que 4MB.',
                variant: 'destructive',
            });
            return;
        }

        setShowPollCreator(false);
        const dataUri = await fileToDataUri(file);
        setPostImagePreview(URL.createObjectURL(file));
        setPostImageDataUri(dataUri);
    };

    const handleCreatePost = async () => {
        if ((!newPostContent.trim() && !postImageDataUri && !quotedPost) || !user || !zisprUser) {
            toast({
                title: "Não é possível postar",
                description: "O post precisa de conteúdo ou uma imagem.",
                variant: "destructive",
            });
            return;
        }

        setIsPosting(true);
        
        try {
            let imageUrl = '';
            if (postImageDataUri && postImageDataUri.startsWith('data:image')) {
                // Upload logic will be re-implemented with a new storage solution
                toast({title: "Upload de Imagem", description: "A funcionalidade de upload será reimplementada em breve."});
            }

            const hashtags = extractHashtags(newPostContent);
            const mentionedHandles = extractMentions(newPostContent);
            const spotifyUrl = extractSpotifyUrl(newPostContent);
            
            const postData = {
                authorId: user.uid,
                author: zisprUser.displayName,
                handle: zisprUser.handle,
                avatar: zisprUser.avatar,
                avatarFallback: zisprUser.displayName[0],
                content: newPostContent,
                hashtags: hashtags,
                mentions: mentionedHandles,
                image: imageUrl,
                spotifyUrl: spotifyUrl,
                location: location.trim() || null,
                createdAt: serverTimestamp(),
                comments: 0,
                retweets: [],
                likes: [],
                views: 0,
                isVerified: zisprUser.isVerified || zisprUser.handle === '@rulio',
                quotedPostId: quotedPost ? quotedPost.id : null,
                poll: pollData ? { options: pollData.options.map(o => o.text), votes: pollData.options.map(() => 0), voters: {} } : null,
                replySettings: replySetting,
                status: 'published',
            };

            await runTransaction(db, async (transaction) => {
                const postRef = doc(collection(db, "posts"));
                transaction.set(postRef, postData);

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

                if (mentionedHandles.length > 0) {
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("handle", "in", mentionedHandles));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach(userDoc => {
                        const mentionedUserId = userDoc.id;
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
                    });
                }
            });

            resetModalState();
            toast({
                title: "Post criado!",
                description: "Seu post foi publicado com sucesso.",
            });
        } catch (error: any) {
            console.error("Erro ao criar post:", error);
            toast({ title: "Falha ao criar o post", description: error.message || "Por favor, tente novamente.", variant: "destructive" });
            setIsPosting(false);
        }
    };
    
    const onEmojiClick = (emojiData: EmojiClickData) => {
        const cursor = textareaRef.current?.selectionStart ?? newPostContent.length;
        const text = newPostContent.slice(0, cursor) + emojiData.emoji + newPostContent.slice(cursor);
        setNewPostContent(text);
    };

    const handlePollClick = () => {
        if (!showPollCreator) {
            setPostImageDataUri(null);
            setPostImagePreview(null);
        }
        setShowPollCreator(!showPollCreator);
    };
    
    const isSubmitDisabled = (!newPostContent.trim() && !postImageDataUri && !quotedPost && !pollData) || isPosting || newPostContent.length > MAX_CHARS;
    
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
            <p className="text-sm mt-1 text-muted-foreground line-clamp-3">{post.content}</p>
            {post.image && (
                <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-lg">
                    <Image src={post.image} layout="fill" objectFit="cover" alt="Quoted post image" />
                </div>
            )}
        </div>
    );
    
    const CurrentReplyOption = replyOptions[replySetting];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="p-0 gap-0 rounded-2xl bg-background/80 backdrop-blur-lg sm:max-w-xl flex flex-col h-auto max-h-[80svh]"
                hideCloseButton={true}
            >
                <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" disabled={isPosting}>
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogClose>
                    <DialogTitle className="sr-only">Novo post</DialogTitle>
                </DialogHeader>

                <main className="px-4 pt-4 pb-0 flex-1 flex flex-col gap-3 overflow-y-auto">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={zisprUser?.avatar} alt={zisprUser?.handle} />
                                <AvatarFallback>{zisprUser?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="w-0.5 flex-1 bg-border my-2"></div>
                        </div>
                        <div className="w-full">
                            <Textarea
                                ref={textareaRef}
                                placeholder="O que está acontecendo?"
                                className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none min-h-[80px]"
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                disabled={isPosting}
                            />
                            {showPollCreator && (
                                <div className="mt-2">
                                    <PollCreator onChange={setPollData} />
                                </div>
                            )}
                            {postImagePreview && (
                                <div className="mt-4 relative w-fit">
                                    <Image
                                        src={postImagePreview}
                                        alt="Prévia da imagem"
                                        width={500}
                                        height={300}
                                        className="rounded-lg object-cover w-full h-auto max-h-60"
                                    />
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white"
                                        onClick={() => {
                                            setPostImagePreview(null);
                                            setPostImageDataUri(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            {quotedPost && (
                                <div className="w-full">
                                    <QuotedPostPreview post={quotedPost} />
                                </div>
                            )}
                            {location && (
                                <div className="mt-2 text-sm text-primary flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2 text-primary self-start rounded-full -ml-2 h-auto py-1 px-2">
                                <CurrentReplyOption.icon className="h-4 w-4"/>
                                <span className="font-bold text-sm">{CurrentReplyOption.text}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => setReplySetting('everyone')}>
                                <Globe className="mr-2 h-4 w-4"/>
                                <span>Qualquer pessoa</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setReplySetting('following')}>
                                <Users className="mr-2 h-4 w-4"/>
                                <span>Contas que você segue</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setReplySetting('mentioned')}>
                                <AtSign className="mr-2 h-4 w-4"/>
                                <span>Apenas contas que você menciona</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </main>

                <DialogFooter className="p-2 border-t mt-auto">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex justify-start items-center -ml-2">
                            <Input type="file" className="hidden" ref={imageInputRef} accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} disabled={showPollCreator} />
                            <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting || showPollCreator}>
                                <ImageIcon className="h-5 w-5 text-primary" />
                            </Button>
                             <Button variant="ghost" size="icon" disabled={isPosting} onClick={handlePollClick}>
                                <ListOrdered className="h-5 w-5 text-primary" />
                            </Button>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isPosting}>
                                        <Smile className="h-5 w-5 text-primary" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0">
                                    <EmojiPicker onEmojiClick={onEmojiClick} />
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isPosting}>
                                        <MapPin className="h-5 w-5 text-primary" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Adicionar Localização</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Digite sua cidade ou local.
                                            </p>
                                        </div>
                                        <Input 
                                            id="location" 
                                            placeholder="Ex: São Paulo, Brasil"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="relative h-7 w-7">
                                <svg className="h-full w-full" viewBox="0 0 20 20">
                                    <circle className="text-muted" strokeWidth="2" stroke="currentColor" fill="transparent" r="8" cx="10" cy="10"/>
                                    <circle
                                        className="text-primary"
                                        strokeWidth="2"
                                        strokeDasharray={`${(newPostContent.length / MAX_CHARS) * 2 * Math.PI * 8}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="8"
                                        cx="10"
                                        cy="10"
                                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                    />
                                </svg>
                                {newPostContent.length > MAX_CHARS && (
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-destructive">{MAX_CHARS - newPostContent.length}</span>
                                )}
                            </div>
                            <Button onClick={handleCreatePost} disabled={isSubmitDisabled} className="rounded-full font-bold px-5">
                                {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Postar'}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
