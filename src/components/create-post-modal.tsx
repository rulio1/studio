
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, runTransaction, increment, query, where, getDocs, getDoc, limit } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Loader2, X, ImageIcon, MoreHorizontal, ListOrdered, Camera, Clapperboard, Globe, Video, BadgeCheck, Bird } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import React from 'react';
import { fileToDataUri } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';

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
    quotedPost?: Post | null;
}

export default function CreatePostModal({ open, onOpenChange, quotedPost = null}: CreatePostModalProps) {
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
    const MAX_CHARS = 280;

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
        if (e.target.value.length <= MAX_CHARS) {
            setNewPostContent(e.target.value);
        }
    };

    const resetModalState = () => {
        setNewPostContent('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
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

        if (file.size > 4 * 1024 * 1024) { // 4MB limit
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
        if (!newPostContent.trim() && !postImageDataUri) {
            toast({
                title: "O post não pode estar vazio.",
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

            const hashtags = extractHashtags(newPostContent);
            const mentionedHandles = extractMentions(newPostContent);

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
                    createdAt: serverTimestamp(),
                    comments: 0,
                    retweets: [],
                    likes: [],
                    views: 0,
                    isVerified: zisprUser.isVerified || zisprUser.handle === '@rulio',
                });
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

    const isSubmitDisabled = (!newPostContent.trim() && !postImageDataUri) || isPosting;

    const ModalContent = (
      <div className="flex flex-col bg-background h-svh">
         <SheetHeader className="p-0">
             <SheetTitle className="sr-only">Criar Post</SheetTitle>
         </SheetHeader>
        <header className="flex items-center justify-between p-4 border-b">
          <Button variant="link" onClick={resetModalState} disabled={isPosting} className="px-0">
            Cancelar
          </Button>
          <p className="font-bold text-lg">Novo post</p>
          <Button onClick={handleCreatePost} disabled={isSubmitDisabled} className="rounded-full font-bold px-5">
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Postar'}
          </Button>
        </header>

        <main className="flex-1 px-4 pt-4 overflow-y-auto">
          {zisprUser ? (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <Avatar>
                  <AvatarImage src={zisprUser.avatar} alt={zisprUser.handle} />
                  <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="w-0.5 flex-1 bg-border my-2"></div>
                <Avatar className="w-6 h-6 opacity-50">
                   <AvatarImage src={zisprUser.avatar} alt={zisprUser.handle} />
                   <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                </Avatar>
              </div>

              <div className="w-full">
                <div className="font-bold flex items-center gap-1">
                    {zisprUser.displayName}
                    {(zisprUser.isVerified || zisprUser.handle === '@rulio') && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                <Textarea
                  ref={textareaRef}
                  placeholder="O que está acontecendo?"
                  className="bg-transparent border-none text-base focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none"
                  value={newPostContent}
                  onChange={handleContentChange}
                  disabled={isPosting}
                />
                 {postImagePreview && (
                  <div className="mt-4 relative w-fit">
                    <Image
                      src={postImagePreview}
                      alt="Prévia da imagem"
                      width={250}
                      height={250}
                      className="rounded-lg object-cover"
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
                
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          )}
        </main>

        <footer className="p-4 border-t bg-background mt-auto">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-0">
                    <Input type="file" className="hidden" ref={imageInputRef} accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} />
                    <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                        <ImageIcon className="h-6 w-6" />
                    </Button>
                     <Button variant="ghost" size="icon" disabled={isPosting}>
                        <Video className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={isPosting}>
                        <Camera className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={isPosting}>
                        <Clapperboard className="h-6 w-6" />
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{MAX_CHARS - newPostContent.length}</span>
                    <div className="relative h-6 w-6">
                        <Progress value={(newPostContent.length / MAX_CHARS) * 100} className="absolute inset-0 h-full w-full bg-transparent" />
                    </div>
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
                 className={isMobile ? "h-full p-0 border-0 flex flex-col" : "sm:max-w-xl bg-background/95 backdrop-blur-lg border rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 p-0"}
                 {...(isMobile && { side: "bottom"})}
                 hideCloseButton={true}
            >
               {ModalContent}
            </DialogContentWrapper>
        </DialogWrapper>
    );
}
