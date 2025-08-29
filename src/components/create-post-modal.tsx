
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, runTransaction, getDocs, query, where } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Loader2, X, ImageIcon, ListOrdered, Smile, MapPin, Globe, Clapperboard } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import React from 'react';
import { fileToDataUri, extractSpotifyUrl } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
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

export default function CreatePostModal({ open, onOpenChange, quotedPost }: CreatePostModalProps) {
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postImageDataUri, setPostImageDataUri] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);

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
            // Delay reset to allow closing animation
            setTimeout(resetModalState, 300);
        }
    }, [open]);

    const resetModalState = () => {
        setNewPostContent('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        onOpenChange(false);
        setIsPosting(false);
    }

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

        const dataUri = await fileToDataUri(file);
        setPostImagePreview(URL.createObjectURL(file));
        setPostImageDataUri(dataUri);
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !postImageDataUri && !quotedPost) {
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

            const hashtags = extractHashtags(newPostContent);
            const mentionedHandles = extractMentions(newPostContent);
            const spotifyUrl = extractSpotifyUrl(newPostContent);

            await runTransaction(db, async (transaction) => {
                const postRef = doc(collection(db, "posts"));

                transaction.set(postRef, {
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
                    createdAt: serverTimestamp(),
                    comments: 0,
                    retweets: [],
                    likes: [],
                    views: 0,
                    isVerified: zisprUser.isVerified || zisprUser.handle === '@rulio',
                    quotedPostId: quotedPost ? quotedPost.id : null,
                    poll: null,
                });

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
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao criar o post", description: "Por favor, tente novamente.", variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };
    
    const isSubmitDisabled = (!newPostContent.trim() && !postImageDataUri && !quotedPost) || isPosting;
    
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

    const ModalContent = (
        <>
            <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
                <DialogTitle>Novo Post</DialogTitle>
                <Button onClick={handleCreatePost} disabled={isSubmitDisabled} className="rounded-full font-bold px-5">
                    {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Postar'}
                </Button>
            </DialogHeader>

            <div className="p-3 flex-1 overflow-y-auto">
                <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={zisprUser?.avatar} alt={zisprUser?.handle} />
                        <AvatarFallback>{zisprUser?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                        <Textarea
                            ref={textareaRef}
                            placeholder="O que está acontecendo?"
                            className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[80px] resize-none"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            disabled={isPosting}
                        />
                        {postImagePreview && (
                            <div className="mt-4 relative w-fit">
                                <Image
                                    src={postImagePreview}
                                    alt="Prévia da imagem"
                                    width={500}
                                    height={300}
                                    className="rounded-lg object-cover w-full h-auto max-h-80"
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
                    </div>
                </div>
            </div>

            <DialogFooter className="p-2 border-t">
                 <div className="flex justify-start items-center -ml-2">
                    <Input type="file" className="hidden" ref={imageInputRef} accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} />
                    <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                        <ImageIcon className="h-5 w-5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={isPosting}>
                        <Clapperboard className="h-5 w-5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={isPosting}>
                        <ListOrdered className="h-5 w-5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={isPosting}>
                        <Smile className="h-5 w-5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={isPosting}>
                        <MapPin className="h-5 w-5 text-primary" />
                    </Button>
                </div>
            </DialogFooter>
        </>
    );

    const DialogWrapper = isMobile ? Sheet : Dialog;
    const DialogContentWrapper = isMobile ? SheetContent : DialogContent;
    
    return (
        <DialogWrapper open={open} onOpenChange={(isOpen) => { if(!isPosting) onOpenChange(isOpen)}}>
             <DialogContentWrapper 
                className={isMobile 
                    ? "p-0 gap-0 border-0 flex flex-col h-[80svh]" 
                    : "p-0 gap-0 rounded-2xl bg-card/80 backdrop-blur-lg sm:max-w-xl max-h-[90vh] flex flex-col"
                }
                side={isMobile ? "bottom" : "default"}
             >
                {ModalContent}
            </DialogContentWrapper>
        </DialogWrapper>
    );
}
