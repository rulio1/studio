
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { ImageIcon, Sparkles, Loader2, X, Plus } from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import BottomNavBar from './bottom-nav-bar';

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

function ClientUILayout() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImage, setNewPostImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    
    const { toast } = useToast();
    const imageInputRef = useRef<HTMLInputElement>(null);

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

    const resetModal = () => {
        setNewPostContent('');
        setNewPostImage(null);
        setAiPrompt('');
        setIsGenerating(false);
        setIsModalOpen(false);
    }

    const handleCreatePost = async (communityId: string | null = null) => {
        if (!newPostContent.trim() || !user || !chirpUser) {
            toast({
                title: "O post não pode estar vazio.",
                description: "Por favor, escreva algo antes de postar.",
                variant: "destructive",
            });
            return;
        }
        setIsPosting(true);

        try {
            let imageUrl = '';
            if (newPostImage) {
                const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}`);
                const snapshot = await uploadString(imageRef, newPostImage, 'data_url');
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, "posts"), {
                authorId: user.uid,
                author: chirpUser.displayName,
                handle: chirpUser.handle,
                avatar: chirpUser.avatar,
                avatarFallback: chirpUser.displayName[0],
                content: newPostContent,
                image: imageUrl,
                imageHint: imageUrl ? 'upload do usuário' : '',
                communityId: communityId,
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
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewPostImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGeneratePost = async () => {
        if(!aiPrompt.trim()) {
            toast({ title: "O prompt não pode estar vazio", variant: "destructive"});
            return;
        }
        setIsGenerating(true);
        try {
            const generatedContent = await generatePost(aiPrompt);
            setNewPostContent(generatedContent);
            toast({ title: "Conteúdo do post gerado!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Falha ao gerar o post", description: "Por favor, tente novamente.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button className="absolute bottom-28 right-4 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90">
                        <Plus className="h-8 w-8" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                    <DialogTitle>Criar Post</DialogTitle>
                    <DialogDescription>
                        O que você está pensando? Compartilhe com o mundo.
                    </DialogDescription>
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
                                    rows={5}
                                />
                                {newPostImage && (
                                    <div className="mt-4 relative">
                                        <Image src={newPostImage} width={500} height={300} alt="Pré-visualização" className="rounded-2xl border" />
                                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setNewPostImage(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <span className="font-semibold text-sm">Gerar com IA</span>
                            </div>
                            <Textarea 
                                placeholder="ex: Um post sobre o futuro da exploração espacial"
                                className="text-sm focus-visible:ring-1 bg-background"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                rows={2}
                            />
                            <Button onClick={handleGeneratePost} disabled={isGenerating || !aiPrompt.trim()} className="self-end" size="sm">
                                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Gerar
                            </Button>
                        </div>
                        <div className="flex justify-between items-center mt-2 border-t pt-4">
                            <div className="flex items-center gap-2">
                                <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                                    <ImageIcon className="h-6 w-6 text-primary" />
                                </Button>
                            </div>
                            <Button onClick={() => handleCreatePost(null)} disabled={!newPostContent.trim() || isPosting}>
                                {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Postar
                            </Button>
                        </div>
                    </div>
                    ) : <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
                </DialogContent>
            </Dialog>
            <BottomNavBar />
        </>
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
        <div className="flex flex-col h-screen bg-background relative animate-fade-in">
            <div className="flex-1 overflow-y-auto pb-28">
                {children}
            </div>
            
            {isClient && <ClientUILayout />}
        </div>
    );
}
