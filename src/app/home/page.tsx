
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Bell, Home, Mail, MessageCircle, Search, Settings, User, Repeat, Heart, BarChart2, Upload, Bird, X, MessageSquare, Users, Bookmark, Briefcase, List, Radio, Banknote, Bot, MoreHorizontal, Sun, Moon, Plus, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import PostSkeleton from '@/components/post-skeleton';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs, limit, serverTimestamp, writeBatch } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePost } from '@/ai/flows/post-generator-flow';


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
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
  const [activeTab, setActiveTab] = useState('for-you');

  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUser(user);
            const userDocRef = doc(db, "users", user.uid);
            const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                 if(doc.exists()){
                    setChirpUser(doc.data() as ChirpUser);
                }
            });
            return () => unsubscribeUser();
        } else {
            router.push('/login');
        }
    });

    return () => {
        unsubscribeAuth();
    };
  }, [router]);

  // Fetch all posts for "For you" tab
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribePosts = onSnapshot(q, async (snapshot) => {
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

        // Add Chirp AI post
        try {
            const aiPostContent = await generatePost("a surprising fact about the universe");
            const aiPost: Post = {
                id: 'chirp-ai-post-of-the-day',
                authorId: 'chirp-ai',
                author: 'Chirp AI',
                handle: '@chirp-ai',
                avatar: '', // Will be rendered as fallback
                avatarFallback: 'AI',
                content: aiPostContent,
                time: 'Just now',
                comments: 42,
                retweets: [],
                likes: [],
                views: 1337,
                isLiked: false,
                isRetweeted: false,
            };
            setAllPosts([aiPost, ...postsData]);
        } catch (error) {
            console.error("Failed to generate AI post", error);
            setAllPosts(postsData);
        }
        
        setIsLoading(false);
    });

    return () => unsubscribePosts();
  }, []);

  // Fetch posts for "Following" tab
  const fetchFollowingPosts = useCallback(async () => {
    if (!chirpUser || chirpUser.following.length === 0) {
        setFollowingPosts([]);
        setIsLoadingFollowing(false);
        return;
    }
    
    setIsLoadingFollowing(true);
    const postsQuery = query(
        collection(db, "posts"), 
        where("authorId", "in", chirpUser.following),
        orderBy("createdAt", "desc"),
        limit(50)
    );
    const snapshot = await getDocs(postsQuery);
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
    setFollowingPosts(postsData);
    setIsLoadingFollowing(false);
  }, [chirpUser]);

  useEffect(() => {
    if (activeTab === 'following') {
        fetchFollowingPosts();
    }
  }, [activeTab, fetchFollowingPosts]);

  const handlePostAction = async (postId: string, action: 'like' | 'retweet') => {
    if (!user) return;

    if (postId === 'chirp-ai-post-of-the-day') {
        // Handle AI post interaction locally
        const updatePosts = (posts: Post[]) => posts.map(p => {
            if (p.id === postId) {
                const isActioned = action === 'like' ? p.isLiked : p.isRetweeted;
                const field = action === 'like' ? 'likes' : 'retweets';
                const newCount = isActioned ? p[field].length - 1 : p[field].length + 1;

                // This is a dummy update, it won't persist
                const newFieldArray = isActioned ? [] : [user.uid];

                return {
                    ...p,
                    [field]: newFieldArray,
                    isLiked: action === 'like' ? !isActioned : p.isLiked,
                    isRetweeted: action === 'retweet' ? !isActioned : p.isRetweeted,
                };
            }
            return p;
        });
        setAllPosts(updatePosts(allPosts));
        return;
    }
      
    const postRef = doc(db, "posts", postId);
    const postToUpdate = allPosts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
    if (!postToUpdate) return;

    const field = action === 'like' ? 'likes' : 'retweets';
    const isActioned = action === 'like' ? postToUpdate.isLiked : postToUpdate.isRetweeted;

    if (isActioned) {
        await updateDoc(postRef, { [field]: arrayRemove(user.uid) });
    } else {
        await updateDoc(postRef, { [field]: arrayUnion(user.uid) });
    }
};

  
  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handlePostClick = (postId: string) => {
    if (postId === 'chirp-ai-post-of-the-day') return;
    router.push(`/post/${postId}`);
  };
  
  const PostList = ({ posts, loading }: { posts: Post[], loading: boolean }) => {
    if (loading) {
        return (
            <ul className="divide-y divide-border">
                {[...Array(5)].map((_, i) => <li key={i} className="p-4"><PostSkeleton /></li>)}
            </ul>
        );
    }
    
    if (posts.length === 0) {
        return (
             <div className="p-8 text-center text-muted-foreground">
                <h3 className="text-xl font-bold text-foreground">Nothing to see here... yet</h3>
                <p className="mt-2">When posts are made, they'll show up here.</p>
            </div>
        )
    }

    return (
        <ul className="divide-y divide-border">
            {posts.map((post) => (
                <li key={post.id} className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => handlePostClick(post.id)}>
                    <div className="flex gap-4">
                        <Avatar className="cursor-pointer" onClick={(e) => { e.stopPropagation(); if (post.authorId !== 'chirp-ai') router.push(`/profile/${post.authorId}`)}}>
                            {post.authorId === 'chirp-ai' ? (
                                <AvatarFallback className="bg-primary text-primary-foreground"><Bird /></AvatarFallback>
                            ) : (
                                <>
                                    <AvatarImage src={post.avatar} alt={post.handle} />
                                    <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                                </>
                            )}
                        </Avatar>
                        <div className='w-full'>
                        <div className="flex items-center gap-2">
                            <p className="font-bold">{post.author}</p>
                            {post.authorId === 'chirp-ai' && <Badge variant="default" className="bg-primary text-primary-foreground">AI</Badge>}
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
    );
  };


  if (isLoading || !user || !chirpUser) {
      return (
        <div className="flex flex-col h-screen bg-background relative animate-fade-in">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Bird className="h-6 w-6" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
             </header>
             <main className="flex-1 overflow-y-auto">
                 <ul className="divide-y divide-border">
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                </ul>
             </main>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-background relative animate-fade-in">
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
                    <Avatar className="h-10 w-10" onClick={() => router.push(`/profile/${user.uid}`)}>
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
                      <Link href={`/profile/${user.uid}`} className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <User className="h-6 w-6" /> Profile
                      </Link>
                       <Link href="#" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <X className="h-6 w-6" /> Premium
                      </Link>
                       <Link href="/chat" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
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
                     <Link href="/chat" className="flex items-center gap-4 py-2 font-semibold rounded-md">
                        <Bot className="h-6 w-6" /> Open Chirp AI
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
        <Tabs defaultValue="for-you" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
              <TabsTrigger value="for-you" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">For you</TabsTrigger>
              <TabsTrigger value="following" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Following</TabsTrigger>
            </TabsList>
            <TabsContent value="for-you" className="mt-0">
                <PostList posts={allPosts} loading={isLoading} />
            </TabsContent>
            <TabsContent value="following" className="mt-0">
                <PostList posts={followingPosts} loading={isLoadingFollowing} />
            </TabsContent>
        </Tabs>
      </header>
    </div>
  );
}

    