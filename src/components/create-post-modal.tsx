
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Sparkles, Loader2, Plus, ImageIcon, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import React from 'react';
import { fileToDataUri } from '@/lib/utils';

interface ChirpUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
}

export default function CreatePostModal() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    
    // Image state
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postImageDataUri, setPostImageDataUri] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // AI Generators State
    const [showAiTextGenerator, setShowAiTextGenerator] = useState(false);
    const [aiTextPrompt, setAiTextPrompt] = useState('');
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    
    const { toast } = useToast();

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, "users", currentUser.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setChirpUser(doc.data() as ChirpUser);
                    }
                });
                return () => unsubscribeUser();
            } else {
                setUser(null);
                setChirpUser(null);
            }
        });
        return () => unsubscribe();
    }, []);


    const resetModal = () => {
        setNewPostContent('');
        setAiTextPrompt('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
        setIsGeneratingText(false);
        setShowAiTextGenerator(false);
        setIsModalOpen(false);
        setIsPosting(false);
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
        if (!user || !chirpUser) {
             toast({
                title: "Usuário não autenticado.",
                description: "Por favor, faça login para postar.",
                variant: "destructive",
            });
            return;
        }

        setIsPosting(true);
        const hashtags = extractHashtags(newPostContent);

        try {
            await runTransaction(db, async (transaction) => {
                const postRef = doc(collection(db, "posts"));

                // First, perform all reads
                const hashtagRefs = hashtags.map(tag => doc(db, "hashtags", tag));
                const hashtagDocs = await Promise.all(hashtagRefs.map(ref => transaction.get(ref)));

                // Now, perform all writes
                // 1. Create the new post
                transaction.set(postRef, {
                    authorId: user.uid,
                    author: chirpUser.displayName,
                    handle: chirpUser.handle,
                    avatar: chirpUser.avatar,
                    avatarFallback: chirpUser.displayName[0],
                    content: newPostContent,
                    hashtags: hashtags,
                    image: postImageDataUri || '',
                    imageHint: '',
                    communityId: null,
                    createdAt: serverTimestamp(),
                    comments: 0,
                    retweets: [],
                    likes: [],
                    views: 0,
                });

                // 2. Update hashtag counts
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

    return (
            <Dialog open={isModalOpen} onOpenChange={(isOpen) => { if(!isPosting) setIsModalOpen(isOpen); }}>
                <DialogTrigger asChild>
                    <Button className="fixed bottom-20 right-4 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50">
                        <Plus className="h-8 w-8" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                    <DialogTitle>Criar Post</DialogTitle>
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
                                    placeholder="O que está acontecendo?!" 
                                    className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none"
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    rows={newPostContent.length > 50 || postImagePreview ? 5 : 1}
                                    disabled={isPosting}
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
                                    <ImageIcon className="h-6 w-6 text-primary" />
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
                     ) : <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
                </DialogContent>
            </Dialog>
    );
}
