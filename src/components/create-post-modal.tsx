
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle as EditDialogTitle, DialogTitle as OtherDialogTitle, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { generateImageFromPrompt } from '@/ai/flows/image-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, runTransaction, increment, query, where, getDocs, writeBatch, getDoc, limit } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Sparkles, Loader2, Plus, ImageIcon, X, Smile, Upload, MapPin, Bird, ListOrdered, PlusCircle, Trash2, BadgeCheck, Globe, Video, Camera, Clapperboard } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

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
        <p className="text-sm mt-1 text-muted-foreground line-clamp-3">{post.content}</p>
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
    
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postImageDataUri, setPostImageDataUri] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [location, setLocation] = useState('');
    
    const [pollData, setPollData] = useState<PollData | null>(null);
    
    const [isAppUpdate, setIsAppUpdate] = useState(false);
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);

    const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);

    const { toast } = useToast();
    const isMobile = useIsMobile();

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
        if (open) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 150);
        } else {
            setTimeout(resetModalState, 300);
        }
    }, [open]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewPostContent(text);
        const url = extractSpotifyUrl(text);
        setSpotifyUrl(url);
    };

    const resetModalState = () => {
        setNewPostContent('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
        setLocation('');
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
            let imageUrl = '';
            if (postImageDataUri) {
                const imagePath = `posts/${user.uid}/${uuidv4()}`;
                const imageStorageRef = storageRef(storage, imagePath);
                await uploadString(imageStorageRef, postImageDataUri, 'data_url');
                imageUrl = await getDownloadURL(imageStorageRef);
            }

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
                    votes: pollData.options.map(() => 0),
                    voters: {}
                } : null;
                
                 if (quotedPost) {
                    const originalPostRef = doc(db, 'posts', quotedPost.id);
                    transaction.update(originalPostRef, { retweets: increment(1) });
                }

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
                    image: imageUrl,
                    imageHint: '',
                    communityId: null,
                    createdAt: serverTimestamp(),
                    comments: 0,
                    retweets: [],
                    likes: [],
                    views: 0,
                    isVerified: zisprUser.isVerified || zisprUser.handle === '@rulio',
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
                        isVerified: quotedPost.isVerified || quotedPost.handle === '@rulio',
                    } : null,
                    spotifyUrl: finalSpotifyUrl,
                });
                
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
                                        isVerified: zisprUser.isVerified || zisprUser.handle === '@rulio',
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

            resetModalState();
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

    const isSubmitDisabled = (!newPostContent.trim() && !postImageDataUri && !pollData && !quotedPost) || isPosting;
    const charCount = newPostContent.length;
    const charLimit = 280;
    const progress = (charCount / charLimit) * 100;
    const isUserVerified = zisprUser?.isVerified || zisprUser?.handle === '@rulio';

    const ModalContent = (
        <div className="flex flex-col h-svh bg-background">
            <header className="flex flex-row items-center justify-between p-2">
                 <Button variant="link" onClick={resetModalState} disabled={isPosting}>
                    Cancelar
                </Button>
                <Button onClick={handleCreatePost} disabled={isSubmitDisabled} className="rounded-full font-bold px-5">
                    {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Postar
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto px-4">
                {zisprUser ? (
                     <div className="flex gap-4">
                        <Avatar>
                            <AvatarImage src={zisprUser.avatar} alt={zisprUser.handle} />
                            <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Textarea 
                                ref={textareaRef}
                                placeholder="O que está acontecendo?!" 
                                className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[100px] resize-none"
                                value={newPostContent}
                                onChange={handleContentChange}
                                disabled={isPosting}
                                maxLength={charLimit}
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
                             {pollData && (
                                <div className="mt-4">
                                    <PollCreator onChange={setPollData} />
                                </div>
                            )}
                             {spotifyUrl && !quotedPost && (
                                <SpotifyEmbed url={spotifyUrl} />
                             )}
                        </div>
                    </div>
                ) : <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
            </main>

            <footer className="p-2 border-t">
                <Button variant="ghost" size="sm" className="rounded-full text-primary">
                    <Globe className="h-4 w-4 mr-2" />
                    Qualquer pessoa pode interagir
                </Button>
                <Separator className="my-2"/>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-0">
                        <Input
                            type="file"
                            className="hidden"
                            ref={imageInputRef}
                            accept="image/png, image/jpeg, image/gif"
                            onChange={handleImageChange}
                        />
                        <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                            <ImageIcon className="h-6 w-6 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={isPosting}>
                            <Video className="h-6 w-6 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={isPosting}>
                            <Camera className="h-6 w-6 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={isPosting}>
                            <Clapperboard className="h-6 w-6 text-primary" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">{charLimit - charCount}</span>
                         {charCount > 0 && (
                            <div className="relative h-6 w-6">
                                <svg className="h-full w-full" viewBox="0 0 20 20">
                                    <circle className="stroke-current text-border" cx="10" cy="10" r="8" strokeWidth="2" fill="none" />
                                    <circle 
                                        className={`stroke-current ${progress >= 100 ? 'text-destructive' : 'text-primary'}`}
                                        cx="10" cy="10" r="8" strokeWidth="2" fill="none"
                                        strokeDasharray={`${(progress / 100) * 50.26} 50.26`}
                                        transform="rotate(-90 10 10)"
                                    />
                                </svg>
                            </div>
                         )}
                    </div>
                </div>
            </footer>
        </div>
    );

    const DialogWrapper = isMobile ? Sheet : Dialog;
    const DialogContentWrapper = isMobile ? SheetContent : DialogContent;
    
    return (
        <DialogWrapper open={open} onOpenChange={(isOpen) => { if(!isPosting) onOpenChange(isOpen); }}>
            <DialogContentWrapper 
                 className={isMobile ? "h-svh p-0 border-0 flex flex-col" : "sm:max-w-xl bg-background/95 backdrop-blur-lg border rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 p-0"}
                 {...(isMobile && { side: "bottom"})}
                 hideCloseButton={true}
            >
               {isMobile && 
                <SheetHeader className="sr-only">
                    <SheetTitle>Criar Post</SheetTitle>
                </SheetHeader>
               }
               {ModalContent}
            </DialogContentWrapper>
        </DialogWrapper>
    );
}

    