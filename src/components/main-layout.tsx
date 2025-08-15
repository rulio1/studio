
'use client';

import Link from 'next/link';
import { Home, Search, Repeat, Bell, Mail, Plus, Briefcase, Users, Radio, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useState, useRef, useEffect } from 'react';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { ImageIcon, Sparkles, Loader2, X } from 'lucide-react';
import Image from 'next/image';

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

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if(userDoc.exists()){
                    setChirpUser(userDoc.data() as ChirpUser);
                }
            }
        });
        return () => unsubscribe();
    }, []);


    const navItems = [
        { href: '/home', icon: Home, label: 'Home' },
        { href: '/search', icon: Search, label: 'Search' },
        { href: '/communities', icon: Users, label: 'Communities' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
        { href: '/messages', icon: Mail, label: 'Messages' },
    ];
    
    const resetModal = () => {
        setNewPostContent('');
        setNewPostImage(null);
        setAiPrompt('');
        setIsGenerating(false);
        setIsModalOpen(false);
    }

    const handleCreatePost = async () => {
        if (!newPostContent.trim() || !user || !chirpUser) {
            toast({
                title: "Post cannot be empty.",
                description: "Please write something before posting.",
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
                imageHint: imageUrl ? 'user upload' : '',
                createdAt: serverTimestamp(),
                comments: 0,
                retweets: [],
                likes: [],
                views: 0,
            });

            resetModal();
            toast({
                title: "Post created!",
                description: "Your post has been successfully published.",
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to create post", description: "Please try again.", variant: "destructive" });
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
            toast({ title: "Prompt cannot be empty", variant: "destructive"});
            return;
        }
        setIsGenerating(true);
        try {
            const generatedContent = await generatePost(aiPrompt);
            setNewPostContent(generatedContent);
            toast({ title: "Post content generated!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to generate post", description: "Please try again.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    // Hide layout on these pages
    const noLayoutPages = ['/login', '/register', '/', '/post'];
    if (noLayoutPages.some(page => pathname.startsWith(page) && (page !== '/' || pathname === '/'))) {
        return <>{children}</>;
    }


    return (
        <div className="flex flex-col h-screen bg-background relative">
            <main className="flex-1 overflow-y-auto pb-14 animate-fade-in">
                {children}
            </main>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button className="absolute bottom-20 right-4 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90">
                        <Plus className="h-8 w-8" />
                    </Button>
                </DialogTrigger>
                 <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                    <DialogTitle>Create Post</DialogTitle>
                    <DialogDescription>
                        What's on your mind? Share it with the world. You can even use AI to generate content for you.
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
                                    placeholder="What's happening?!" 
                                    className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none"
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    rows={5}
                                />
                                {newPostImage && (
                                    <div className="mt-4 relative">
                                        <Image src={newPostImage} width={500} height={300} alt="Preview" className="rounded-2xl border" />
                                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setNewPostImage(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 p-4 border rounded-lg">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Generate with AI</span>
                            </div>
                            <Textarea 
                                placeholder="e.g., A post about the future of space exploration"
                                className="text-sm focus-visible:ring-1"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                rows={2}
                            />
                            <Button onClick={handleGeneratePost} disabled={isGenerating || !aiPrompt.trim()} className="self-end">
                                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate
                            </Button>
                        </div>
                        <div className="flex justify-between items-center mt-2 border-t pt-4">
                            <div>
                                <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                                    <ImageIcon className="h-6 w-6 text-primary" />
                                </Button>
                            </div>
                            <Button onClick={handleCreatePost} disabled={!newPostContent.trim() || isPosting}>
                                {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Post
                            </Button>
                        </div>
                    </div>
                     ) : <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
                </DialogContent>
            </Dialog>

            <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t">
                <nav className="flex justify-around items-center h-14">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} className={`flex-1 flex justify-center items-center ${pathname === item.href ? 'text-foreground' : 'text-muted-foreground'}`}>
                            <item.icon className="h-7 w-7" />
                        </Link>
                    ))}
                </nav>
            </footer>
        </div>
    );
}
