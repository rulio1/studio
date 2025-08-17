
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Sparkles, Loader2, Plus, ImageIcon, X, Smile, Film } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import React from 'react';
import { fileToDataUri } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useDebounce } from 'use-debounce';

interface ChirpUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
}

interface Gif {
    id: string;
    url: string;
    title: string;
    images: {
        fixed_height: {
            url: string;
        }
        original: {
            url: string;
        }
    }
}

const GIPHY_API_KEY = 'Y8w1xO42S2G43y3y0dM9cNoZpXAZyq57';

function GifPicker({ onGifClick }: { onGifClick: (gif: Gif) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [gifs, setGifs] = useState<Gif[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGifs = async () => {
            setIsLoading(true);
            const endpoint = debouncedSearchTerm
                ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${debouncedSearchTerm}&limit=20`
                : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`;

            try {
                const res = await fetch(endpoint);
                const { data } = await res.json();
                setGifs(data);
            } catch (error) {
                console.error("Failed to fetch GIFs", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchGifs();
    }, [debouncedSearchTerm]);


    return (
        <div className="flex flex-col gap-2 p-2">
            <Input
                placeholder="Buscar GIFs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="h-64 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {gifs.map((gif) => (
                            <div key={gif.id} className="cursor-pointer" onClick={() => onGifClick(gif)}>
                                <Image
                                    src={gif.images.fixed_height.url}
                                    alt={gif.title}
                                    width={200}
                                    height={120}
                                    className="w-full h-auto object-cover rounded"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface CreatePostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMode?: 'post' | 'gif';
}

export default function CreatePostModal({ open, onOpenChange, initialMode = 'post'}: CreatePostModalProps) {
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

    const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
    
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

    useEffect(() => {
        if (open && initialMode === 'gif') {
            setIsGifPickerOpen(true);
        }
    }, [open, initialMode]);

    const resetModal = () => {
        setNewPostContent('');
        setAiTextPrompt('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
        setIsGeneratingText(false);
        setShowAiTextGenerator(false);
        onOpenChange(false);
        setIsPosting(false);
        setIsGifPickerOpen(false);
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
    
    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewPostContent(prev => prev + emojiData.emoji);
    };

    const onGifClick = (gif: Gif) => {
        setPostImagePreview(gif.images.original.url);
        setPostImageDataUri(gif.images.original.url);
        setIsGifPickerOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if(!isPosting) onOpenChange(isOpen); }}>
            <DialogContent className="sm:max-w-xl bg-background/80 backdrop-blur-lg border rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
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
                                <Popover open={isGifPickerOpen} onOpenChange={setIsGifPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isPosting} data-test="gif-picker-trigger">
                                        <Film className="h-6 w-6 text-primary" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto max-w-[450px] p-0 border-0 bg-background">
                                    <GifPicker onGifClick={onGifClick} />
                                </PopoverContent>
                            </Popover>
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
