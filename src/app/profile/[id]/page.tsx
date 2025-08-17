
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Gift, Loader2, Mail, MapPin, MoreHorizontal, Search, Repeat, Heart, MessageCircle, BarChart2, Bell, Trash2, Edit, Save, Bookmark, BadgeCheck, Bird, Pin, Sparkles, Frown, BarChart3, Flag, Megaphone, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion, arrayRemove, onSnapshot, DocumentData, QuerySnapshot, writeBatch, serverTimestamp, deleteDoc, setDoc, documentId, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PostSkeleton from '@/components/post-skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
    communityId?: string | null;
    hashtags?: string[];
    repostedBy?: { name: string; handle: string };
    repostedAt?: any;
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

const PostContent = ({ content }: { content: string }) => {
    const router = useRouter();
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

const PostItem = ({ post, user, chirpUser, onAction, onDelete, onEdit, onSave, toast }: { post: Post, user: FirebaseUser | null, chirpUser: ChirpUser | null, onAction: (id: string, action: 'like' | 'retweet', authorId: string) => void, onDelete: (id: string) => void, onEdit: (post: Post) => void, onSave: (id: string) => void, toast: any }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    const isOfficialAccount = post.handle.toLowerCase() === '@chirp' || post.handle.toLowerCase() === '@rulio';

    useEffect(() => {
        const timestamp = post.repostedAt || post.createdAt;
        if (timestamp) {
            try {
                setTime(formatDistanceToNow(timestamp.toDate(), { locale: ptBR }));
            } catch (e) {
                setTime('agora')
            }
        }
    }, [post.createdAt, post.repostedAt]);

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
             {post.repostedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-6">
                    <Repeat className="h-4 w-4" />
                    <span>{post.repostedBy.handle === chirpUser?.handle ? 'Você' : post.repostedBy.name} repostou</span>
                </div>
            )}
            <div className="flex gap-4">
                 <Avatar className="cursor-pointer" onClick={(e) => {e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
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
                                        <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Apagar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEdit(post)}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'A capacidade de fixar posts no perfil será adicionada em breve.'})}>
                                            <Pin className="mr-2 h-4 w-4"/>
                                            Fixar no seu perfil
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'A capacidade de adicionar posts aos destaques será adicionada em breve.'})}>
                                            <Sparkles className="mr-2 h-4 w-4"/>
                                            Adicionar aos Destaques
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem onClick={() => onSave(post.id)}>
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
                            <Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint="Imagem do perfil" />
                        </div>
                    )}
                    <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                        <button className="flex items-center gap-1"><MessageCircle className="h-5 w-5 hover:text-primary transition-colors" /><span>{post.comments}</span></button>
                        <button onClick={() => onAction(post.id, 'retweet', post.authorId)} className={`flex items-center gap-1 ${post.retweets.includes(user?.uid || '') ? 'text-green-500' : ''}`}><Repeat className="h-5 w-5 hover:text-green-500 transition-colors" /><span>{post.retweets.length}</span></button>
                        <button onClick={() => onAction(post.id, 'like', post.authorId)} className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : ''}`}><Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${post.isLiked ? 'fill-current' : ''}`} /><span>{post.likes.length}</span></button>
                        <div className="flex items-center gap-1"><BarChart2 className="h-5 w-5" /><span>{post.views}</span></div>
                    </div>
                </div>
            </div>
        </li>
    )
}

const ReplyItem = ({ reply }: { reply: Reply }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    const isOfficialAccount = reply.handle.toLowerCase() === '@chirp' || reply.handle.toLowerCase() === '@rulio';

    useEffect(() => {
        if (reply.createdAt) {
            try {
                setTime(formatDistanceToNow(reply.createdAt.toDate(), { locale: ptBR }));
            } catch (e) {
                setTime('agora');
            }
        }
    }, [reply.createdAt]);

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${reply.postId}`)}>
            <div className="flex gap-4">
                <Avatar>
                    <AvatarImage src={reply.avatar} alt={reply.handle} />
                    <AvatarFallback>{reply.avatarFallback}</AvatarFallback>
                </Avatar>
                <div className='w-full'>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <p className="font-bold text-base flex items-center gap-1">
                                {reply.author}
                                {isOfficialAccount && <BadgeCheck className="h-4 w-4 text-primary" />}
                                {isOfficialAccount && <Bird className="h-4 w-4 text-primary" />}
                            </p>
                            <p className="text-muted-foreground">{reply.handle} · {time}</p>
                        </div>
                    </div>
                    <p className="mb-2 whitespace-pre-wrap">{reply.content}</p>
                </div>
            </div>
        </li>
    )
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
                        const userData = { uid: doc.id, ...doc.data() } as ChirpUser;
                        setChirpUser(userData);
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
                const userData = { uid: userDoc.id, ...userDoc.data() } as ChirpUser;
                setProfileUser(userData);
                setIsFollowing(userData.followers?.includes(currentUser.uid));
            } else {
                console.error("Usuário não encontrado!");
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
        if (!profileId || !currentUser) return;
        setIsLoadingPosts(true);
    
        const postsQuery = query(collection(db, "posts"), where("authorId", "==", profileId));
        const repostsQuery = query(collection(db, "reposts"), where("userId", "==", profileId));

        const [postsSnapshot, repostsSnapshot] = await Promise.all([getDocs(postsQuery), getDocs(repostsQuery)]);

        const originalPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        const repostsData = repostsSnapshot.docs.map(doc => doc.data());
        const repostedPostIds = repostsData.map(repost => repost.postId);
        
        let repostedPosts: Post[] = [];
        if (repostedPostIds.length > 0) {
            const profileUserDoc = await getDoc(doc(db, 'users', profileId));
            const profileUserData = profileUserDoc.data() as ChirpUser;
            
            const chunks = [];
            for (let i = 0; i < repostedPostIds.length; i += 30) {
                chunks.push(repostedPostIds.slice(i, i + 30));
            }
            
            const repostedPostsSnapshots = await Promise.all(chunks.map(chunk => getDocs(query(collection(db, "posts"), where(documentId(), "in", chunk)))));
            const postsMap = new Map<string, Post>();
            repostedPostsSnapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => postsMap.set(doc.id, { id: doc.id, ...doc.data() } as Post));
            });
            
            repostedPosts = repostsData.map(repost => {
                const postData = postsMap.get(repost.postId);
                if (!postData) return null;
                return {
                    ...postData,
                    repostedAt: repost.repostedAt,
                    repostedBy: {
                        name: profileUserData.displayName,
                        handle: profileUserData.handle
                    },
                };
            }).filter(p => p !== null) as Post[];
        }
    
        const allPosts = [...originalPosts, ...repostedPosts];
        allPosts.sort((a, b) => {
            const timeA = a.repostedAt?.toMillis() || a.createdAt?.toMillis() || 0;
            const timeB = b.repostedAt?.toMillis() || b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });
        
        const finalPosts = allPosts.map(post => ({
            ...post,
            isLiked: post.likes.includes(currentUser?.uid || ''),
            isRetweeted: post.retweets.includes(currentUser?.uid || ''),
        }));
    
        setUserPosts(finalPosts);
        setIsLoadingPosts(false);
    
        setIsLoadingMedia(true);
        setMediaPosts(finalPosts.filter(p => p.image));
        setIsLoadingMedia(false);
    
    }, [profileId, currentUser]);

    const fetchUserReplies = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingReplies(true);
        const q = query(collection(db, "comments"), where("authorId", "==", profileId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let repliesData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: '', 
                } as Reply;
            });
            repliesData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setUserReplies(repliesData);
            setIsLoadingReplies(false);
        });
        return unsubscribe;
    }, [profileId]);


    const fetchLikedPosts = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingLikes(true);
        const q = query(collection(db, "posts"), where("likes", "array-contains", profileId), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    isLiked: data.likes.includes(currentUser?.uid || ''),
                    isRetweeted: data.retweets.includes(currentUser?.uid || ''),
                } as Post
            });
            setLikedPosts(posts);
            setIsLoadingLikes(false);
        });
        return unsubscribe;
    }, [profileId, currentUser]);


    useEffect(() => {
        if(profileId && currentUser) {
            fetchUserPosts();
            const unsubReplies = fetchUserReplies();
            const unsubLikes = fetchLikedPosts();
            return () => {
                unsubReplies.then(u => u());
                unsubLikes.then(u => u());
            };
        }
    }, [profileId, currentUser, fetchUserPosts, fetchLikedPosts, fetchUserReplies]);

    const handleFollow = async () => {
        if (!currentUser || !profileUser || !chirpUser) return;
        
        const batch = writeBatch(db);

        const currentUserRef = doc(db, 'users', currentUser.uid);
        const profileUserRef = doc(db, 'users', profileUser.uid);

        if (isFollowing) {
            batch.update(currentUserRef, { following: arrayRemove(profileUser.uid) });
            batch.update(profileUserRef, { followers: arrayRemove(currentUser.uid) });
        } else {
            batch.update(currentUserRef, { following: arrayUnion(profileUser.uid) });
            batch.update(profileUserRef, { followers: arrayUnion(currentUser.uid) });
            
            const notificationRef = doc(collection(db, 'notifications'));
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

    const handleStartConversation = async () => {
        if (!currentUser || !profileUser || currentUser.uid === profileUser.uid) return;

        const conversationId = [currentUser.uid, profileUser.uid].sort().join('_');
        const conversationRef = doc(db, "conversations", conversationId);
        
        try {
            const docSnap = await getDoc(conversationRef);
            
            if (!docSnap.exists()) {
                 await setDoc(conversationRef, {
                    participants: [currentUser.uid, profileUser.uid],
                    unreadCounts: { [currentUser.uid]: 0, [profileUser.uid]: 0 },
                    lastMessage: {
                        text: `Iniciou uma conversa`,
                        senderId: null,
                        timestamp: serverTimestamp()
                    },
                    lastMessageReadBy: [],
                });
            }
            router.push(`/messages/${conversationId}`);
        } catch (error) {
            console.error("Erro ao iniciar a conversa:", error);
            toast({
                title: "Erro",
                description: "Não foi possível iniciar a conversa.",
                variant: "destructive",
            });
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
            await fetchUserPosts();
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
             await fetchUserPosts();
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

    const handlePostAction = async (postId: string, action: 'like' | 'retweet', authorId: string) => {
        if (!currentUser || !chirpUser) return;
    
        const postRef = doc(db, 'posts', postId);
        const post = userPosts.find(p => p.id === postId) || likedPosts.find(p => p.id === postId) || mediaPosts.find(p => p.id === postId);
        if (!post) return;
    
        const isActioned = action === 'like' ? post.isLiked : post.retweets.includes(currentUser.uid);
    
        const batch = writeBatch(db);
    
        if (isActioned) {
            const field = action === 'like' ? 'likes' : 'retweets';
            batch.update(postRef, { [field]: arrayRemove(currentUser.uid) });
    
            if (action === 'retweet') {
                const repostQuery = query(collection(db, 'reposts'), where('userId', '==', currentUser.uid), where('postId', '==', postId));
                const repostSnapshot = await getDocs(repostQuery);
                repostSnapshot.forEach(doc => batch.delete(doc.ref));
            }
        } else {
            const field = action === 'like' ? 'likes' : 'retweets';
            batch.update(postRef, { [field]: arrayUnion(currentUser.uid) });
    
            if (action === 'retweet') {
                const repostRef = doc(collection(db, 'reposts'));
                batch.set(repostRef, {
                    userId: currentUser.uid,
                    postId: postId,
                    originalPostAuthorId: authorId,
                    repostedAt: serverTimestamp()
                });
            }
    
            if (currentUser.uid !== authorId) {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    toUserId: authorId,
                    fromUserId: currentUser.uid,
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
        fetchUserPosts();
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
                    <PostItem 
                        key={`${post.id}-${post.repostedAt?.toMillis() || ''}`}
                        post={post}
                        user={currentUser}
                        chirpUser={chirpUser}
                        onAction={handlePostAction}
                        onDelete={setPostToDelete}
                        onEdit={handleEditClick}
                        onSave={handleSavePost}
                        toast={toast}
                    />
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
                    <ReplyItem key={reply.id} reply={reply} />
                ))}
            </ul>
        );
    };

    if (isLoading || !profileUser) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isOwnProfile = currentUser?.uid === profileUser.uid;
    const isOfficialAccount = profileUser.handle.toLowerCase() === '@chirp' || profileUser.handle.toLowerCase() === '@rulio';

  return (
    <>
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex items-center gap-4 px-4 py-2 border-b">
             <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-xl font-bold flex items-center gap-1">
                    {profileUser.displayName}
                    {isOfficialAccount && <BadgeCheck className="h-5 w-5 text-primary" />}
                    {isOfficialAccount && <Bird className="h-5 w-5 text-primary" />}
                </h1>
                <p className="text-sm text-muted-foreground">{userPosts.length} posts</p>
            </div>
        </header>
        <main className="flex-1">
        <div className="relative h-48 bg-muted">
          {profileUser.banner && <Image
            src={profileUser.banner}
            alt="Banner"
            layout="fill"
            objectFit="cover"
            data-ai-hint="Imagem do perfil"
          />}
        </div>
        <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="-mt-20">
                    <Avatar className="h-32 w-32 border-4 border-background">
                        <AvatarImage src={profileUser.avatar} data-ai-hint="Imagem do perfil" alt={profileUser.displayName} />
                        <AvatarFallback className="text-4xl">{profileUser.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
                {isOwnProfile ? (
                    <Button variant="outline" className="rounded-full mt-4 font-bold" asChild>
                      <Link href="/profile/edit">Editar perfil</Link>
                    </Button>
                ) : (
                    <div className='flex items-center gap-2 mt-4'>
                        <Button variant="ghost" size="icon" className="border rounded-full" onClick={handleStartConversation}><Mail /></Button>
                        <Button variant="ghost" size="icon" className="border rounded-full"><Bell /></Button>
                        <Button variant={isFollowing ? 'secondary' : 'default'} className="rounded-full font-bold" onClick={handleFollow}>
                            {isFollowing ? 'Seguindo' : 'Seguir'}
                        </Button>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold flex items-center gap-1">
                        {profileUser.displayName}
                        {isOfficialAccount && <BadgeCheck className="h-6 w-6 text-primary" />}
                        {isOfficialAccount && <Bird className="h-6 w-6 text-primary" />}
                    </h1>
                </div>
                <p className="text-muted-foreground">{profileUser.handle}</p>
                <p className="mt-2 whitespace-pre-wrap">{profileUser.bio}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
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
                    emptyDescription="Quando este usuário curtir posts, eles aparecerão aqui."
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
                <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">Continuar</AlertDialogAction>
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
    </>
  );
}
