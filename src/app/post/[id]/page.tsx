
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BarChart2, MessageCircle, Heart, Repeat, MoreHorizontal, Loader2, Trash2, Edit, Save, BadgeCheck, Bird, Pin, Sparkles, Frown, Flag, BarChart3, Megaphone, UserRound } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, increment, arrayUnion, arrayRemove, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
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
import { useToast } from '@/hooks/use-toast';
import { formatTimeAgo } from '@/lib/utils';

interface Post {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    createdAt: any;
    content: string;
    image?: string;
    imageHint?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    isLiked: boolean;
    isRetweeted: boolean;
    editedAt?: any;
    hashtags?: string[];
    mentions?: string[];
}

interface Comment {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    content: string;
    createdAt: any;
    editedAt?: any;
    likes: string[];
    retweets: string[];
    comments: number;
    views: number;
    isLiked: boolean;
}

interface ChirpUser {
    displayName: string;
    handle: string;
    avatar: string;
    savedPosts?: string[];
    pinnedPostId?: string;
}

const ContentRenderer = ({ content }: { content: string }) => {
    const router = useRouter();
    const parts = content.split(/(#\w+|@\w+)/g);

    return (
        <>
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
                    // In a real app, you'd fetch the user ID for the handle here
                    // For simplicity, we assume the handle is the ID for navigation in this example
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
                                } else {
                                    // Handle user not found, maybe just display text
                                }
                            }}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
};

const PostContent = ({ content }: { content: string }) => (
    <p className="text-xl mb-4 whitespace-pre-wrap">
        <ContentRenderer content={content} />
    </p>
);

const CommentContent = ({ content }: { content: string }) => (
    <p className="whitespace-pre-wrap mt-1">
        <ContentRenderer content={content} />
    </p>
);


const CommentItem = ({ comment, user, onEdit, onDelete, isLastComment }: { comment: Comment, user: FirebaseUser | null, onEdit: (comment: Comment) => void, onDelete: (id: string) => void, isLastComment: boolean }) => {
    const router = useRouter();
    const {toast} = useToast();
    const [time, setTime] = useState('');
    const isOfficialAccount = comment.handle.toLowerCase() === '@chirp' || comment.handle.toLowerCase() === '@rulio';

    useEffect(() => {
        if (comment.createdAt) {
          try {
            setTime(formatTimeAgo(comment.createdAt.toDate()));
          } catch(e) {
            setTime('agora')
          }
        }
    }, [comment.createdAt]);

    const handleCommentAction = async (action: 'like' | 'retweet') => {
        if (!user || !comment) return;

        const commentRef = doc(db, "comments", comment.id);
        const field = action === 'like' ? 'likes' : 'retweets';
        const isActioned = action === 'like' ? comment.isLiked : (comment.retweets || []).includes(user.uid);

        if (isActioned) {
            await updateDoc(commentRef, { [field]: arrayRemove(user.uid) });
        } else {
            await updateDoc(commentRef, { [field]: arrayUnion(user.uid) });
        }
    };

    return (
        <li className="p-4 flex gap-4 relative">
            {!isLastComment && <div className="absolute left-10 top-16 bottom-0 w-0.5 bg-border -translate-x-1/2"></div>}
            <div className="relative">
                <Avatar className="h-12 w-12 cursor-pointer" onClick={() => router.push(`/profile/${comment.authorId}`)}>
                    <AvatarImage src={comment.avatar} alt={comment.handle} />
                    <AvatarFallback>{comment.avatarFallback}</AvatarFallback>
                </Avatar>
            </div>
            <div className='w-full'>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => router.push(`/profile/${comment.authorId}`)}>
                        <p className="font-bold flex items-center gap-1">
                            {comment.author} 
                            {isOfficialAccount && <BadgeCheck className="h-4 w-4 text-primary" />}
                        </p>
                        <p className="text-muted-foreground">{comment.handle} · {time}</p>
                         {comment.editedAt && <p className="text-xs text-muted-foreground">(editado)</p>}
                    </div>
                    {user?.uid === comment.authorId && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Apagar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(comment)}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Editar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <CommentContent content={comment.content} />
                 <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                        <MessageCircle className="h-5 w-5" />
                        <span>{comment.comments}</span>
                    </div>
                    <button onClick={() => toast({title: "Em breve!", description: "Retweetar comentários estará disponível em breve."})} className={`flex items-center gap-1`}>
                        <Repeat className="h-5 w-5 hover:text-green-500 transition-colors" />
                        <span>{comment.retweets?.length || 0}</span>
                    </button>
                    <button onClick={() => handleCommentAction('like')} className={`flex items-center gap-1 ${comment.isLiked ? 'text-red-500' : ''}`}>
                        <Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${comment.isLiked ? 'fill-current' : ''}`} />
                        <span>{comment.likes?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-1">
                        <BarChart2 className="h-5 w-5" />
                        <span>{comment.views}</span>
                    </div>
                </div>
            </div>
        </li>
    );
};


export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    const { toast } = useToast();
    
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isReplying, setIsReplying] = useState(false);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    
    // State for post actions
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // State for comment actions
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [editingComment, setEditingComment] = useState<Comment | null>(null);
    const [editedCommentContent, setEditedCommentContent] = useState('');
    const [isUpdatingComment, setIsUpdatingComment] = useState(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setChirpUser(userDoc.data() as ChirpUser);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (id && user) {
            const postId = id as string;
            const postRef = doc(db, "posts", postId);
            
            // Increment view count.
            updateDoc(postRef, { views: increment(1) }).catch(err => {
                // We can ignore this error if the document doesn't exist yet, it will be created with views=0
            });

            const unsubscribePost = onSnapshot(postRef, (doc) => {
                if (doc.exists()) {
                    const postData = doc.data() as Omit<Post, 'id' | 'isLiked' | 'isRetweeted' | 'time'>;
                    setPost({
                        id: doc.id,
                        ...postData,
                        time: postData.createdAt ? format(postData.createdAt.toDate(), "h:mm a · d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '',
                        isLiked: postData.likes.includes(user.uid || ''),
                        isRetweeted: postData.retweets.includes(user.uid || ''),
                    });
                     setEditedContent(postData.content);
                } else {
                    setPost(null);
                }
                setIsLoading(false);
            });

            const commentsQuery = query(collection(db, "comments"), where("postId", "==", postId));
            const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
                const commentsData = snapshot.docs.map(doc => {
                     const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        time: '', // will be set in CommentItem
                        isLiked: (data.likes || []).includes(user.uid || ''),
                    } as Comment;
                });
                commentsData.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis() || 0;
                    const timeB = b.createdAt?.toMillis() || 0;
                    return timeB - timeA;
                });
                setComments(commentsData);
            });


            return () => {
                unsubscribePost();
                unsubscribeComments();
            };
        }
    }, [id, user]);

    const extractMentions = (content: string) => {
        const regex = /@(\w+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        return [...new Set(matches)]; // Returns handles like '@username'
    };

    const handleReply = async () => {
        if (!newComment.trim() || !user || !chirpUser || !post || isReplying) return;
        
        setIsReplying(true);
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, 'posts', post.id);
            const commentRef = doc(collection(db, "comments"));
            
            // Create comment
            batch.set(commentRef, {
                 postId: post.id,
                authorId: user.uid,
                author: chirpUser.displayName,
                handle: chirpUser.handle,
                avatar: chirpUser.avatar,
                avatarFallback: chirpUser.displayName[0],
                content: newComment,
                createdAt: serverTimestamp(),
                likes: [],
                retweets: [],
                comments: 0,
                views: 0,
            });

            // Increment post's comment count
            batch.update(postRef, { comments: increment(1) });
            
            // Handle mentions in the reply
            const mentionedHandles = extractMentions(newComment);
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
                                name: chirpUser.displayName,
                                handle: chirpUser.handle,
                                avatar: chirpUser.avatar,
                            },
                            type: 'mention',
                            text: 'mencionou você em uma resposta',
                            postContent: newComment.substring(0, 50),
                            postId: post.id,
                            createdAt: serverTimestamp(),
                            read: false,
                        });
                    }
                });
            }


            // Create notification if not replying to own post
            if(user.uid !== post.authorId) {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                     toUserId: post.authorId,
                    fromUserId: user.uid,
                    fromUser: {
                        name: chirpUser.displayName,
                        handle: chirpUser.handle,
                        avatar: chirpUser.avatar,
                    },
                    type: 'post',
                    text: 'respondeu ao seu post',
                    postContent: post.content.substring(0, 50),
                    postId: post.id,
                    createdAt: serverTimestamp(),
                    read: false,
                });
            }

            await batch.commit();
            setNewComment('');
        } catch (error) {
            console.error("Error posting reply: ", error);
        } finally {
            setIsReplying(false);
        }
    };
    
    const handlePostAction = async (action: 'like' | 'retweet') => {
        if (!user || !post || !chirpUser) return;
    
        const postRef = doc(db, "posts", post.id);
        const field = action === 'like' ? 'likes' : 'retweets';
        const isActioned = action === 'like' ? post.isLiked : post.isRetweeted;
    
        if (isActioned) {
            await updateDoc(postRef, { [field]: arrayRemove(user.uid) });
        } else {
             const batch = writeBatch(db);
             // Add like/retweet
            batch.update(postRef, { [field]: arrayUnion(user.uid) });
            
            // Create notification if not own post
            if (user.uid !== post.authorId) {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    toUserId: post.authorId,
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
            await batch.commit();
        }
    };

    const handleDeletePost = async () => {
        if (!post) return;
        try {
            await deleteDoc(doc(db, "posts", post.id));
             toast({ title: 'Post apagado!' });
            router.push('/home');
        } catch (error) {
            console.error("Error deleting post:", error);
            toast({ title: 'Erro ao apagar post', variant: 'destructive' });
        } finally {
            setIsDeleteAlertOpen(false);
        }
    };
    
    const extractHashtags = (content: string) => {
        const regex = /#(\w+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        // Return unique hashtags in lowercase
        return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
    };

    const handleUpdatePost = async () => {
        if (!post || !editedContent.trim()) return;
        setIsUpdating(true);
        const hashtags = extractHashtags(editedContent);
        try {
            const postRef = doc(db, "posts", post.id);
            await updateDoc(postRef, {
                content: editedContent,
                hashtags: hashtags,
                editedAt: serverTimestamp()
            });
            setIsEditing(false);
            toast({ title: 'Post atualizado!' });
        } catch (error) {
            console.error("Erro ao atualizar post:", error);
            toast({ title: 'Erro ao atualizar post', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleSavePost = async (postId: string) => {
        if (!user || !chirpUser) return;
        const userRef = doc(db, 'users', user.uid);
        const isSaved = chirpUser.savedPosts?.includes(postId);

        try {
            if (isSaved) {
                await updateDoc(userRef, { savedPosts: arrayRemove(postId) });
                toast({ title: 'Post removido dos salvos' });
            } else {
                await updateDoc(userRef, { savedPosts: arrayUnion(postId) });
                toast({ title: 'Post salvo!' });
            }
        } catch (error) {
             console.error("Error saving post:", error);
             toast({ title: 'Erro ao salvar post', variant: 'destructive' });
        }
    };

    const handleTogglePinPost = async () => {
        if (!user || !post) return;
        const userRef = doc(db, 'users', user.uid);
        const isPinned = chirpUser?.pinnedPostId === post.id;

        try {
            await updateDoc(userRef, {
                pinnedPostId: isPinned ? null : post.id
            });
            toast({ title: isPinned ? 'Post desafixado do perfil!' : 'Post fixado no perfil!' });
        } catch (error) {
            console.error("Error pinning post:", error);
            toast({ title: 'Erro ao fixar post', variant: 'destructive' });
        }
    };


    const handleEditCommentClick = (comment: Comment) => {
        setEditingComment(comment);
        setEditedCommentContent(comment.content);
    };

    const handleUpdateComment = async () => {
        if (!editingComment || !editedCommentContent.trim()) return;
        setIsUpdatingComment(true);
        try {
            const commentRef = doc(db, "comments", editingComment.id);
            await updateDoc(commentRef, {
                content: editedCommentContent,
                editedAt: serverTimestamp()
            });
            setEditingComment(null);
            toast({ title: 'Comentário atualizado!' });
        } catch (error) {
            console.error("Erro ao atualizar comentário:", error);
            toast({ title: 'Erro ao atualizar comentário', variant: 'destructive' });
        } finally {
            setIsUpdatingComment(false);
        }
    };
    
    const handleDeleteComment = async () => {
        if (!commentToDelete) return;
        try {
            const commentRef = doc(db, "comments", commentToDelete);
            // Decrement post's comment count
            if (post) {
                const postRef = doc(db, 'posts', post.id);
                await updateDoc(postRef, { comments: increment(-1) });
            }
            await deleteDoc(commentRef);
            toast({ title: 'Comentário apagado!' });
        } catch (error) {
            console.error("Error deleting comment:", error);
             toast({ title: 'Erro ao apagar comentário', variant: 'destructive' });
        } finally {
            setCommentToDelete(null);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!post) {
         return (
            <div className="flex flex-col h-screen bg-background">
                <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                    <div className="flex items-center gap-4 px-4 py-2">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold">Post</h1>
                    </div>
                </header>
                <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                        <h2 className="text-2xl font-bold">Post não encontrado</h2>
                        <p className="text-muted-foreground">Este post pode ter sido excluído.</p>
                        <Button onClick={() => router.push('/home')} className="mt-4">Voltar para a página inicial</Button>
                    </div>
                </div>
            </div>
        );
    }
    
    const isOfficialAccount = post.handle.toLowerCase() === '@chirp' || post.handle.toLowerCase() === '@rulio';

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Post</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => router.push(`/profile/${post.authorId}`)}>
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={post.avatar} alt={post.handle} />
                                <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold flex items-center gap-1">
                                    {post.author} 
                                    {isOfficialAccount && <BadgeCheck className="h-4 w-4 text-primary" />}
                                    {isOfficialAccount && <Bird className="h-4 w-4 text-primary" />}
                                </p>
                                <p className="text-sm text-muted-foreground">{post.handle}</p>
                            </div>
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
                                        <DropdownMenuItem onClick={() => setIsDeleteAlertOpen(true)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Apagar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleTogglePinPost}>
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
                    <PostContent content={post.content} />
                    {post.image && (
                        <div className="mt-4 aspect-video relative w-full overflow-hidden rounded-2xl border">
                           <Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint={post.imageHint} />
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                        <p>{post.time}</p>
                        {post.editedAt && <p className="text-xs">(editado)</p>}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-around text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            <span>{post.comments}</span>
                        </div>
                        <button onClick={() => handlePostAction('retweet')} className={`flex items-center gap-2 ${post.isRetweeted ? 'text-green-500' : ''}`}>
                            <Repeat className="h-5 w-5" />
                            <span>{post.retweets.length}</span>
                        </button>
                        <button onClick={() => handlePostAction('like')} className={`flex items-center gap-2 ${post.isLiked ? 'text-red-500' : ''}`}>
                             <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-current' : ''}`} />
                            <span>{post.likes.length}</span>
                        </button>
                        <div className="flex items-center gap-2">
                           <BarChart2 className="h-5 w-5" />
                            <span>{post.views}</span>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 m-4 border rounded-2xl bg-background/80 backdrop-blur-lg">
                     <div className="flex gap-4">
                        <Avatar>
                            <AvatarImage src={chirpUser?.avatar} alt={chirpUser?.handle} />
                            <AvatarFallback>{chirpUser?.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Textarea 
                                placeholder="Poste sua resposta" 
                                className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={2}
                                disabled={isReplying}
                            />
                            <div className="flex justify-end mt-2 border-t pt-2">
                                <Button onClick={handleReply} disabled={!newComment.trim() || isReplying}>
                                    {isReplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Responder
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <ul className="border-t">
                    {comments.map((comment, index) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            user={user}
                            onEdit={handleEditCommentClick}
                            onDelete={setCommentToDelete}
                            isLastComment={index === comments.length - 1}
                        />
                    ))}
                </ul>

                {/* Post Modals */}
                <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Essa ação não pode ser desfeita. Isso excluirá permanentemente
                            o seu post de nossos servidores.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
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

                {/* Comment Modals */}
                <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Apagar comentário?</AlertDialogTitle>
                        <AlertDialogDescription>
                             Essa ação não pode ser desfeita e removerá o comentário permanentemente.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCommentToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Dialog open={!!editingComment} onOpenChange={(open) => !open && setEditingComment(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <OtherDialogTitle>Editar Comentário</OtherDialogTitle>
                        </DialogHeader>
                        <Textarea 
                            value={editedCommentContent}
                            onChange={(e) => setEditedCommentContent(e.target.value)}
                            rows={5}
                            className="my-4"
                        />
                        <Button onClick={handleUpdateComment} disabled={isUpdatingComment}>
                            {isUpdatingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

    
