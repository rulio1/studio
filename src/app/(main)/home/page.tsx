
'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Bell, Home, Mail, Settings, User, Bird, X, Users, Bookmark, Bot, MoreHorizontal, LogOut, Loader2, HandHeart, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PostSkeleton from '@/components/post-skeleton';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs, limit, serverTimestamp, writeBatch, deleteDoc, increment, documentId, runTransaction } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle as EditDialogTitle, DialogTitle as OtherDialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/user-store';
import { useTranslation } from '@/hooks/use-translation';
import PostItem from '@/components/post-item';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';

const CreatePostModal = lazy(() => import('@/components/create-post-modal'));
const ImageViewer = lazy(() => import('@/components/image-viewer'));
const PostAnalyticsModal = lazy(() => import('@/components/post-analytics-modal'));
const SaveToCollectionModal = lazy(() => import('@/components/save-to-collection-modal'));

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
    gifUrl?: string;
    imageHint?: string;
    location?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    profileVisits?: number;
    isLiked: boolean;
    isRetweeted: boolean;
    createdAt: any;
    editedAt?: any;
    isUpdate?: boolean;
    communityId?: string;
    hashtags?: string[];
    mentions?: string[];
    repostedBy?: { name: string; handle: string; avatar: string };
    repostedAt?: any;
    isPinned?: boolean;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
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
    collections?: { id: string; name: string; postIds: string[]; }[];
    pinnedPostId?: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    notificationPreferences?: {
        [key: string]: boolean;
    };
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};
  
export default function HomePage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
  const { user, zisprUser, isLoading: isUserLoading, setUser: setAuthUser } = useUserStore();
  const [activeTab, setActiveTab] = useState('for-you');
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [postToQuote, setPostToQuote] = useState<Post | null>(null);
  const [postToView, setPostToView] = useState<Post | null>(null);
  const [analyticsPost, setAnalyticsPost] = useState<Post | null>(null);
  const [postToSave, setPostToSave] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();
  

 const fetchAllPosts = useCallback((currentUser: FirebaseUser) => {
    setIsLoading(true);

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.handle === '@stefanysouza') {
                data.isVerified = true;
                data.badgeTier = 'silver';
            }
            return {
                id: doc.id,
                ...data,
                isLiked: Array.isArray(data.likes) ? data.likes.includes(currentUser.uid) : false,
                isRetweeted: Array.isArray(data.retweets) ? data.retweets.includes(currentUser.uid) : false,
            } as Post;
        });
        setAllPosts(postsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching all posts:", error);
        setIsLoading(false);
    });

    return unsubscribe;
}, []);

useEffect(() => {
    if (user) {
        const unsubscribe = fetchAllPosts(user);
        return () => unsubscribe();
    } else {
        setAllPosts([]);
        setIsLoading(false);
    }
}, [user, fetchAllPosts]);

 const fetchFollowingPosts = useCallback((currentUser: FirebaseUser, currentUserData: ZisprUser) => {
    if (!currentUserData || currentUserData.following.length === 0) {
        setFollowingPosts([]);
        setIsLoadingFollowing(false);
        return () => {};
    }

    setIsLoadingFollowing(true);

    const followingIds = currentUserData.following;
    const feedUserIds = [...new Set([...followingIds, currentUser.uid])];

    const postsQuery = query(collection(db, "posts"), where("authorId", "in", feedUserIds));
    const repostsQuery = query(collection(db, "reposts"), where("userId", "in", followingIds));

    const unsubPosts = onSnapshot(postsQuery, async () => {
        // This is a bit inefficient, ideally we'd combine snapshots, but for simplicity...
        const postSnap = await getDocs(postsQuery);
        const repostSnap = await getDocs(repostsQuery);
        combinePostsAndReposts(postSnap, repostSnap);
    });

    const unsubReposts = onSnapshot(repostsQuery, async () => {
         const postSnap = await getDocs(postsQuery);
         const repostSnap = await getDocs(repostsQuery);
         combinePostsAndReposts(postSnap, repostSnap);
    });

    const combinePostsAndReposts = async (originalPostsSnapshot: any, repostsSnapshot: any) => {
        const originalPosts = originalPostsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Post));

        const repostsData = repostsSnapshot.docs.map((doc: any) => doc.data());
        const repostedPostIds = [...new Set(repostsData.map((repost: any) => repost.postId))];

        let repostedPosts: Post[] = [];
        if (repostedPostIds.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < repostedPostIds.length; i += 30) {
                chunks.push(repostedPostIds.slice(i, i + 30));
            }

            const followingUsersSnapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', followingIds)));
            const followingUsersMap = new Map(followingUsersSnapshot.docs.map(doc => [doc.id, doc.data()]));

            const repostedPostsSnapshots = await Promise.all(chunks.map(chunk => getDocs(query(collection(db, "posts"), where(documentId(), "in", chunk)))));
            const postsMap = new Map<string, Post>();
            repostedPostsSnapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => postsMap.set(doc.id, { id: doc.id, ...doc.data() } as Post));
            });
            
            repostedPosts = repostsData.map((repost: any) => {
                const postData = postsMap.get(repost.postId);
                const reposterData = followingUsersMap.get(repost.userId);
                if (!postData || !reposterData) return null;
                return {
                    ...postData,
                    repostedAt: repost.repostedAt,
                    repostedBy: {
                        name: reposterData.displayName,
                        handle: reposterData.handle,
                        avatar: reposterData.avatar,
                    },
                };
            }).filter((p: any): p is Post => p !== null);
        }

        const allPosts = [...originalPosts, ...repostedPosts];
        allPosts.sort((a, b) => {
            const timeA = a.repostedAt?.toMillis() || a.createdAt?.toMillis() || 0;
            const timeB = b.repostedAt?.toMillis() || b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });

        const finalPosts = allPosts.map(post => {
             if (post.handle === '@stefanysouza') {
                post.isVerified = true;
                post.badgeTier = 'silver';
            }
            return {
            ...post,
            isLiked: (Array.isArray(post.likes) ? post.likes : []).includes(currentUser.uid),
            isRetweeted: (Array.isArray(post.retweets) ? post.retweets : []).includes(currentUser.uid),
            }
        });

        setFollowingPosts(finalPosts);
        setIsLoadingFollowing(false);
    }


    return () => {
        unsubPosts();
        unsubReposts();
    };
}, []);

  useEffect(() => {
    if (user && zisprUser && activeTab === 'following') {
        const unsubscribe = fetchFollowingPosts(user, zisprUser);
        return () => unsubscribe();
    } else if (activeTab === 'following') {
        setFollowingPosts([]);
        setIsLoadingFollowing(false);
    }
  }, [activeTab, fetchFollowingPosts, zisprUser, user]);

    const handlePostAction = useCallback(async (postId: string, action: 'like' | 'retweet', authorId: string) => {
        if (!user || !zisprUser) return;

        const postRef = doc(db, 'posts', postId);
        const post = allPosts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
        if (!post) return;

        const isActioned = action === 'like' ? post.isLiked : post.retweets.includes(user.uid);

        // Firebase update
        try {
            const batch = writeBatch(db);

            if (isActioned) {
                const field = action === 'like' ? 'likes' : 'retweets';
                batch.update(postRef, { [field]: arrayRemove(user.uid) });

                if (action === 'retweet') {
                    const repostQuery = query(collection(db, 'reposts'), where('userId', '==', user.uid), where('postId', '==', postId));
                    const repostSnapshot = await getDocs(repostQuery);
                    repostSnapshot.forEach(doc => batch.delete(doc.ref));
                }
            } else {
                const field = action === 'like' ? 'likes' : 'retweets';
                batch.update(postRef, { [field]: arrayUnion(user.uid) });

                if (action === 'retweet') {
                    const repostRef = doc(collection(db, 'reposts'));
                    batch.set(repostRef, {
                        userId: user.uid,
                        postId: postId,
                        originalPostAuthorId: authorId,
                        repostedAt: serverTimestamp()
                    });
                }

                if (user.uid !== authorId) {
                    const authorDoc = await getDoc(doc(db, 'users', authorId));
                    if (authorDoc.exists()) {
                        const authorData = authorDoc.data();
                        const prefs = authorData.notificationPreferences;
                        const canSendNotification = !prefs || prefs[action] !== false;

                        if (canSendNotification) {
                            const notificationRef = doc(collection(db, 'notifications'));
                            batch.set(notificationRef, {
                                toUserId: authorId,
                                fromUserId: user.uid,
                                fromUser: {
                                    name: zisprUser.displayName,
                                    handle: zisprUser.handle,
                                    avatar: zisprUser.avatar,
                                    isVerified: zisprUser.isVerified || false,
                                },
                                type: action,
                                text: `curtiu seu post`,
                                postContent: post.content.substring(0, 50),
                                postId: post.id,
                                createdAt: serverTimestamp(),
                                read: false,
                            });
                        }
                    }
                }
            }
            await batch.commit();
        } catch (error) {
            console.error(`Error ${action === 'like' ? 'liking' : 'retweeting'} post:`, error);
            toast({
                title: "Erro",
                description: "Não foi possível completar a ação. Tente novamente.",
                variant: "destructive"
            });
        }
    }, [user, zisprUser, allPosts, followingPosts, toast]);

    const handleQuoteClick = useCallback((post: Post) => {
        setPostToQuote(post);
        setIsQuoteModalOpen(true);
    }, []);

 const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
        await deleteDoc(doc(db, "posts", postToDelete));
        toast({
            title: "Post apagado",
            description: "Seu post foi removido.",
        });
    } catch (error) {
        console.error("Erro ao apagar o post: ", error);
        toast({
            title: "Erro",
            description: "Não foi possível apagar o post. Tente novamente.",
            variant: "destructive",
        });
    } finally {
        setPostToDelete(null);
    }
  };

  const handleEditClick = useCallback((post: Post) => {
    setEditingPost(post);
    setEditedContent(post.content);
  }, []);

    const extractHashtags = (content: string) => {
        const regex = /#(\w+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
    };

    const extractMentions = (content: string) => {
        const regex = /@(\w+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        return [...new Set(matches)]; // Returns handles like '@username'
    };

    const handleUpdatePost = async () => {
      if (!editingPost || !editedContent.trim() || !user) return;
      setIsUpdating(true);
      const hashtags = extractHashtags(editedContent);
      const mentionedHandles = extractMentions(editedContent);
      
      try {
          const batch = writeBatch(db);
          const postRef = doc(db, "posts", editingPost.id);
          batch.update(postRef, {
              content: editedContent,
              hashtags: hashtags,
              editedAt: serverTimestamp()
          });

          if (mentionedHandles.length > 0) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("handle", "in", mentionedHandles));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(userDoc => {
                const mentionedUserId = userDoc.id;
                if (mentionedUserId !== user.uid) { // Don't notify for self-mention
                    const notificationRef = doc(collection(db, 'notifications'));
                    batch.set(notificationRef, {
                        toUserId: mentionedUserId,
                        fromUserId: user.uid,
                        fromUser: {
                            name: zisprUser?.displayName,
                            handle: zisprUser?.handle,
                            avatar: zisprUser?.avatar,
                            isVerified: zisprUser?.isVerified || false,
                        },
                        type: 'mention',
                        text: `mencionou você em um post:`,
                        postContent: editedContent.substring(0, 50),
                        postId: editingPost.id,
                        createdAt: serverTimestamp(),
                        read: false,
                    });
                }
            });
        }

          await batch.commit();
          setEditingPost(null);
          setEditedContent("");
          toast({
              title: "Post atualizado",
              description: "Seu post foi atualizado com sucesso.",
          });
      } catch (error) {
          console.error("Erro ao atualizar o post:", error);
          toast({
              title: "Erro",
              description: "Não foi possível atualizar o post.",
              variant: "destructive",
          });
      } finally {
          setIsUpdating(false);
      }
  };
  
  const handleTogglePinPost = useCallback(async (postId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const isPinned = zisprUser?.pinnedPostId === postId;

    try {
        await updateDoc(userRef, {
            pinnedPostId: isPinned ? null : postId
        });
        toast({ title: isPinned ? 'Post desafixado do perfil!' : 'Post fixado no seu perfil!' });
    } catch (error) {
        console.error("Error pinning post:", error);
        toast({ title: 'Erro ao fixar post', variant: 'destructive' });
    }
  }, [user, zisprUser, toast]);


  const handleSignOut = async () => {
    try {
        await signOut(auth);
        setAuthUser(null, null);
        window.location.href = '/login';
    } catch (error) {
        toast({ title: t('toasts.signOutError.title'), variant: 'destructive' });
    }
  };
    

    const handleVote = useCallback(async (postId: string, optionIndex: number) => {
        if (!user) return;
        const postRef = doc(db, 'posts', postId);
    
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Post não existe!";
                }
    
                const postData = postDoc.data() as Post;
                const poll = postData.poll;
    
                if (!poll) {
                    throw "Enquete não existe neste post.";
                }
    
                // Se o usuário já votou, não faz nada
                if (poll.voters && poll.voters[user.uid] !== undefined) {
                    toast({
                        title: "Você já votou nesta enquete.",
                        variant: "destructive"
                    });
                    return;
                }
    
                const newVotes = [...poll.votes];
                newVotes[optionIndex] += 1;
    
                const newVoters = { ...poll.voters, [user.uid]: optionIndex };
    
                transaction.update(postRef, {
                    'poll.votes': newVotes,
                    'poll.voters': newVoters
                });
            });
        } catch (error) {
            console.error("Erro ao votar:", error);
            toast({
                title: "Erro ao votar",
                description: "Não foi possível registrar seu voto. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [user, toast]);

  
  const PostList = ({ posts, loading, tab }: { posts: Post[], loading: boolean, tab: 'for-you' | 'following' }) => {
    if (loading) {
        return (
            <ul className="divide-y divide-border">
                {[...Array(5)].map((_, i) => <li key={i} className="p-4"><PostSkeleton /></li>)}
            </ul>
        );
    }

    if (posts.length === 0) {
        if (tab === 'following') {
            return (
                <div className="p-8 text-center text-muted-foreground border-t">
                    <h3 className="text-xl font-bold text-foreground">{t('home.postList.emptyFollowing.title')}</h3>
                    <p className="mt-2 mb-4">{t('home.postList.emptyFollowing.description')}</p>
                    <Button onClick={() => router.push('/search?tab=new-users')}>{t('home.postList.emptyFollowing.button')}</Button>
                </div>
            )
        }
        return (
             <div className="p-8 text-center text-muted-foreground border-t">
                <h3 className="text-xl font-bold text-foreground">{t('home.postList.empty.title')}</h3>
                <p className="mt-2">{t('home.postList.empty.description')}</p>
            </div>
        )
    }

    return (
        <ul className="divide-y divide-border">
            {posts.map((post) => (
                <PostItem 
                    key={`${post.id}-${post.repostedAt?.toMillis() || ''}`} 
                    post={post}
                    zisprUser={zisprUser}
                    user={user}
                    handlePostAction={handlePostAction}
                    handleQuoteClick={handleQuoteClick}
                    handleDeleteClick={setPostToDelete}
                    handleEditClick={handleEditClick}
                    handleTogglePinPost={handleTogglePinPost}
                    onVote={handleVote}
                    onImageClick={setPostToView}
                    onAnalyticsClick={setAnalyticsPost}
                    onSaveClick={setPostToSave}
                 />
            ))}
        </ul>
    );
  };


  if (isUserLoading || !user || !zisprUser) {
      return (
        <div className="flex flex-col h-screen bg-background relative animate-fade-in">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Bird className="h-6 w-6 text-primary" />
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
  
    const isZisprAccount = zisprUser.handle === '@Zispr' || zisprUser.handle === '@ZisprUSA';
    const isZisprUserVerified = zisprUser.isVerified || zisprUser.handle === '@Rulio';
    const isRulioAccount = zisprUser.handle === '@Rulio';
    const zisprUserBadgeColor = zisprUser.badgeTier ? badgeColors[zisprUser.badgeTier] : 'text-primary';

    const navItems = [
        { href: '/home', icon: Home, label: t('sidebar.home') },
        { href: '/notifications', icon: Bell, label: t('sidebar.notifications') },
        { href: '/messages', icon: Mail, label: t('sidebar.messages') },
        { href: '/news', icon: Radio, label: t('sidebar.news') },
        { href: '/saved', icon: Bookmark, label: t('sidebar.saved') },
        { href: `/profile/${zisprUser.uid}`, icon: User, label: t('sidebar.profile') },
    ];


  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
              <div className="flex items-center justify-between px-4 py-2">
                  <Sheet>
                    <SheetTrigger asChild className="md:hidden">
                      <Avatar className="h-8 w-8 cursor-pointer">
                        <AvatarImage src={zisprUser.avatar} alt={zisprUser.handle} />
                        <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                      </Avatar>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0 flex flex-col bg-background">
                       <OtherDialogTitle className="sr-only">Menu Principal</OtherDialogTitle>
                       <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                       </SheetClose>
                       <div className="p-4 border-b">
                          <div className="flex justify-between items-center mb-4">
                               <Avatar className="h-10 w-10 cursor-pointer" onClick={() => router.push(`/profile/${zisprUser.uid}`)}>
                                  <AvatarImage src={zisprUser.avatar} alt={zisprUser.handle} />
                                  <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                              </Avatar>
                          </div>
                           <Link href={`/profile/${zisprUser.uid}`} className="cursor-pointer">
                              <div className="flex items-center gap-1 font-bold text-lg">
                                  {zisprUser.displayName}
                                  {isZisprAccount ? <Bird className="h-5 w-5 text-primary" /> : (isZisprUserVerified && <BadgeCheck className={'h-6 w-6 ' + (isRulioAccount ? 'text-white fill-primary' : zisprUserBadgeColor)} />)}
                              </div>
                              <p className="text-sm text-muted-foreground">{zisprUser.handle}</p>
                          </Link>
                          <div className="flex gap-4 mt-2 text-sm">
                              <p><span className="font-bold">{zisprUser.following?.length || 0}</span> <span className="text-muted-foreground">{t('profile.stats.following')}</span></p>
                              <p><span className="font-bold">{zisprUser.followers?.length || 0}</span> <span className="text-muted-foreground">{t('profile.stats.followers')}</span></p>
                          </div>
                      </div>
                       <nav className="flex-1 flex flex-col gap-2 p-4">
                          {navItems.map((item) => (
                              <SheetClose asChild key={item.label}>
                                  <Link href={item.href} className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                                      <item.icon className="h-6 w-6" /> {item.label}
                                  </Link>
                              </SheetClose>
                          ))}
                          <SheetClose asChild>
                              <Link href="/supporter" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                                  <HandHeart className="h-6 w-6" /> {t('supporter.title')}
                              </Link>
                          </SheetClose>
                        </nav>
                        <div className="p-4 border-t mt-auto flex flex-col gap-2">
                          <SheetClose asChild>
                            <Link href="/chat" className="flex items-center gap-4 py-2 font-semibold rounded-md">
                              <Bot className="h-6 w-6" /> Zispr AI
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                             <Link href="/settings" className="flex items-center gap-4 py-2 font-semibold rounded-md">
                              <Settings className="h-6 w-6" /> {t('sidebar.settings')}
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                              <Button variant="destructive" className="self-center" onClick={handleSignOut}>
                                  <LogOut className="h-6 w-6" />
                                  Sair
                              </Button>
                          </SheetClose>
                        </div>
                    </SheetContent>
                  </Sheet>
                  <div className="flex-1 flex justify-center">
                      <Bird className="h-6 w-6 text-primary" />
                  </div>
                  <div className="w-8 md:w-auto" />
              </div>
              <div className="w-full flex justify-center p-2">
                  <TabsList className="relative grid w-full grid-cols-2 p-1 bg-muted/50 rounded-full h-11">
                      <TabsTrigger value="for-you" className="relative z-10 rounded-full text-base">{t('home.tabs.forYou')}</TabsTrigger>
                      <TabsTrigger value="following" className="relative z-10 rounded-full text-base">{t('home.tabs.following')}</TabsTrigger>
                      <motion.div
                          layoutId="active-tab-indicator"
                          className="absolute inset-0 h-full p-1"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          style={{
                              left: activeTab === 'for-you' ? '0%' : '50%',
                              right: activeTab === 'for-you' ? '50%' : '0%',
                          }}
                      >
                          <div className="w-full h-full bg-background rounded-full shadow-md"></div>
                      </motion.div>
                  </TabsList>
              </div>
          </header>

          <TabsContent value="for-you" forceMount={true} className={'mt-0 ' + (activeTab !== 'for-you' ? 'hidden' : '')}>
              <PostList posts={allPosts} loading={isLoading} tab="for-you" />
          </TabsContent>
          <TabsContent value="following" forceMount={true} className={'mt-0 ' + (activeTab !== 'following' ? 'hidden' : '')}>
              <PostList posts={followingPosts} loading={isLoadingFollowing} tab="following" />
          </TabsContent>
      </Tabs>

      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente
                    o seu post de nossos servidores.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPostToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">Continuar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
            <DialogContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                <DialogHeader>
                    <EditDialogTitle>Editar Post</EditDialogTitle>
                </DialogHeader>
                <Textarea 
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={5}
                    className="my-4"
                />
                <Button onClick={handleUpdatePost} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </DialogContent>
        </Dialog>
        <Suspense>
            {isQuoteModalOpen && <CreatePostModal 
                open={isQuoteModalOpen}
                onOpenChange={setIsQuoteModalOpen}
                quotedPost={postToQuote}
            />}
            {postToView && <ImageViewer post={postToView} onOpenChange={() => setPostToView(null)} />}
            {analyticsPost && <PostAnalyticsModal post={analyticsPost} onOpenChange={() => setAnalyticsPost(null)} />}
             {postToSave && user && (
                <SaveToCollectionModal
                    open={!!postToSave}
                    onOpenChange={(open) => !open && setPostToSave(null)}
                    postId={postToSave}
                    currentUser={user}
                />
            )}
        </Suspense>
    </>
  );
}
