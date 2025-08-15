

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Gift, Loader2, Mail, MapPin, MoreHorizontal, Search, Repeat, Heart, MessageCircle, BarChart2, Upload, Bell, Trash2, Edit, Save } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion, arrayRemove, onSnapshot, DocumentData, QuerySnapshot, writeBatch, serverTimestamp, deleteDoc, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PostSkeleton from '@/components/post-skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


const EmptyState = ({ title, description }: { title: string, description: string }) => (
    <div className="text-center p-8">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground mt-2">{description}</p>
    </div>
);

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
}

interface Reply {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    content: string;
    createdAt: any;
    postId: string;
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
    birthDate: any;
    createdAt: any;
    followers: string[];
    following: string[];
    savedPosts?: string[];
}

export default function ProfilePage() {
    const router = useRouter();
    const params = useParams();
    const profileId = params.id as string;
    const { toast } = useToast();

    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    const [profileUser, setProfileUser] = useState<ChirpUser | null>(null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [userReplies, setUserReplies] = useState<Reply[]>([]);
    const [mediaPosts, setMediaPosts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isLoadingReplies, setIsLoadingReplies] = useState(true);
    const [isLoadingMedia, setIsLoadingMedia] = useState(true);
    const [isLoadingLikes, setIsLoadingLikes] = useState(true);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [editedContent, setEditedContent] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                 const userDocRef = doc(db, "users", user.uid);
                 onSnapshot(userDocRef, (doc) => {
                     if (doc.exists()) {
                         setChirpUser(doc.data() as ChirpUser);
                     }
                 });
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchProfileUser = useCallback(async () => {
        if (!profileId || !currentUser) return;
        setIsLoading(true);
        
        const userDocRef = doc(db, 'users', profileId);
        const unsubscribe = onSnapshot(userDocRef, (userDoc) => {
             if (userDoc.exists()) {
                const userData = userDoc.data() as ChirpUser;
                setProfileUser(userData);
                setIsFollowing(userData.followers?.includes(currentUser.uid));
            } else {
                console.error("Usuário não encontrado!");
                // router.push('/home');
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, [profileId, currentUser]);

    useEffect(() => {
        const unsub = fetchProfileUser();
        return () => {
            unsub.then(u => u && u());
        }
    }, [fetchProfileUser]);
    
    const fetchUserPosts = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingPosts(true);
        const q = query(collection(db, "posts"), where("authorId", "==", profileId), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    id: doc.id,
                    ...data,
                    time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo',
                    isLiked: data.likes.includes(currentUser?.uid || ''),
                    isRetweeted: data.retweets.includes(currentUser?.uid || ''),
                 } as Post
            });
            setUserPosts(posts);
            setIsLoadingPosts(false);

            // Filter for media posts client-side
            setIsLoadingMedia(true);
            setMediaPosts(posts.filter(p => p.image));
            setIsLoadingMedia(false);
        });
    }, [profileId, currentUser]);

    const fetchUserReplies = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingReplies(true);
        const q = query(collection(db, "comments"), where("authorId", "==", profileId), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const replies = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo',
                } as Reply;
            });
            setUserReplies(replies);
            setIsLoadingReplies(false);
        });
    }, [profileId]);


    const fetchLikedPosts = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingLikes(true);
        const q = query(collection(db, "posts"), where("likes", "array-contains", profileId), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo',
                    isLiked: data.likes.includes(currentUser?.uid || ''),
                    isRetweeted: data.retweets.includes(currentUser?.uid || ''),
                } as Post
            });
            setLikedPosts(posts);
            setIsLoadingLikes(false);
        });
    }, [profileId, currentUser]);


    useEffect(() => {
        if(profileId) {
            fetchUserPosts();
            fetchUserReplies();
            fetchLikedPosts();
        }
    }, [profileId, fetchUserPosts, fetchLikedPosts, fetchUserReplies]);

    const handleFollow = async () => {
        if (!currentUser || !profileUser || !chirpUser) return;
        
        const batch = writeBatch(db);

        const currentUserRef = doc(db, 'users', currentUser.uid);
        const profileUserRef = doc(db, 'users', profileUser.uid);
        const notificationRef = doc(collection(db, 'notifications'));

        if (isFollowing) {
            // Unfollow
            batch.update(currentUserRef, { following: arrayRemove(profileUser.uid) });
            batch.update(profileUserRef, { followers: arrayRemove(currentUser.uid) });
        } else {
            // Follow
            batch.update(currentUserRef, { following: arrayUnion(profileUser.uid) });
            batch.update(profileUserRef, { followers: arrayUnion(currentUser.uid) });
            batch.set(notificationRef, {
                toUserId: profileUser.uid,
                fromUserId: currentUser.uid,
                fromUser: {
                    name: chirpUser.displayName,
                    handle: chirpUser.handle,
                    avatar: chirpUser.avatar,
                },
                type: 'follow',
                text: 'seguiu você',
                createdAt: serverTimestamp(),
                read: false,
            });
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
        if (!currentUser) return;
        const userRef = doc(db, 'users', currentUser.uid);
        const isSaved = chirpUser?.savedPosts?.includes(postId);

        if (isSaved) {
            await updateDoc(userRef, { savedPosts: arrayRemove(postId) });
            toast({ title: 'Post removido dos salvos' });
        } else {
            await updateDoc(userRef, { savedPosts: arrayUnion(postId) });
            toast({ title: 'Post salvo!' });
        }
    };

    const handlePostAction = async (postId: string, action: 'like' | 'retweet') => {
        const postRef = doc(db, 'posts', postId);
        const post = userPosts.find(p => p.id === postId) || likedPosts.find(p => p.id === postId) || mediaPosts.find(p => p.id === postId);
        if (!post || !currentUser) return;

        const field = action === 'like' ? 'likes' : 'retweets';
        const isActioned = action === 'like' ? post.isLiked : post.isRetweeted;
    
        if(isActioned) {
            await updateDoc(postRef, { [field]: arrayRemove(currentUser.uid) });
        } else {
            await updateDoc(postRef, { [field]: arrayUnion(currentUser.uid) });
        }
    };

    const PostList = ({ posts, loading, emptyTitle, emptyDescription }: { posts: Post[], loading: boolean, emptyTitle: string, emptyDescription: string }) => {
        if (loading) {
            return (
                <ul>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                </ul>
            );
        }
        if (posts.length === 0) {
            return <EmptyState title={emptyTitle} description={emptyDescription} />;
        }
        return (
            <ul className="divide-y divide-border">
                {posts.map((post) => (
                    <li key={post.id} className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                        <div className="flex gap-4">
                             <Avatar className="cursor-pointer" onClick={(e) => {e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                                <AvatarImage src={post.avatar} alt={post.handle} />
                                <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                            </Avatar>
                            <div className='w-full'>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <p className="font-bold text-base">{post.author}</p>
                                        <p className="text-muted-foreground">{post.handle} · {post.time}</p>
                                        {post.editedAt && <p className="text-xs text-muted-foreground">(editado)</p>}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                            {currentUser?.uid === post.authorId ? (
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
                                <p className="mb-2 whitespace-pre-wrap">{post.content}</p>
                                {post.image && <Image src={post.image} data-ai-hint={post.imageHint} width={500} height={300} alt="Imagem do post" className="rounded-2xl border" />}
                                <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                                    <button className="flex items-center gap-1"><MessageCircle className="h-5 w-5 hover:text-primary transition-colors" /><span>{post.comments}</span></button>
                                    <button onClick={() => handlePostAction(post.id, 'retweet')} className={`flex items-center gap-1 ${post.isRetweeted ? 'text-green-500' : ''}`}><Repeat className="h-5 w-5 hover:text-green-500 transition-colors" /><span>{post.retweets.length}</span></button>
                                    <button onClick={() => handlePostAction(post.id, 'like')} className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : ''}`}><Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${post.isLiked ? 'fill-current' : ''}`} /><span>{post.likes.length}</span></button>
                                    <div className="flex items-center gap-1"><BarChart2 className="h-5 w-5" /><span>{post.views}</span></div>
                                    <div className="flex items-center gap-1"><Upload className="h-5 w-5" /></div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    const ReplyList = ({ replies, loading, emptyTitle, emptyDescription }: { replies: Reply[], loading: boolean, emptyTitle: string, emptyDescription: string }) => {
        if (loading) {
            return (
                <ul>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                </ul>
            );
        }
        if (replies.length === 0) {
            return <EmptyState title={emptyTitle} description={emptyDescription} />;
        }
        return (
            <ul className="divide-y divide-border">
                {replies.map((reply) => (
                    <li key={reply.id} className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${reply.postId}`)}>
                        <div className="flex gap-4">
                            <Avatar>
                                <AvatarImage src={reply.avatar} alt={reply.handle} />
                                <AvatarFallback>{reply.avatarFallback}</AvatarFallback>
                            </Avatar>
                            <div className='w-full'>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <p className="font-bold text-base">{reply.author}</p>
                                        <p className="text-muted-foreground">{reply.handle} · {reply.time}</p>
                                    </div>
                                </div>
                                <p className="mb-2 whitespace-pre-wrap">{reply.content}</p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    if (isLoading || !profileUser) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isOwnProfile = currentUser?.uid === profileUser.uid;

  return (
    <div className="flex flex-col h-screen bg-background relative animate-fade-in">
      <main className="flex-1 overflow-y-auto pb-20">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex items-center gap-4 px-4 py-2 border-b">
             <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-xl font-bold">{profileUser.displayName}</h1>
                <p className="text-sm text-muted-foreground">{userPosts.length} posts</p>
            </div>
        </header>
        <div className="relative h-48 bg-muted">
          {profileUser.banner && <Image
            src={profileUser.banner}
            alt="Banner"
            layout="fill"
            objectFit="cover"
            data-ai-hint="concert crowd"
          />}
        </div>
        <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="-mt-20">
                    <Avatar className="h-32 w-32 border-4 border-background">
                        <AvatarImage src={profileUser.avatar} data-ai-hint="pop star" alt={profileUser.displayName} />
                        <AvatarFallback className="text-4xl">{profileUser.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
                {isOwnProfile ? (
                    <Button variant="outline" className="rounded-full mt-4 font-bold" asChild>
                      <Link href="/profile/edit">Editar perfil</Link>
                    </Button>
                ) : (
                    <div className='flex items-center gap-2 mt-4'>
                        <Button variant="ghost" size="icon" className="border rounded-full"><Mail /></Button>
                        <Button variant="ghost" size="icon" className="border rounded-full"><Bell /></Button>
                        <Button variant={isFollowing ? 'secondary' : 'default'} className="rounded-full font-bold" onClick={handleFollow}>
                            {isFollowing ? 'Seguindo' : 'Seguir'}
                        </Button>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{profileUser.displayName}</h1>
                </div>
                <p className="text-muted-foreground">{profileUser.handle}</p>
                <p className="mt-2 whitespace-pre-wrap">{profileUser.bio}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
                {profileUser.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{profileUser.location}</span></div>}
                {profileUser.birthDate && <div className="flex items-center gap-2"><Gift className="h-4 w-4" /><span>Nascido em {format(profileUser.birthDate.toDate(), 'd de MMMM, yyyy', { locale: ptBR })}</span></div>}
                {profileUser.createdAt && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Ingressou em {format(profileUser.createdAt.toDate(), 'MMMM yyyy', { locale: ptBR })}</span></div>}
            </div>
             <div className="flex gap-4 mt-4 text-sm">
                <p className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{profileUser.following?.length || 0}</span> Seguindo</p>
                <p className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{profileUser.followers?.length || 0}</span> Seguidores</p>
            </div>
        </div>

        <Tabs defaultValue="posts" className="w-full mt-4">
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b px-4">
                <TabsTrigger value="posts" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Posts</TabsTrigger>
                <TabsTrigger value="replies" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Respostas</TabsTrigger>
                <TabsTrigger value="media" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Mídia</TabsTrigger>
                <TabsTrigger value="likes" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Curtidas</TabsTrigger>
            </TabsList>

             <TabsContent value="posts" className="mt-0">
                <PostList 
                    posts={userPosts} 
                    loading={isLoadingPosts} 
                    emptyTitle="Nenhum post ainda" 
                    emptyDescription="Quando este usuário postar, os posts aparecerão aqui."
                />
            </TabsContent>
            <TabsContent value="replies" className="mt-0">
                 <ReplyList 
                    replies={userReplies} 
                    loading={isLoadingReplies} 
                    emptyTitle="Nenhuma resposta ainda" 
                    emptyDescription="Quando este usuário responder a outros, suas respostas aparecerão aqui."
                />
            </TabsContent>
            <TabsContent value="media" className="mt-0">
                 <PostList 
                    posts={mediaPosts} 
                    loading={isLoadingMedia}
                    emptyTitle="Nenhuma mídia ainda" 
                    emptyDescription="Quando este usuário postar fotos ou vídeos, eles aparecerão aqui."
                 />
            </TabsContent>
            <TabsContent value="likes" className="mt-0">
                 <PostList 
                    posts={likedPosts} 
                    loading={isLoadingLikes}
                    emptyTitle="Nenhuma curtida ainda" 
                    description="Quando este usuário curtir posts, eles aparecerão aqui."
                 />
            </TabsContent>
        </Tabs>
      </main>
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
                    <DialogTitle>Editar Post</DialogTitle>
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
    </div>
  );
}

