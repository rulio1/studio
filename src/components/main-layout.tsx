
'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ImageIcon, Sparkles, Loader2, X, Plus, Home, Search, Users, Bell, Mail, Bot, Settings, Bookmark, Radio, User } from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import { usePathname, useRouter } from 'next/navigation';
import BottomNavBar from './bottom-nav-bar';
import React from 'react';
import { SidebarProvider, Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarFooter, SidebarInset } from './ui/sidebar';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';


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

function CreatePostModal() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
    const [newPostFile, setNewPostFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [showAiGenerator, setShowAiGenerator] = useState(false);
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
        setAiPrompt('');
        setIsGenerating(false);
        setIsModalOpen(false);
        setShowAiGenerator(false);
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
            let imageHint = 'user upload';

            if (newPostFile) {
                const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${newPostFile.name}`);
                await uploadBytes(imageRef, newPostFile);
                imageUrl = await getDownloadURL(imageRef);
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
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button className="fixed bottom-20 right-4 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 md:hidden z-50">
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

                        {showAiGenerator && (
                            <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
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
                        )}

                        <div className="flex justify-between items-center mt-2 border-t pt-4">
                            <div className="flex items-center gap-2">
                                <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                                    <ImageIcon className="h-6 w-6 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setShowAiGenerator(!showAiGenerator)} disabled={isPosting}>
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

function DesktopSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);

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

    if (!user || !chirpUser) {
        return null;
    }

    const navItems = [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/search', icon: Search, label: 'Busca' },
        { href: '/communities', icon: Users, label: 'Comunidades' },
        { href: '/notifications', icon: Bell, label: 'Notificações' },
        { href: '/messages', icon: Mail, label: 'Mensagens' },
        { href: `/profile/${user.uid}`, icon: User, label: 'Perfil' },
        { href: '/saved', icon: Bookmark, label: 'Itens Salvos' },
    ];


    return (
        <Sidebar className="border-r hidden md:flex" collapsible="icon">
            <SidebarContent className="p-2">
                <SidebarHeader>
                    <ThemeToggle/>
                </SidebarHeader>
                <SidebarMenu>
                {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                         <Link href={item.href} className="w-full">
                            <SidebarMenuButton tooltip={item.label} isActive={pathname.startsWith(item.href)}>
                                <item.icon />
                                <span>{item.label}</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </SidebarContent>
             <SidebarFooter>
                <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={chirpUser.avatar} alt={chirpUser.handle} />
                      <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm truncate">{chirpUser.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{chirpUser.handle}</p>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
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

    if (!isClient) {
        return null;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <DesktopSidebar />
                <SidebarInset>
                    <div className="flex-1 pb-24 md:pb-0">
                        {children}
                    </div>
                </SidebarInset>
                <CreatePostModal />
                <BottomNavBar />
            </div>
        </SidebarProvider>
    );
}

    