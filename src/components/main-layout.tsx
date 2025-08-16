
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { generateImageFromPrompt } from '@/ai/flows/image-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ImageIcon, Sparkles, Loader2, X, Plus, ImageUp } from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import BottomNavBar from './bottom-nav-bar';
import React from 'react';
import { Toaster } from './ui/toaster';
import { v4 as uuidv4 } from 'uuid';


interface ChirpUser {
    uid: string;
    displayName: string;
    email: string;
    handle: string;
    avatar: string;
    banner: string;
    bio: string;
    location: string;
    website: string;
    birthDate: Date | null;
    followers: string[];
    following: string[];
}

// Helper to convert data URI to File object
function dataURItoFile(dataURI: string, filename: string): File {
    const arr = dataURI.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URI');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not find MIME type in data URI');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}


function CreatePostModal() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
    const [newPostFile, setNewPostFile] = useState<File | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    
    // AI Generators State
    const [showAiTextGenerator, setShowAiTextGenerator] = useState(false);
    const [aiTextPrompt, setAiTextPrompt] = useState('');
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [showAiImageGenerator, setShowAiImageGenerator] = useState(false);
    const [aiImagePrompt, setAiImagePrompt] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    
    const { toast } = useToast();
    const imageInputRef = React.useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newPostContent]);

    const resetModal = () => {
        setNewPostContent('');
        setNewPostImagePreview(null);
        setNewPostFile(null);
        setAiTextPrompt('');
        setAiImagePrompt('');
        setIsGeneratingText(false);
        setIsGeneratingImage(false);
        setShowAiTextGenerator(false);
        setShowAiImageGenerator(false);
        setIsModalOpen(false);
    }

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !newPostFile) {
            toast({
                title: "O post não pode estar vazio.",
                description: "Por favor, escreva algo ou adicione uma imagem antes de postar.",
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

        try {
            let imageUrl = '';
            let imageHint = '';

            if (newPostFile) {
                const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${newPostFile.name}`);
                await uploadBytes(imageRef, newPostFile);
                imageUrl = await getDownloadURL(imageRef);
                imageHint = aiImagePrompt || 'user upload';
            }

            await addDoc(collection(db, "posts"), {
                authorId: user.uid,
                author: chirpUser.displayName,
                handle: chirpUser.handle,
                avatar: chirpUser.avatar,
                avatarFallback: chirpUser.displayName[0],
                content: newPostContent,
                image: imageUrl,
                imageHint: imageUrl ? imageHint : '',
                communityId: null,
                createdAt: serverTimestamp(),
                comments: 0,
                retweets: [],
                likes: [],
                views: 0,
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

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setNewPostFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewPostImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
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
        if (!aiImagePrompt.trim()) return;
        setIsGeneratingImage(true);
        setNewPostFile(null); // Clear any user-uploaded file
        setNewPostImagePreview(null);
        try {
            const imageDataUri = await generateImageFromPrompt(aiImagePrompt);
            setNewPostImagePreview(imageDataUri);
            // Convert data URI to a File object to be uploaded
            const imageFile = dataURItoFile(imageDataUri, `${uuidv4()}.png`);
            setNewPostFile(imageFile);
            toast({ title: "Imagem gerada com sucesso!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao gerar a imagem", description: `${error}`, variant: "destructive" });
        } finally {
            setIsGeneratingImage(false);
        }
    };


    return (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                                    ref={textareaRef}
                                    placeholder="O que está acontecendo?!" 
                                    className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none overflow-hidden"
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    rows={1}
                                />
                                {newPostImagePreview && (
                                    <div className="mt-4 relative">
                                        <Image src={newPostImagePreview} width={500} height={300} alt="Pré-visualização" className="rounded-2xl border" />
                                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => {setNewPostImagePreview(null); setNewPostFile(null)}}>
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
                                    placeholder="ex: Um astronauta surfando em um anel de Saturno"
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
                                <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                                    <ImageIcon className="h-6 w-6 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {setShowAiImageGenerator(!showAiImageGenerator); setShowAiTextGenerator(false);}} disabled={isPosting}>
                                    <ImageUp className="h-6 w-6 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {setShowAiTextGenerator(!showAiTextGenerator); setShowAiImageGenerator(false);}} disabled={isPosting}>
                                    <Sparkles className="h-6 w-6 text-primary" />
                                </Button>
                            </div>
                            <Button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !newPostFile) || isPosting}>
                                {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Postar
                            </Button>
                        </div>
                    </div>
                    ) : <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
                </DialogContent>
            </Dialog>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);


    const noLayoutPages = ['/login', '/register', '/'];
    if (noLayoutPages.includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen">
            <main className="flex-1 min-w-0 pb-24 md:pb-0">
              {children}
            </main>
            {isClient && (
                <>
                    <CreatePostModal />
                    <BottomNavBar />
                    <Toaster />
                </>
            )}
        </div>
    );
}
