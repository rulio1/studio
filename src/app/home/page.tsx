
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Bell, Home, Mail, MessageCircle, Search, Settings, User, Repeat, Heart, BarChart2, Upload, Bird, X, MessageSquare, Users, Bookmark, Briefcase, List, Radio, Banknote, Bot, MoreHorizontal, Sun, Moon, Plus, Loader2, Trash2, Edit, Save, BadgeCheck, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import PostSkeleton from '@/components/post-skeleton';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs, limit, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePost } from '@/ai/flows/post-generator-flow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                time: '', 
                isLiked: data.likes.includes(auth.currentUser?.uid || ''),
                isRetweeted: data.retweets.includes(auth.currentUser?.uid || ''),
            } as Post
        }).filter(post => !post.communityId); 
        
        setAllPosts(postsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching posts:", error);
        setIsLoading(false);
    });

    return () => unsubscribePosts();
  }, []);

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
            time: '', 
            isLiked: data.likes.includes(auth.currentUser?.uid || ''),
            isRetweeted: data.retweets.includes(auth.currentUser?.uid || ''),
        } as Post
    });
    setFollowingPosts(postsData);
    setIsLoadingFollowing(false);
  }, [chirpUser]);

  useEffect(() => {
    if (activeTab === 'following' && chirpUser) {
        fetchFollowingPosts();
    }
  }, [activeTab, fetchFollowingPosts, chirpUser]);

  const handlePostAction = async (postId: string, action: 'like' | 'retweet') => {
    if (!user || !chirpUser) return;
      
    const postRef = doc(db, "posts", postId);
    const postToUpdate = allPosts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
    if (!postToUpdate) return;

    const field = action === 'like' ? 'likes' : 'retweets';
    const isActioned = action === 'like' ? postToUpdate.isLiked : postToUpdate.isRetweeted;

    if (isActioned) {
        await updateDoc(postRef, { [field]: arrayRemove(user.uid) });
    } else {
        const batch = writeBatch(db);
        batch.update(postRef, { [field]: arrayUnion(user.uid) });
        
        if (user.uid !== postToUpdate.authorId) {
            const notificationRef = doc(collection(db, 'notifications'));
            batch.set(notificationRef, {
                toUserId: postToUpdate.authorId,
                fromUserId: user.uid,
                fromUser: {
                    name: chirpUser.displayName,
                    handle: chirpUser.handle,
                    avatar: chirpUser.avatar,
                },
                type: action,
                text: action === 'like' ? 'curtiu seu post' : 'repostou seu post',
                postContent: postToUpdate.content.substring(0, 50),
                postId: postToUpdate.id,
                createdAt: serverTimestamp(),
                read: false,
            });
        }
        await batch.commit();
    }
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

  const handleUpdatePost = async () => {
    if (!editingPost || !editedContent.trim()) return;
    setIsUpdating(true);
    try {
        const postRef = doc(db, "posts", editingPost.id);
        await updateDoc(postRef, {
            content: editedContent,
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

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  const PostItem = ({ post }: { post: Post }) => {
    const router = useRouter();
    const [time, setTime] = useState('');

    useEffect(() => {
      if (post.createdAt) {
        try {
            const date = post.createdAt.toDate();
            setTime(formatDistanceToNow(date, { addSuffix: true, locale: ptBR }));
        } catch(e) {
            setTime('agora');
        }
      }
    }, [post.createdAt]);

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => handlePostClick(post.id)}>
            <div className="flex gap-4">
                <Avatar className="cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                    <AvatarImage src={post.avatar} alt={post.handle} />
                    <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                </Avatar>
                <div className='w-full'>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <p className="font-bold text-base flex items-center gap-1">{post.author} {post.handle.toLowerCase() === '@rulio' && <BadgeCheck className="h-4 w-4 text-primary" />}</p>
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
                                    <DropdownMenuItem onClick={() => setPostToDelete(post.id)}>
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        Apagar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditClick(post)}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Editar
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <DropdownMenuItem onClick={() => handleSavePost(post.id)}>
                                    <Save className="mr-2 h-4 w-4"/>
                                    {chirpUser?.savedPosts?.includes(post.id) ? 'Remover dos Salvos' : 'Salvar'}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="mb-2 whitespace-pre-wrap">
                    <p>{post.content}</p>
                </div>
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
               <PostItem key={post.id} post={post} />
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
                       <Link href="/saved" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Bookmark className="h-6 w-6" /> Itens Salvos
                      </Link>
                    </SheetClose>
                     <SheetClose asChild>
                       <Link href="/spaces" className="flex items-center gap-4 py-2 text-xl font-bold rounded-md">
                        <Radio className="h-6 w-6" /> Spaces <Badge variant="secondary" className="ml-auto">em breve</Badge>
                      </Link>
                    </SheetClose>
                  </nav>
                  <div className="p-4 border-t mt-auto flex flex-col gap-2">
                    <div className="flex items-center gap-4 py-2 font-semibold rounded-md text-muted-foreground cursor-not-allowed">
                        <Bot className="h-6 w-6" /> Chirp AI <Badge variant="secondary" className="ml-auto">em breve</Badge>
                    </div>
                    <SheetClose asChild>
                       <Link href="#" className="flex items-center gap-4 py-2 font-semibold rounded-md">
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
       <main className="flex-1">
        <Tabs defaultValue="for-you" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b sticky top-14 bg-background/80 backdrop-blur-sm z-10">
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
