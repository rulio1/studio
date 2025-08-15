
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Bell, Home, Mail, MessageCircle, PlayCircle, Search, Settings, User, Repeat, Heart, BarChart2, Upload, Bird, X, MessageSquare, Users, Bookmark, Briefcase, List, Radio, Banknote, Bot, MoreHorizontal, Sun, Moon, Plus, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PostSkeleton from '@/components/post-skeleton';
import { useRouter } from 'next/navigation';
import { generatePost } from '@/ai/flows/post-generator-flow';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { formatDistanceToNow } from 'date-fns';


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
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    isLiked: boolean;
    isRetweeted: boolean;
}

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


export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);


  const { toast } = useToast();
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUser(user);
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if(userDoc.exists()){
                setChirpUser(userDoc.data() as ChirpUser);
            }
        } else {
            router.push('/login');
        }
    });

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate()) + ' ago' : 'Just now',
                isLiked: data.likes.includes(auth.currentUser?.uid || ''),
                isRetweeted: data.retweets.includes(auth.currentUser?.uid || ''),
            } as Post
        });
        setPosts(postsData);
        setIsLoading(false);
    });

    return () => {
        unsubscribeAuth();
        unsubscribePosts();
    };
  }, [router]);

  const handlePostAction = async (postId: string, action: 'like' | 'retweet') => {
    if(!user) return;
    const postRef = doc(db, "posts", postId);
    const field = action === 'like' ? 'likes' : 'retweets';
    const post = posts.find(p => p.id === postId);
    if(!post) return;

    if(post[action === 'like' ? 'isLiked' : 'isRetweeted']) {
        await updateDoc(postRef, { [field]: arrayRemove(user.uid) });
    } else {
        await updateDoc(postRef, { [field]: arrayUnion(user.uid) });
    }
  };

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
        createdAt: new Date(),
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

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  if (isLoading || !user || !chirpUser) {
      return (
        <div className="flex flex-col h-screen bg-background relative">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Bird className="h-6 w-6" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
             </header>
             <main className="flex-1 overflow-y-auto">
                <div className="flow-root">
                    <ul className="divide-y divide-border">
                        <li className="p-4"><PostSkeleton /></li>
                        <li className="p-4"><PostSkeleton /></li>
                        <li className="p-4"><PostSkeleton /></li>
                    </ul>
                </div>
             </main>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Sheet>
              <SheetTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={chirpUser.avatar} alt={chirpUser.handle} />
                  <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                </Avatar>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 animate-slide-in-from-bottom">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <div className="flex items-center justify-between">
                    <Avatar className="h-10 w-10">
                       <AvatarImage src={chirpUser.avatar} alt={chirpUser.handle} />
                       <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
                  </div>
                  <div className="mt-4">
                    <p className="font-bold text-lg">{chirpUser.displayName}</p>
                    <p className="text-sm text-muted-foreground">{chirpUser.handle}</p>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <p><span className="font-bold">{chirpUser.following?.length || 0}</span> <span className="text-muted-foreground">Following</span></p>
                    <p><span className="font-bold">{chirpUser.followers?.length || 0}</span> <span className="text-muted-foreground">Followers</span></p>
                  </div>
                </SheetHeader>
                <nav className="flex-1 flex flex-col gap-2 p-4">
                      <Link href="/profile" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <User className="h-6 w-6" /> Profile
                      </Link>
                       <Link href="#" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <X className="h-6 w-6" /> Premium
                      </Link>
                       <Link href="/grok" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <MessageSquare className="h-6 w-6" /> Chat <Badge variant="default" className="ml-auto">BETA</Badge>
                      </Link>
                      <Link href="/communities" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Users className="h-6 w-6" /> Communities
                      </Link>
                       <Link href="#" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Bookmark className="h-6 w-6" /> Bookmarks
                      </Link>
                       <Link href="/jobs" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Briefcase className="h-6 w-6" /> Jobs
                      </Link>
                       <Link href="#" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <List className="h-6 w-6" /> Lists
                      </Link>
                       <Link href="/spaces" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Radio className="h-6 w-6" /> Spaces
                      </Link>
                       <Link href="#" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Banknote className="h-6 w-6" /> Monetization
                      </Link>
                  </nav>
                  <div className="p-4 border-t">
                     <Link href="/grok" className="flex items-center gap-4 py-2 font-semibold rounded-md">
                        <Bot className="h-6 w-6" /> Open Grok
                      </Link>
                       <Link href="#" className="flex items-center gap-4 py-2 font-semibold rounded-md">
                        <Settings className="h-6 w-6" /> Settings and privacy
                      </Link>
                  </div>
              </SheetContent>
            </Sheet>
            <div className="flex-1 flex justify-center">
                <Bird className="h-6 w-6" />
            </div>
            <ThemeToggle />
        </div>
        <Tabs defaultValue="for-you" className="w-full">
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
              <TabsTrigger value="for-you" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">For you</TabsTrigger>
              <TabsTrigger value="following" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Following</TabsTrigger>
            </TabsList>
        </Tabs>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Tabs defaultValue="for-you" className="w-full">
          <TabsContent value="for-you" className="mt-0">
             {isLoading ? (
                 <div className="flow-root">
                    <ul className="divide-y divide-border">
                        <li className="p-4"><PostSkeleton /></li>
                        <li className="p-4"><PostSkeleton /></li>
                        <li className="p-4"><PostSkeleton /></li>
                    </ul>
                 </div>
             ) : (
                <div className="flow-root">
                    <ul className="divide-y divide-border">
                        {posts.map((post) => (
                            <li key={post.id} className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => handlePostClick(post.id)}>
                                <div className="flex gap-4">
                                    <Avatar>
                                    <AvatarImage src={post.avatar} alt={post.handle} />
                                    <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                                    </Avatar>
                                    <div className='w-full'>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">{post.author}</p>
                                        <p className="text-sm text-muted-foreground">{post.handle} · {post.time}</p>
                                    </div>
                                    <p className="mb-2">{post.content}</p>
                                    {post.image && <Image src={post.image} data-ai-hint={post.imageHint} width={500} height={300} alt="Post image" className="rounded-2xl border" />}
                                    <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle className="h-5 w-5 hover:text-primary transition-colors" />
                                            <span>{post.comments}</span>
                                        </div>
                                        <button onClick={() => handlePostAction(post.id, 'retweet')} className={`flex items-center gap-1 ${post.isRetweeted ? 'text-green-500' : ''}`}>
                                            <Repeat className="h-5 w-5 hover:text-green-500 transition-colors" />
                                            <span>{post.retweets.length}</span>
                                        </button>
                                        <button onClick={() => handlePostAction(post.id, 'like')} className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : ''}`}>
                                            <Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${post.isLiked ? 'fill-current' : ''}`} />
                                            <span>{post.likes.length}</span>
                                        </button>
                                         <div className="flex items-center gap-1">
                                        <BarChart2 className="h-5 w-5" />
                                        <span>{post.views}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                        <Upload className="h-5 w-5" />
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
             )}
          </TabsContent>
          <TabsContent value="following" className="mt-0">
            <div className="p-8 text-center text-muted-foreground">
                <h3 className="text-xl font-bold text-foreground">Be in the know</h3>
                <p className="mt-2">Following accounts is an easy way to keep up with conversations and topics that interest you.</p>
                <Button className="mt-4">Find people to follow</Button>
            </div>
          </TabsContent>
        </Tabs>
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
                         <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()}>
                            <ImageIcon className="h-6 w-6 text-primary" />
                         </Button>
                    </div>
                    <Button onClick={handleCreatePost} disabled={!newPostContent.trim()}>Post</Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>


      <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t">
        <nav className="flex justify-around items-center h-14">
            <Link href="/home" className="flex-1 flex justify-center items-center text-foreground">
              <Home className="h-7 w-7" />
            </Link>
            <Link href="/search" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Search className="h-7 w-7" />
            </Link>
            <Link href="#" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Repeat className="h-7 w-7" />
            </Link>
            <Link href="/notifications" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Bell className="h-7 w-7" />
            </Link>
            <Link href="/messages" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Mail className="h-7 w-7" />
            </Link>
        </nav>
      </footer>
    </div>
  );
}
