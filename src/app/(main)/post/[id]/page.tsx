
'use client';

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BarChart2, MessageCircle, Heart, Repeat, MoreHorizontal, Loader2, Trash2, Edit, Save, BadgeCheck, Bird, Pin, Sparkles, Frown, Flag, BarChart3, Megaphone, UserRound, MapPin, PenSquare, Share2 } from 'lucide-react';
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
import Poll from '@/components/poll';
import { runTransaction } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SpotifyEmbed from '@/components/spotify-embed';
import { useUserStore } from '@/store/user-store';
import PostShareCard from '@/components/post-share-card';
import * as htmlToImage from 'html-to-image';


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
    createdAt: any;
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
    editedAt?: any;
    isUpdate?: boolean;
    hashtags?: string[];
    mentions?: string[];
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    poll?: {
        options: string[];
        votes: number[];
        voters: Record<string, number>;
    } | null;
    quotedPostId?: string;
    quotedPost?: Omit<Post, 'quotedPost' | 'quotedPostId'>;
    spotifyUrl?: string;
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
    isRetweeted: boolean;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    postId: string;
}

interface Collection {
    id: string;
    name: string;
    postIds: string[];
}

interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    collections?: Collection[];
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

const ContentRenderer = ({ content, spotifyUrl }: { content: string, spotifyUrl?: string }) => {
    const router = useRouter();
    const parts = content.split(/(#\w+|@\w+|https?:\/\/[^\s]+)/g);

    return (
        <>
            {parts.map((part, index) => {
                if (!part) return null;

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
                    return (
                        <a 
                            key={index} 
                            className="text-primary hover:underline"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/${part.substring(1)}`);
                            }}
                        >
                            {part}
                        </a>
                    );
                }
                if (part.includes('spotify.com')) {
                    return spotifyUrl ? null : (
                         <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{part}</a>
                    );
                }
                return part;
            })}
        </>
    );
};

const PostContent = ({ content, spotifyUrl }: { content: string, spotifyUrl?: string }) => (
    <p className="text-lg md:text-xl mb-4 whitespace-pre-wrap">
        <ContentRenderer content={content} spotifyUrl={spotifyUrl} />
    </p>
);

const CommentContent = ({ content }: { content: string }) => (
    <p className="whitespace-pre-wrap mt-1">
        <ContentRenderer content={content} />
    </p>
);

const QuotedPostPreview = ({ post }: { post: Omit<Post, 'quotedPost' | 'quotedPostId'> }) => {
    const router = useRouter();
    const isRulio = post.handle === '@Rulio';
    const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';
    return (
        <div className="mt-2 border rounded-xl p-3 cursor-pointer hover:bg-muted/50" onClick={(e) => {e.stopPropagation(); router.push(`/post/${post.id}`)}}>
            <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-5 w-5">
                    <AvatarImage src={post.avatar} />
                    <AvatarFallback>{post.avatarFallback || post.author[0]}</AvatarFallback>
                </Avatar>
                 <span className="font-bold flex items-center gap-1">
                    {post.author}
                    {(post.isVerified || isRulio) && <BadgeCheck className={'h-4 w-4 ' + (isRulio ? 'text-white fill-primary' : badgeColor)} />}
                </span>
                <span className="text-muted-foreground">{post.handle}</span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground line-clamp-3">{post.content}</p>
            {post.image && (
                <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-lg">
                    <Image src={post.image} fill className="object-cover" alt="Quoted post image" />
                </div>
            )}
        </div>
    );
};


const CommentItem = ({ comment, user, onEdit, onDelete, isLastComment, onReply }: { comment: Comment, user: FirebaseUser | null, onEdit: (comment: Comment) => void, onDelete: (id: string) => void, isLastComment: boolean, onReply: (handle: string) => void }) => {
    const router = useRouter();
    const {toast} = useToast();
    const [time, setTime] = useState('');
    
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
        const isActioned = action === 'like' ? comment.isLiked : comment.isRetweeted;

        if (isActioned) {
            await updateDoc(commentRef, { [field]: arrayRemove(user.uid) });
        } else {
            await updateDoc(commentRef, { [field]: arrayUnion(user.uid) });
            // Here you could add notification logic for comment likes/retweets if desired
        }
    };
    
    const isZisprAccount = comment.handle === '@Zispr' || comment.handle === '@ZisprUSA';
    const isRulio = comment.handle === '@Rulio';
    const isVerified = comment.isVerified || isRulio;
    const badgeColor = comment.badgeTier ? badgeColors[comment.badgeTier] : 'text-primary';

    return (
        <li className="p-4 flex gap-4 relative border-b">
            {!isLastComment && <div className="absolute left-10 top-16 bottom-0 w-0.5 bg-border -translate-x-1/2"></div>}
            <div className="relative">
                 <Avatar className="h-12 w-12 cursor-pointer" onClick={() => router.push(`/${comment.handle.substring(1)}`)}>
                    {isZisprAccount ? (
                        <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                            <Bird className="h-6 w-6 text-primary" />
                        </div>
                    ) : (
                        <>
                            <AvatarImage src={comment.avatar} alt={comment.handle} />
                            <AvatarFallback>{comment.avatarFallback}</AvatarFallback>
                        </>
                    )}
                </Avatar>
            </div>
            <div className='w-full'>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => router.push(`/${comment.handle.substring(1)}`)}>
                        <p className="font-bold flex items-center gap-1">
                            {comment.author} 
                            {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className={'h-6 w-6 ' + (isRulio ? 'text-white fill-primary' : badgeColor)} />)}
                        </p>
                        <p className="text-muted-foreground">{comment.handle} · {time}</p>
                         {comment.editedAt && <p className="text-xs text-muted-foreground">(editado)</p>}
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                           {user?.uid === comment.authorId ? (
                                <>
                                    <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        Apagar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEdit(comment)}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Editar
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                     <DropdownMenuItem onClick={() => toast({ title: 'Em breve!', description: 'Esta funcionalidade será adicionada em breve.'})}>
                                        <Flag className="mr-2 h-4 w-4"/>
                                        Denunciar comentário
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push(`/${comment.handle.substring(1)}`)}>
                                        <UserRound className="mr-2 h-4 w-4"/>
                                        Ir para perfil de {comment.handle}
                                    </DropdownMenuItem>
                                </>
                           )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CommentContent content={comment.content} />
                 <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onReply(comment.handle)} className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                        <MessageCircle className="h-5 w-5" />
                        <span>{comment.comments}</span>
                    </button>
                    <button onClick={() => handleCommentAction('retweet')} className={'flex items-center gap-1 hover:text-green-500 transition-colors ' + (comment.isRetweeted ? 'text-green-500' : '')}>
                        <Repeat className="h-5 w-5" />
                        <span>{Array.isArray(comment.retweets) ? comment.retweets.length : 0}</span>
                    </button>
                    <button onClick={() => handleCommentAction('like')} className={'flex items-center gap-1 hover:text-red-500 transition-colors ' + (comment.isLiked ? 'text-red-500' : '')}>
                        <Heart className={'h-5 w-5 ' + (comment.isLiked ? 'fill-current' : '')} />
                        <span>{Array.isArray(comment.likes) ? comment.likes.length : 0}</span>
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
    const { user, zisprUser, isLoading: isUserLoading } = useUserStore();
    const [postToView, setPostToView] = useState<Post | null>(null);
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
    const shareCardRef = useRef<HTMLDivElement>(null);

    // State for post actions
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [analyticsPost, setAnalyticsPost] = useState<Post | null>(null);
    const [postToSave, setPostToSave] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);


    // State for comment actions
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [editingComment, setEditingComment] = useState<Comment | null>(null);
    const [editedCommentContent, setEditedCommentContent] = useState('');
    const [isUpdatingComment, setIsUpdatingComment] = useState(false);

    useEffect(() => {
        if (id && user) {
            const postId = id as string;
            const postRef = doc(db, "posts", postId);
            
            const unsubscribePost = onSnapshot(postRef, (doc) => {
                if (doc.exists()) {
                    const viewedPosts = JSON.parse(sessionStorage.getItem('viewedPosts') || '[]');
                    if (!viewedPosts.includes(postId)) {
                        updateDoc(postRef, { views: increment(1) }).catch(err => {
                            console.error("Failed to increment views, may not be critical.", err);
                        });
                        sessionStorage.setItem('viewedPosts', JSON.stringify([...viewedPosts, postId]));
                    }

                    const postData = doc.data() as Omit<Post, 'id' | 'isLiked' | 'isRetweeted' | 'time'>;
                    if (postData.handle === '@stefanysouza') {
                        postData.isVerified = true;
                        postData.badgeTier = 'silver';
                    }
                    setPost({
                        id: doc.id,
                        ...postData,
                        time: postData.createdAt ? format(postData.createdAt.toDate(), "h:mm a · d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '',
                        isLiked: Array.isArray(postData.likes) ? postData.likes.includes(user.uid) : false,
                        isRetweeted: Array.isArray(postData.retweets) ? postData.retweets.includes(user.uid) : false,
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
                     if (data.handle === '@stefanysouza') {
                        data.isVerified = true;
                        data.badgeTier = 'silver';
                     }
                    return {
                        id: doc.id,
                        ...data,
                        time: '', // will be set in CommentItem
                        isLiked: Array.isArray(data.likes) ? data.likes.includes(user.uid || '') : false,
                        isRetweeted: Array.isArray(data.retweets) ? data.retweets.includes(user.uid || '') : false,
                    } as Comment;
                });
                // Sort client-side
                commentsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                setComments(commentsData);
            });


            return () => {
                unsubscribePost();
                unsubscribeComments();
            };
        }
    }, [id, user]);

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

    const extractMentions = (content: string) => {
        const regex = /@(\w+)/g;
        const matches = content.match(regex);
        if (!matches) {
            return [];
        }
        return [...new Set(matches)]; // Returns handles like '@username'
    };

    const handleReply = async () => {
        if (!newComment.trim() || !user || !zisprUser || !post || isReplying) return;
        
        setIsReplying(true);
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, 'posts', post.id);
            const commentRef = doc(collection(db, "comments"));
            
            // Create comment
            batch.set(commentRef, {
                 postId: post.id,
                authorId: user.uid,
                author: zisprUser.displayName,
                handle: zisprUser.handle,
                avatar: zisprUser.avatar,
                avatarFallback: zisprUser.displayName[0],
                content: newComment,
                createdAt: serverTimestamp(),
                likes: [],
                retweets: [],
                comments: 0,
                views: 0,
                isVerified: zisprUser.isVerified || false,
            });

            // Increment post's comment count
            batch.update(postRef, { comments: increment(1) });
            
            // Handle mentions in the reply
            const mentionedHandles = extractMentions(newComment);
            if (mentionedHandles.length > 0) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("handle", "in", mentionedHandles));
                const querySnapshot = await getDocs(q);
                for (const userDoc of querySnapshot.docs) {
                    const mentionedUserId = userDoc.id;
                    const mentionedUserData = userDoc.data();
                    const prefs = mentionedUserData.notificationPreferences;
                    const canSendNotification = !prefs || prefs['mention'] !== false;

                    if (mentionedUserId !== user.uid && canSendNotification) {
                        const notificationRef = doc(collection(db, 'notifications'));
                        batch.set(notificationRef, {
                            toUserId: mentionedUserId,
                            fromUserId: user.uid,
                            fromUser: {
                                name: zisprUser.displayName,
                                handle: zisprUser.handle,
                                avatar: zisprUser.avatar,
                                isVerified: zisprUser.isVerified || false,
                            },
                            type: 'mention',
                            text: 'mencionou você em um post:',
                            postContent: newComment.substring(0, 50),
                            postId: post.id,
                            createdAt: serverTimestamp(),
                            read: false,
                        });
                    }
                }
            }


            // Create notification if not replying to own post
            if(user.uid !== post.authorId) {
                 const authorDoc = await getDoc(doc(db, 'users', post.authorId));
                 if (authorDoc.exists()) {
                    const authorData = authorDoc.data();
                    const prefs = authorData.notificationPreferences;
                    const canSendNotification = !prefs || prefs['reply'] !== false;
                    
                    if (canSendNotification) {
                        const notificationRef = doc(collection(db, 'notifications'));
                        batch.set(notificationRef, {
                             toUserId: post.authorId,
                            fromUserId: user.uid,
                            fromUser: {
                                name: zisprUser.displayName,
                                handle: zisprUser.handle,
                                avatar: zisprUser.avatar,
                                isVerified: zisprUser.isVerified || false,
                            },
                            type: 'reply',
                            text: 'respondeu ao seu post:',
                            postContent: post.content.substring(0, 50),
                            postId: post.id,
                            createdAt: serverTimestamp(),
                            read: false,
                        });
                    }
                }
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
        if (!user || !post || !zisprUser) return;
    
        const postRef = doc(db, "posts", post.id);
        const originalPost = { ...post };
        const isActioned = action === 'like' ? originalPost.isLiked : originalPost.isRetweeted;
    
        // Optimistic UI update
        const newLikes = originalPost.likes ? [...originalPost.likes] : [];
        const newRetweets = originalPost.retweets ? [...originalPost.retweets] : [];
    
        if (action === 'like') {
            if (isActioned) {
                const index = newLikes.indexOf(user.uid);
                if (index > -1) newLikes.splice(index, 1);
            } else {
                newLikes.push(user.uid);
            }
        } else { // retweet
            if (isActioned) {
                const index = newRetweets.indexOf(user.uid);
                if (index > -1) newRetweets.splice(index, 1);
            } else {
                newRetweets.push(user.uid);
            }
        }
    
        setPost({
            ...originalPost,
            likes: newLikes,
            retweets: newRetweets,
            isLiked: newLikes.includes(user.uid),
            isRetweeted: newRetweets.includes(user.uid),
        });
    
        // Firebase update
        try {
            const batch = writeBatch(db);
            const field = action === 'like' ? 'likes' : 'retweets';
    
            if (isActioned) {
                batch.update(postRef, { [field]: arrayRemove(user.uid) });
            } else {
                batch.update(postRef, { [field]: arrayUnion(user.uid) });
    
                if (user.uid !== post.authorId) {
                    const authorDoc = await getDoc(doc(db, 'users', post.authorId));
                    if (authorDoc.exists()) {
                        const authorData = authorDoc.data();
                        const prefs = authorData.notificationPreferences;
                        const canSendNotification = !prefs || prefs[action] !== false;
                        if (canSendNotification) {
                            const notificationRef = doc(collection(db, 'notifications'));
                            batch.set(notificationRef, {
                                toUserId: post.authorId,
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
            // Revert UI on failure
            setPost(originalPost);
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

    const handleTogglePinPost = async () => {
        if (!user || !post || !zisprUser) return;
        const userRef = doc(db, 'users', user.uid);
        const isPinned = zisprUser?.pinnedPostId === post.id;

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

    const handleReplyToComment = (handle: string) => {
        replyTextareaRef.current?.focus();
        setNewComment(prev => `${handle} ${prev}`);
    };

     const handleShare = async () => {
        if (!post || !shareCardRef.current) return;
        setIsSharing(true);

        try {
             const dataUrl = await htmlToImage.toPng(shareCardRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                embedImages: true,
                skipFonts: false,
            });
    
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "zispr-post.png", { type: "image/png" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Post de ${post.author}`,
                    text: post.content.substring(0, 100) + '...',
                });
            } else {
                toast({
                    title: "Compartilhamento não suportado",
                    description: "Seu navegador não suporta o compartilhamento de imagens.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Oops, algo deu errado!', error);
            toast({
                title: "Erro ao compartilhar",
                description: "Não foi possível gerar a imagem para compartilhamento.",
                variant: "destructive",
            });
        } finally {
            setIsSharing(false);
        }
    };
    
    // State to manage avatar data URI for sharing card
    const [shareAvatarDataUri, setShareAvatarDataUri] = useState<string>('');

    // Effect to pre-fetch and convert avatar to data URI for the share card
    useEffect(() => {
        if (post?.avatar && isSharing) {
            fetch(post.avatar)
                .then(response => response.blob())
                .then(blob => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                }))
                .then(dataUrl => {
                    setShareAvatarDataUri(dataUrl as string);
                })
                .catch(e => {
                    console.error("Error fetching avatar for sharing:", e);
                    // Use a placeholder if fetch fails
                    setShareAvatarDataUri('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
                });
        }
    }, [post?.avatar, isSharing]);
    
    // Trigger actual sharing once the avatar data URI is ready
    useEffect(() => {
        if (isSharing && shareAvatarDataUri && shareCardRef.current) {
            handleShare();
        }
    }, [isSharing, shareAvatarDataUri]);


    if (isLoading || isUserLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!post) {
         return (
            <div className="flex flex-col bg-background">
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
    
    const isZisprAccount = post.handle === '@Zispr' || post.handle === '@ZisprUSA';
    const isRulio = post.handle === '@Rulio';
    const isPostVerified = post.isVerified || isRulio;
    const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';
    const isEditable = post.createdAt && (new Date().getTime() - post.createdAt.toDate().getTime()) < 5 * 60 * 1000;
    const isSaved = zisprUser?.collections?.some(c => c.postIds.includes(post.id)) ?? false;

    return (
        <div className="bg-background flex flex-col h-screen">
             <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
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
                        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => router.push(`/${post.handle.substring(1)}`)}>
                                <Avatar className="h-12 w-12">
                                {isZisprAccount ? (
                                    <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                                        <Bird className="h-6 w-6 text-primary" />
                                    </div>
                                ) : (
                                    <>
                                        <AvatarImage src={post.avatar} alt={post.handle} />
                                        <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                                    </>
                                )}
                            </Avatar>
                            <div>
                                <p className="font-bold flex items-center gap-1">
                                    {post.author} 
                                    {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isPostVerified && <BadgeCheck className={'h-6 w-6 ' + (isRulio ? 'text-white fill-primary' : badgeColor)} />)}
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
                                        <DropdownMenuItem onClick={() => setAnalyticsPost(post)}>
                                            <BarChart3 className="mr-2 h-4 w-4"/>
                                            Ver interações
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsDeleteAlertOpen(true)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Apagar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsEditing(true)} disabled={!isEditable}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleTogglePinPost}>
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
                                        <DropdownMenuItem onClick={() => setPostToSave(post.id)}>
                                            <Save className="mr-2 h-4 w-4"/>
                                            {isSaved ? 'Remover dos Salvos' : 'Salvar em Coleção'}
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
                                        <DropdownMenuItem onClick={() => router.push(`/${post.handle.substring(1)}`)}>
                                            <UserRound className="mr-2 h-4 w-4"/>
                                            Ir para perfil de {post.handle}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <PostContent content={post.content} spotifyUrl={post.spotifyUrl} />
                    {post.quotedPost && <QuotedPostPreview post={post.quotedPost} />}
                    {post.spotifyUrl && <SpotifyEmbed url={post.spotifyUrl} />}
                    { post.image && (
                        <div className="mt-4 aspect-video relative w-full overflow-hidden rounded-2xl border cursor-pointer" onClick={(e) => { e.stopPropagation(); setPostToView(post); }}>
                            <Image src={post.image} alt="Imagem do post" fill className="object-cover" data-ai-hint={post.imageHint} />
                        </div>
                    )}
                    { post.gifUrl && (
                        <div className="mt-4 aspect-video relative w-full overflow-hidden rounded-2xl border" onClick={(e) => { e.stopPropagation(); setPostToView(post); }}>
                            <Image src={post.gifUrl} alt="Post GIF" fill className="object-contain" unoptimized />
                        </div>
                    )}
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
                    {post.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                            <MapPin className="h-4 w-4" />
                            <span>{post.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 flex-wrap">
                        <p>{post.time}</p>
                        {post.isUpdate && (
                            <span className="flex items-center gap-1">
                                <Bird className="h-4 w-4 text-primary" />
                                <span>Atualização</span>
                            </span>
                        )}
                        {post.editedAt && <p className="text-xs">(editado)</p>}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-around text-muted-foreground">
                        <button className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            <span>{post.comments}</span>
                        </button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button onClick={(e) => e.stopPropagation()} className={'flex items-center gap-2 hover:text-green-500 transition-colors ' + (post.isRetweeted ? 'text-green-500' : '')}>
                                    <Repeat className="h-5 w-5" />
                                    <span>{Array.isArray(post.retweets) ? post.retweets.length : 0}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                                <div className="grid gap-2">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={(e) => { e.stopPropagation(); handlePostAction('retweet'); }}
                                    >
                                        <Repeat className="mr-2 h-4 w-4" />
                                        {post.isRetweeted ? 'Desfazer Repost' : 'Repostar'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={(e) => { e.stopPropagation(); setIsQuoteModalOpen(true); }}
                                    >
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        Quotar Post
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <button onClick={() => handlePostAction('like')} className={'flex items-center gap-2 ' + (post.isLiked ? 'text-red-500' : '')}>
                                <Heart className={'h-5 w-5 hover:text-red-500 transition-colors ' + (post.isLiked ? 'fill-current' : '')} />
                            <span>{Array.isArray(post.likes) ? post.likes.length : 0}</span>
                        </button>
                         <button onClick={() => setIsSharing(true)} disabled={isSharing} className="flex items-center gap-2 hover:text-primary transition-colors">
                            {isSharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
                 <div className="p-4 border-b">
                    <p className="text-muted-foreground">Respondendo a <span className="text-primary">{post.handle}</span></p>
                </div>
                <ul>
                    {comments.map((comment, index) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            user={user}
                            onEdit={handleEditCommentClick}
                            onDelete={setCommentToDelete}
                            isLastComment={index === comments.length - 1}
                            onReply={handleReplyToComment}
                        />
                    ))}
                </ul>
            </main>
            
            <footer className="sticky bottom-0 z-10 bg-background border-t pb-[env(safe-area-inset-bottom)]">
                 <div className="p-4">
                    <div className="flex items-start gap-3 relative rounded-2xl border bg-muted p-2">
                        <Avatar>
                            <AvatarImage src={zisprUser?.avatar} alt={zisprUser?.handle} />
                            <AvatarFallback>{zisprUser?.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <Textarea 
                            ref={replyTextareaRef}
                            placeholder="Poste sua resposta" 
                            className="flex-1 bg-transparent text-base p-2 resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={1}
                            disabled={isReplying}
                        />
                        <Button onClick={handleReply} disabled={!newComment.trim() || isReplying} size="sm" className="rounded-full self-end">
                            {isReplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Responder
                        </Button>
                    </div>
                </div>
            </footer>
            
            {/* Hidden div for rendering the share card */}
            <div style={{ position: 'fixed', top: '-200vh', left: 0 }}>
                 {isSharing && shareAvatarDataUri && (
                    <div ref={shareCardRef}>
                        <PostShareCard 
                            post={{
                                author: post.author,
                                handle: post.handle,
                                content: post.content,
                                date: post.time,
                                isVerified: post.isVerified,
                                badgeTier: post.badgeTier,
                            }}
                            avatarDataUri={shareAvatarDataUri}
                        />
                    </div>
                )}
            </div>

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
            <Suspense>
                {isQuoteModalOpen && <CreatePostModal
                    open={isQuoteModalOpen}
                    onOpenChange={setIsQuoteModalOpen}
                    quotedPost={post}
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
        </div>
    );
}
