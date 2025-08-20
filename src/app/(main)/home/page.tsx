
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Bell, Home, Mail, MessageCircle, Search, Settings, User, Repeat, Heart, BarChart2, Bird, X, MessageSquare, Users, Bookmark, Briefcase, List, Radio, Banknote, Bot, MoreHorizontal, Sun, Moon, Plus, Loader2, Trash2, Edit, Save, BadgeCheck, LogOut, Pin, Sparkles, Frown, BarChart3, Flag, Megaphone, UserRound, Star, PenSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import PostSkeleton from '@/components/post-skeleton';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs, limit, serverTimestamp, writeBatch, deleteDoc, increment, documentId, Timestamp, runTransaction } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle as EditDialogTitle, DialogTitle as OtherDialogTitle } from '@/components/ui/dialog';
import CreatePostModal from '@/components/create-post-modal';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { dataURItoFile } from '@/lib/utils';
import Poll from '@/components/poll';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


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
    location?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
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
    isFirstPost?: boolean;
    poll?: {
        options: string[];
        votes: number[];
        voters: Record<string, number>;
    } | null;
    quotedPostId?: string;
    quotedPost?: Omit<Post, 'quotedPost' | 'quotedPostId'>;
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
    savedPosts?: string[];
    pinnedPostId?: string;
    isVerified?: boolean;
}

export default function HomePage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
  const [activeTab, setActiveTab] = useState('for-you');
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [postToQuote, setPostToQuote] = useState<Post | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            setUser(null);
            router.push('/login');
        }
    });

    return () => unsubscribeAuth();
  }, [router]);
  
  useEffect(() => {
    if (!user) {
        setZisprUser(null);
        return;
    }
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
         if(doc.exists()){
            setZisprUser({ uid: doc.id, ...doc.data() } as ZisprUser);
        } else {
            // This might happen if user document is deleted but auth record still exists
            // We should log them out.
             if (auth.currentUser) {
                signOut(auth).then(() => router.push('/login'));
            }
        }
    });
    return () => unsubscribeUser();
  }, [user, router]);


 const fetchAllPosts = useCallback((currentUser: FirebaseUser) => {
    setIsLoading(true);

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => {
            const data = doc.data();
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

    const q = query(collection(db, "posts"), where("authorId", "in", feedUserIds), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                isLiked: Array.isArray(data.likes) ? data.likes.includes(currentUser.uid) : false,
                isRetweeted: Array.isArray(data.retweets) ? data.retweets.includes(currentUser.uid) : false,
            } as Post
        });
        setFollowingPosts(postsData);
        setIsLoadingFollowing(false);
    }, (error) => {
        console.error("Error fetching following posts:", error);
        setIsLoadingFollowing(false);
    });

    return unsubscribe;
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

    const handlePostAction = async (postId: string, action: 'like' | 'retweet', authorId: string) => {
        if (!user || !zisprUser) return;
    
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
                        name: zisprUser.displayName,
                        handle: zisprUser.handle,
                        avatar: zisprUser.avatar,
                        isVerified: zisprUser.isVerified || false,
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

    const handleQuoteClick = (post: Post) => {
        setPostToQuote(post);
        setIsQuoteModalOpen(true);
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
                        text: 'mencionou você em um post',
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
  
  const handleSavePost = async (postId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const isSaved = zisprUser?.savedPosts?.includes(postId);

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
    const isPinned = zisprUser?.pinnedPostId === postId;

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
        const parts = content.split(/(#\w+|@\w+)/g);
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
                     if (part.startsWith('@')) {
                        const handle = part.substring(1);
                        return (
                            <a 
                                key={index} 
                                className="text-primary hover:underline"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const usersRef = collection(db, "users");
                                    const q = query(usersRef, where("handle", "==", part));
                                    const querySnapshot = await getDocs(q);
                                    if (!querySnapshot.empty) {
                                        const userDoc = querySnapshot.docs[0];
                                        router.push(`/profile/${userDoc.id}`);
                                    }
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

    const QuotedPostPreview = ({ post }: { post: Omit<Post, 'quotedPost' | 'quotedPostId'> }) => (
        <div className="mt-2 border rounded-xl p-3 cursor-pointer hover:bg-muted/50" onClick={(e) => {e.stopPropagation(); router.push(`/post/${post.id}`)}}>
            <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-5 w-5">
                    <AvatarImage src={post.avatar} />
                    <AvatarFallback>{post.author[0]}</AvatarFallback>
                </Avatar>
                <span className="font-bold">{post.author}</span>
                <span className="text-muted-foreground">{post.handle}</span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground line-clamp-3">{post.content}</p>
            {post.image && (
                <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-lg">
                    <Image src={post.image} layout="fill" objectFit="cover" alt="Quoted post image" />
                </div>
            )}
        </div>
    );
    
    const handleVote = async (postId: string, optionIndex: number) => {
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
    };


  const PostItem = ({ post }: { post: Post }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    
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
    
    const isZisprAccount = post.handle === '@Zispr';
    const isVerified = post.isVerified || post.handle === '@rulio' || isZisprAccount;
    const isEditable = post.createdAt && (new Date().getTime() - post.createdAt.toDate().getTime()) < 5 * 60 * 1000;


    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => handlePostClick(post.id)}>
             {post.repostedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-6">
                    <Repeat className="h-4 w-4" />
                    <span>{post.repostedBy.handle === zisprUser?.handle ? 'Você' : post.repostedBy.name} repostou</span>
                </div>
            )}
            {post.isFirstPost && (
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-12">
                    <Star className="h-4 w-4" />
                    <span>Primeiro post</span>
                </div>
            )}
            <div className="flex gap-4">
                 <Avatar className="cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                    {isZisprAccount ? (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 rounded-full">
                            <Bird className="h-5 w-5 text-primary" />
                        </div>
                    ) : (
                        <>
                            <AvatarImage src={post.avatar} alt={post.handle} />
                            <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                        </>
                    )}
                </Avatar>
                <div className='w-full'>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                        <p className="font-bold text-base flex items-center gap-1">
                            {post.author} 
                            {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                        </p>
                        <p className="text-muted-foreground">{post.handle} · {time}</p>
                        {post.isUpdate && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Bird className="h-3 w-3 text-primary" />
                                <span>Atualização</span>
                            </span>
                        )}
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
                                    <DropdownMenuItem onClick={() => handleEditClick(post)} disabled={!isEditable}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleTogglePinPost(post.id)}>
                                        <Pin className="mr-2 h-4 w-4"/>
                                        {zisprUser?.pinnedPostId === post.id ? 'Desafixar do perfil' : 'Fixar no seu perfil'}
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
                                        {zisprUser?.savedPosts?.includes(post.id) ? 'Remover dos Salvos' : 'Salvar'}
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
                {post.quotedPost && <QuotedPostPreview post={post.quotedPost} />}
                {post.poll && user && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <Poll 
                            postId={post.id}
                            options={post.poll.options}
                            votes={post.poll.votes}
                            voters={post.poll.voters}
                            currentUserId={user.uid}
                            onVote={handleVote}
                        />
                    </div>
                )}
                {post.image && (
                    <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-2xl border">
                        <Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint={post.imageHint} />
                    </div>
                )}
                <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`)}} className="flex items-center gap-1 hover:text-primary transition-colors">
                        <MessageCircle className="h-5 w-5" />
                        <span>{post.comments}</span>
                    </button>
                    
                    <Popover>
                        <PopoverTrigger asChild>
                             <button onClick={(e) => e.stopPropagation()} className={`flex items-center gap-1 hover:text-green-500 transition-colors`}>
                                <Repeat className="h-5 w-5" />
                                <span>{Array.isArray(post.retweets) ? post.retweets.length : 0}</span>
                            </button>
                        </PopoverTrigger>
                         <PopoverContent className="w-48 p-2">
                            <div className="grid gap-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={(e) => { e.stopPropagation(); handlePostAction(post.id, 'retweet', post.authorId); }}
                                >
                                    <Repeat className="mr-2 h-4 w-4" />
                                    {Array.isArray(post.retweets) && post.retweets.includes(user?.uid || '') ? 'Desfazer Repost' : 'Repostar'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={(e) => { e.stopPropagation(); handleQuoteClick(post); }}
                                >
                                    <PenSquare className="mr-2 h-4 w-4" />
                                    Quotar Post
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <button onClick={(e) => {e.stopPropagation(); handlePostAction(post.id, 'like', post.authorId)}} className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : ''}`}>
                        <Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${post.isLiked ? 'fill-current' : ''}`} />
                        <span>{Array.isArray(post.likes) ? post.likes.length : 0}</span>
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


  if (isLoading || !user || !zisprUser) {
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
  
    const isZisprAccount = zisprUser.handle === '@Zispr';
    const isZisprUserVerified = zisprUser.isVerified || zisprUser.handle === '@rulio' || isZisprAccount;


  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Sheet>
              <SheetTrigger asChild>
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
                         <Avatar className="h-10 w-10 cursor-pointer" onClick={() => router.push(`/profile/${user.uid}`)}>
                            <AvatarImage src={zisprUser.avatar} alt={zisprUser.handle} />
                            <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1 font-bold text-lg">
                            {zisprUser.displayName}
                            {isZisprAccount ? <Bird className="h-5 w-5 text-primary" /> : (isZisprUserVerified && <BadgeCheck className="h-5 w-5 text-primary" />)}
                        </div>
                        <p className="text-sm text-muted-foreground">{zisprUser.handle}</p>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                        <p><span className="font-bold">{zisprUser.following?.length || 0}</span> <span className="text-muted-foreground">Seguindo</span></p>
                        <p><span className="font-bold">{zisprUser.followers?.length || 0}</span> <span className="text-muted-foreground">Seguidores</span></p>
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
                        <Bot className="h-6 w-6" /> Zispr AI
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
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
                <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
                  <TabsTrigger value="for-you" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Para você</TabsTrigger>
                  <TabsTrigger value="following" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Seguindo</TabsTrigger>
                </TabsList>
            </div>
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
        <CreatePostModal 
            open={isQuoteModalOpen}
            onOpenChange={setIsQuoteModalOpen}
            quotedPost={postToQuote}
        />
      </main>
    </>
  );
}
