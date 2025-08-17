
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Bell, Home, Mail, MessageCircle, Search, Settings, User, Repeat, Heart, BarChart2, Bird, X, MessageSquare, Users, Bookmark, Briefcase, List, Radio, Banknote, Bot, MoreHorizontal, Sun, Moon, Plus, Loader2, Trash2, Edit, Save, BadgeCheck, LogOut, Pin, Sparkles, Frown, BarChart3, Flag, Megaphone, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import PostSkeleton from '@/components/post-skeleton';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs, limit, serverTimestamp, writeBatch, deleteDoc, increment, documentId, Timestamp } from 'firebase/firestore';
import { formatTimeAgo } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePost } from '@/ai/flows/post-generator-flow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle as EditDialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { dataURItoFile } from '@/lib/utils';
import { DialogTitle } from '@radix-ui/react-dialog';


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
    createdAt: any;
    editedAt?: any;
    communityId?: string;
    hashtags?: string[];
    repostedBy?: { name: string; handle: string; avatar: string };
    repostedAt?: any;
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
    savedPosts?: string[];
    pinnedPostId?: string;
}

export default function HomePage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
  const [activeTab, setActiveTab] = useState('for-you');
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUser(user);
            const userDocRef = doc(db, "users", user.uid);
            const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                 if(doc.exists()){
                    setChirpUser({ uid: doc.id, ...doc.data() } as ChirpUser);
                } else {
                    router.push('/login');
                }
            });
            return () => unsubscribeUser();
        } else {
            router.push('/login');
        }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const fetchAllPosts = useCallback(() => {
    if (!user) return;
    setIsLoading(true);

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            isLiked: doc.data().likes.includes(user.uid || ''),
            isRetweeted: doc.data().retweets.includes(user.uid || ''),
        } as Post));
        setAllPosts(postsData);
        setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (user) {
        const unsubscribe = fetchAllPosts();
        return () => unsubscribe();
    }
  }, [user, fetchAllPosts]);

 const fetchFollowingPosts = useCallback(() => {
    if (!chirpUser || !user || chirpUser.following.length === 0) {
        setFollowingPosts([]);
        setIsLoadingFollowing(false);
        return;
    }
    
    setIsLoadingFollowing(true);

    const followingIds = chirpUser.following;
    const feedUserIds = [...new Set([...followingIds, user.uid])];

    const q = query(collection(db, "posts"), where("authorId", "in", feedUserIds), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            isLiked: doc.data().likes.includes(user.uid || ''),
            isRetweeted: doc.data().retweets.includes(user.uid || ''),
        } as Post));
        setFollowingPosts(postsData);
        setIsLoadingFollowing(false);
    });

    return unsubscribe;
}, [chirpUser, user]);

  useEffect(() => {
    if (activeTab === 'following' && chirpUser) {
        const unsubscribe = fetchFollowingPosts();
        return () => unsubscribe();
    }
  }, [activeTab, fetchFollowingPosts, chirpUser]);

    const handlePostAction = async (postId: string, action: 'like' | 'retweet', authorId: string) => {
        if (!user || !chirpUser) return;
    
        const postRef = doc(db, 'posts', postId);
        const post = allPosts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
        if (!post) return;
    
        const isActioned = action === 'like' ? post.isLiked : post.retweets.includes(user.uid);
    
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
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    toUserId: authorId,
                    fromUserId: user.uid,
                    fromUser: {
                        name: chirpUser.displayName,
                        handle: chirpUser.handle,
                        avatar: chirpUser.avatar,
                    },
                    type: action,
                    text: action === 'like' ? 'curtiu seu post' : 'repostou seu post',
                    postContent: post.content.substring(0, 50),
                    postId: post.id,
                    createdAt: serverTimestamp(),
                    read: false,
                });
            }
        }
        await batch.commit();
    };

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

  const handleEditClick = (post: Post) => {
    setEditingPost(post);
    setEditedContent(post.content);
  };

    const extractHashtags = (content: string) => {
        const regex = /#([a-zA-Z0-9_]+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
    };

  const handleUpdatePost = async () => {
    if (!editingPost || !editedContent.trim()) return;
    setIsUpdating(true);
    const hashtags = extractHashtags(editedContent);
    try {
        const postRef = doc(db, "posts", editingPost.id);
        await updateDoc(postRef, {
            content: editedContent,
            hashtags: hashtags,
            editedAt: serverTimestamp()
        });
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
  
  const handleSavePost = async (postId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const isSaved = chirpUser?.savedPosts?.includes(postId);

    if (isSaved) {
        await updateDoc(userRef, { savedPosts: arrayRemove(postId) });
        toast({ title: 'Post removido dos salvos' });
    } else {
        await updateDoc(userRef, { savedPosts: arrayUnion(postId) });
        toast({ title: 'Post salvo!' });
    }
  };
  
  const handleTogglePinPost = async (postId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const isPinned = chirpUser?.pinnedPostId === postId;

    try {
        await updateDoc(userRef, {
            pinnedPostId: isPinned ? null : postId
        });
        toast({ title: isPinned ? 'Post desafixado do perfil!' : 'Post fixado no perfil!' });
    } catch (error) {
        console.error("Error pinning post:", error);
        toast({ title: 'Erro ao fixar post', variant: 'destructive' });
    }
  };


  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

    const PostContent = ({ content }: { content: string }) => {
        const parts = content.split(/(#\w+)/g);
        return (
            <p>
                {parts.map((part, index) => {
                    if (part.startsWith('#')) {
                        const hashtag = part.substring(1);
                        return (
                            <a 
                                key={index} 
                                className="text-primary hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/search?q=%23${hashtag}`);
                                }}
                            >
                                {part}
                            </a>
                        );
                    }
                    return part;
                })}
            </p>
        );
    };

  const PostItem = ({ post }: { post: Post }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    const isOfficialAccount = post.handle.toLowerCase() === '@chirp' || post.handle.toLowerCase() === '@rulio';

    useEffect(() => {
      const timestamp = post.repostedAt || post.createdAt;
      if (timestamp) {
        try {
            const date = timestamp.toDate();
            setTime(formatTimeAgo(date));
        } catch(e) {
            setTime('agora');
        }
      }
    }, [post.createdAt, post.repostedAt]);

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => handlePostClick(post.id)}>
             {post.repostedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-6">
                    <Repeat className="h-4 w-4" />
                    <span>{post.repostedBy.handle === chirpUser?.handle ? 'Você' : post.repostedBy.name} repostou</span>
                </div>
            )}
            <div className="flex gap-4">
                <Avatar className="cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                    <AvatarImage src={post.avatar} alt={post.handle} />
                    <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                </Avatar>
                <div className='w-full'>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <p className="font-bold text-base flex items-center gap-1">
                            {post.author} 
                            {isOfficialAccount && <BadgeCheck className="h-4 w-4 text-primary" />}
                            {isOfficialAccount && <Bird className="h-4 w-4 text-primary" />}
                        </p>
                        <p className="text-muted-foreground">{post.handle} · {time}</p>
                        {post.editedAt && <p className="text-xs text-muted-foreground">(editado)</p>}
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            {user?.uid === post.authorId ? (
                                <>
                                    <DropdownMenuItem onClick={() => setPostToDelete(post.id)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        Apagar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditClick(post)}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleTogglePinPost(post.id)}>
                                        <Pin className="mr-2 h-4 w-4"/>
                                        {chirpUser?.pinnedPostId === post.id ? 'Desafixar do perfil' : 'Fixar no seu perfil'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'A capacidade de adicionar posts aos destaques será adicionada em breve.'})}>
                                        <Sparkles className="mr-2 h-4 w-4"/>
                                        Adicionar aos Destaques
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={() => handleSavePost(post.id)}>
                                        <Save className="mr-2 h-4 w-4"/>
                                        {chirpUser?.savedPosts?.includes(post.id) ? 'Remover dos Salvos' : 'Salvar'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'Esta funcionalidade será adicionada em breve.'})}>
                                        <Frown className="mr-2 h-4 w-4"/>
                                        Não tenho interesse
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'Esta funcionalidade será adicionada em breve.'})}>
                                        <Flag className="mr-2 h-4 w-4"/>
                                        Denunciar post
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'Esta funcionalidade será adicionada em breve.'})}>
                                        <BarChart3 className="mr-2 h-4 w-4"/>
                                        Ver interações
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'Esta funcionalidade será adicionada em breve.'})}>
                                        <Megaphone className="mr-2 h-4 w-4"/>
                                        Nota da comunidade
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push(`/profile/${post.authorId}`)}>
                                        <UserRound className="mr-2 h-4 w-4"/>
                                        Ir para perfil de {post.handle}
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="mb-2 whitespace-pre-wrap">
                    <PostContent content={post.content} />
                </div>
                {post.image && (
                    <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-2xl border">
                        <Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint={post.imageHint} />
                    </div>
                )}
                <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                        <MessageCircle className="h-5 w-5 hover:text-primary transition-colors" />
                        <span>{post.comments}</span>
                    </div>
                    <button onClick={() => handlePostAction(post.id, 'retweet', post.authorId)} className={`flex items-center gap-1 ${post.retweets.includes(user?.uid || '') ? 'text-green-500' : ''}`}>
                        <Repeat className="h-5 w-5 hover:text-green-500 transition-colors" />
                        <span>{post.retweets.length}</span>
                    </button>
                    <button onClick={() => handlePostAction(post.id, 'like', post.authorId)} className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : ''}`}>
                        <Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${post.isLiked ? 'fill-current' : ''}`} />
                        <span>{post.likes.length}</span>
                    </button>
                        <div className="flex items-center gap-1">
                    <BarChart2 className="h-5 w-5" />
                    <span>{post.views}</span>
                    </div>
                </div>
                </div>
            </div>
        </li>
    );
};
  
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
                    <h3 className="text-xl font-bold text-foreground">Sua timeline está um pouco vazia...</h3>
                    <p className="mt-2 mb-4">Encontre pessoas para seguir e veja os posts delas aqui!</p>
                    <Button onClick={() => router.push('/search')}>Encontrar Pessoas</Button>
                </div>
            )
        }
        return (
             <div className="p-8 text-center text-muted-foreground border-t">
                <h3 className="text-xl font-bold text-foreground">Nada para ver aqui... ainda</h3>
                <p className="mt-2">Quando posts forem feitos, eles aparecerão aqui.</p>
            </div>
        )
    }

    return (
        <ul className="divide-y divide-border">
            {posts.map((post) => (
               <PostItem key={`${post.id}-${post.repostedAt?.toMillis() || ''}`} post={post} />
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
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Sheet>
              <SheetTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={chirpUser.avatar} alt={chirpUser.handle} />
                  <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                </Avatar>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 flex flex-col">
                 <DialogTitle className="sr-only">Menu Principal</DialogTitle>
                 <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                 </SheetClose>
                 <div className="p-4 border-b">
                    <div className="flex justify-between items-center mb-4">
                         <Avatar className="h-10 w-10 cursor-pointer" onClick={() => router.push(`/profile/${user.uid}`)}>
                            <AvatarImage src={chirpUser.avatar} alt={chirpUser.handle} />
                            <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1 font-bold text-lg">
                            {chirpUser.displayName}
                            {chirpUser.handle.toLowerCase() === '@rulio' && <BadgeCheck className="h-5 w-5 text-primary" />}
                            {chirpUser.handle.toLowerCase() === '@rulio' && <Bird className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{chirpUser.handle}</p>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                        <p><span className="font-bold">{chirpUser.following?.length || 0}</span> <span className="text-muted-foreground">Seguindo</span></p>
                        <p><span className="font-bold">{chirpUser.followers?.length || 0}</span> <span className="text-muted-foreground">Seguidores</span></p>
                    </div>
                </div>
                 <nav className="flex-1 flex flex-col gap-2 p-4">
                    <SheetClose asChild>
                      <Link href={`/profile/${user.uid}`} className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <User className="h-6 w-6" /> Perfil
                      </Link>
                    </SheetClose>
                     <SheetClose asChild>
                      <Link href="/communities" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Users className="h-6 w-6" /> Comunidades
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                       <Link href="/saved" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Bookmark className="h-6 w-6" /> Itens Salvos
                      </Link>
                    </SheetClose>
                     <SheetClose asChild>
                        <div className="flex items-center gap-4 py-2 text-xl font-bold rounded-md text-muted-foreground cursor-not-allowed">
                            <Radio className="h-6 w-6" /> Spaces <Badge variant="secondary" className="ml-auto">em breve</Badge>
                        </div>
                    </SheetClose>
                  </nav>
                  <div className="p-4 border-t mt-auto flex flex-col gap-2">
                    <SheetClose asChild>
                      <Link href="/chat" className="flex items-center gap-4 py-2 font-semibold rounded-md">
                        <Bot className="h-6 w-6" /> Chirp AI
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                       <Link href="/settings" className="flex items-center gap-4 py-2 font-semibold rounded-md">
                        <Settings className="h-6 w-6" /> Configurações e privacidade
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
                <Bird className="h-6 w-6" />
            </div>
            <ThemeToggle />
        </div>
      </header>
       <main className="flex-1 overflow-y-auto">
        <Tabs defaultValue="for-you" className="w-full" onValueChange={(value) => setActiveTab(value as 'for-you' | 'following')}>
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
              <TabsTrigger value="for-you" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Para você</TabsTrigger>
              <TabsTrigger value="following" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Seguindo</TabsTrigger>
            </TabsList>
            <TabsContent value="for-you" className="mt-0">
                <PostList posts={allPosts} loading={isLoading} tab="for-you" />
            </TabsContent>
            <TabsContent value="following" className="mt-0">
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
                <AlertDialogAction onClick={handleDeletePost}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
            <DialogContent>
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
      </main>
    </>
  );
}
