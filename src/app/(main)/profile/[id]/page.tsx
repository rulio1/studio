

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Gift, Loader2, Mail, MapPin, MoreHorizontal, Search, Repeat, Heart, MessageCircle, BarChart2, Bell, Trash2, Edit, Save, Bookmark, BadgeCheck, Bird, Pin, Sparkles, Frown, BarChart3, Flag, Megaphone, UserRound, Info, Star, PenSquare, Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion, arrayRemove, onSnapshot, DocumentData, QuerySnapshot, writeBatch, serverTimestamp, deleteDoc, setDoc, documentId, addDoc, runTransaction, increment } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { format } from 'date-fns';
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
import { formatTimeAgo } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Poll from '@/components/poll';
import { Badge } from '@/components/ui/badge';
import FollowListDialog from '@/components/follow-list-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CreatePostModal from '@/components/create-post-modal';
import ImageViewer from '@/components/image-viewer';
import SpotifyEmbed from '@/components/spotify-embed';
import { motion } from 'framer-motion';


const EmptyState = ({ title, description, icon: Icon }: { title: string, description: string, icon?: React.ElementType }) => (
    <div className="text-center p-8 mt-4">
        {Icon && <Icon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />}
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
    location?: string;
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
    isPinned?: boolean;
    isVerified?: boolean;
    isFirstPost?: boolean;
    isUpdate?: boolean;
    poll?: {
        options: string[];
        votes: number[];
        voters: Record<string, number>;
    } | null;
    quotedPostId?: string;
    quotedPost?: Omit<Post, 'quotedPost' | 'quotedPostId'>;
    spotifyUrl?: string;
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
    birthDate: any;
    createdAt: any;
    followers: string[];
    following: string[];
    likedPosts?: string[];
    savedPosts?: string[];
    pinnedPostId?: string;
    isVerified?: boolean;
    likesArePrivate?: boolean;
    notificationPreferences?: {
        [key: string]: boolean;
    };
}

const PostContent = ({ content, spotifyUrl }: { content: string, spotifyUrl?: string }) => {
    const router = useRouter();
    const parts = content.split(/(#\w+|@\w+|https?:\/\/[^\s]+)/g);

    return (
        <p>
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
                if (part.includes('spotify.com')) {
                    return spotifyUrl ? null : (
                         <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </p>
    );
};

const QuotedPostPreview = ({ post }: { post: Omit<Post, 'quotedPost' | 'quotedPostId'> }) => {
    const router = useRouter();
    return (
        <div className="mt-2 border rounded-xl p-3 cursor-pointer hover:bg-muted/50" onClick={(e) => {e.stopPropagation(); router.push(`/post/${post.id}`)}}>
            <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-5 w-5">
                    <AvatarImage src={post.avatar} />
                    <AvatarFallback>{post.avatarFallback || post.author[0]}</AvatarFallback>
                </Avatar>
                <span className="font-bold flex items-center gap-1">
                    {post.author}
                    {(post.isVerified || post.handle === '@Rulio') && <BadgeCheck className="h-4 w-4 text-primary" />}
                </span>
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
};


const PostItem = ({ post, user, zisprUser, onAction, onDelete, onEdit, onSave, onPin, onVote, toast, onQuote, onImageClick }: { post: Post, user: FirebaseUser | null, zisprUser: ZisprUser | null, onAction: (id: string, action: 'like' | 'retweet', authorId: string) => void, onDelete: (id: string) => void, onEdit: (post: Post) => void, onSave: (id: string) => void, onPin: () => void, onVote: (postId: string, optionIndex: number) => Promise<void>, toast: any, onQuote: (post: Post) => void, onImageClick: (post: Post) => void }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    
    useEffect(() => {
        const timestamp = post.repostedAt || post.createdAt;
        if (timestamp) {
            try {
                setTime(formatTimeAgo(timestamp.toDate()));
            } catch (e) {
                setTime('agora')
            }
        }
    }, [post.createdAt, post.repostedAt]);
    
    const isZisprAccount = post.handle === '@Zispr';
    const isVerified = post.isVerified || post.handle === '@Rulio';
    const isEditable = post.createdAt && (new Date().getTime() - post.createdAt.toDate().getTime()) < 5 * 60 * 1000;
    const isRetweeted = Array.isArray(post.retweets) && post.retweets.includes(user?.uid || '');
    const isLiked = Array.isArray(post.likes) && post.likes.includes(user?.uid || '');

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
             {post.repostedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-6">
                    <Repeat className="h-4 w-4" />
                    <span>{post.repostedBy.handle === zisprUser?.handle ? 'Você' : post.repostedBy.name} repostou</span>
                </div>
            )}
             {post.isPinned && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-12">
                    <Pin className="h-4 w-4" />
                    <span>Post fixado</span>
                </div>
            )}
             {post.isFirstPost && (
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-12">
                    <Star className="h-4 w-4" />
                    <span>Primeiro post</span>
                </div>
            )}
             {post.isUpdate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-12">
                    <Bird className="h-4 w-4 text-primary" />
                    <span>Atualização</span>
                </div>
            )}
            <div className="flex gap-4">
                 <Avatar className="cursor-pointer" onClick={(e) => {e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
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
                                        <DropdownMenuItem onClick={() => onEdit(post)} disabled={!isEditable}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                         <DropdownMenuItem onClick={onPin}>
                                            <Pin className="mr-2 h-4 w-4"/>
                                            {post.isPinned ? 'Desafixar do perfil' : 'Fixar no seu perfil'}
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
                        <PostContent content={post.content} spotifyUrl={post.spotifyUrl} />
                    </div>
                     {post.quotedPost && <QuotedPostPreview post={post.quotedPost} />}
                     {post.spotifyUrl && <SpotifyEmbed url={post.spotifyUrl} />}
                     {post.poll && user && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <Poll 
                                postId={post.id}
                                options={post.poll.options}
                                votes={post.poll.votes}
                                voters={post.poll.voters}
                                currentUserId={user.uid}
                                onVote={onVote}
                            />
                        </div>
                    )}
                     {post.image && (
                        <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-2xl border cursor-pointer" onClick={(e) => { e.stopPropagation(); onImageClick(post); }}>
                            <Image src={post.image} alt="Imagem do post" layout="fill" objectFit="cover" data-ai-hint={post.imageHint} />
                        </div>
                    )}
                    <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                        <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`)}}>
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
                                        onClick={(e) => { e.stopPropagation(); onAction(post.id, 'retweet', post.authorId); }}
                                    >
                                        <Repeat className="mr-2 h-4 w-4" />
                                        {isRetweeted ? 'Desfazer Repost' : 'Repostar'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={(e) => { e.stopPropagation(); onQuote(post); }}
                                    >
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        Quotar Post
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <button onClick={() => onAction(post.id, 'like', post.authorId)} className={`flex items-center gap-1 ${isLiked ? 'text-red-500' : ''}`}><Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${isLiked ? 'fill-current' : ''}`} /><span>{Array.isArray(post.likes) ? post.likes.length : 0}</span></button>
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

    useEffect(() => {
        if (reply.createdAt) {
            try {
                setTime(formatTimeAgo(reply.createdAt.toDate()));
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
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [profileUser, setProfileUser] = useState<ZisprUser | null>(null);
    const [pinnedPost, setPinnedPost] = useState<Post | null>(null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [userReplies, setUserReplies] = useState<Reply[]>([]);
    const [mediaPosts, setMediaPosts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowedBy, setIsFollowedBy] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isLoadingReplies, setIsLoadingReplies] = useState(true);
    const [isLoadingMedia, setIsLoadingMedia] = useState(true);
    const [isLoadingLikes, setIsLoadingLikes] = useState(true);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [editedContent, setEditedContent] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [postToQuote, setPostToQuote] = useState<Post | null>(null);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [postToView, setPostToView] = useState<Post | null>(null);
    const [activeTab, setActiveTab] = useState('posts');


    // Follow list dialog state
    const [followListTitle, setFollowListTitle] = useState('');
    const [followListUserIds, setFollowListUserIds] = useState<string[]>([]);
    const [isFollowListOpen, setIsFollowListOpen] = useState(false);
    
    const isOwnProfile = currentUser?.uid === profileId;

    const fetchUserPosts = useCallback(async (userToFetch: FirebaseUser, profileData: ZisprUser) => {
        if (!userToFetch || !profileData) return;
        setIsLoadingPosts(true);
        setPinnedPost(null);

        // Fetch Pinned Post
        if (profileData.pinnedPostId) {
            const postDoc = await getDoc(doc(db, 'posts', profileData.pinnedPostId));
            if (postDoc.exists()) {
                const data = postDoc.data();
                setPinnedPost({
                    id: postDoc.id,
                    ...data,
                    isLiked: (Array.isArray(data.likes) ? data.likes : []).includes(userToFetch.uid || ''),
                    isRetweeted: (Array.isArray(data.retweets) ? data.retweets : []).includes(userToFetch.uid || ''),
                    isPinned: true
                } as Post);
            }
        }
    
        const postsQuery = query(collection(db, "posts"), where("authorId", "==", profileData.uid));
        const repostsQuery = query(collection(db, "reposts"), where("userId", "==", profileData.uid));

        const [postsSnapshot, repostsSnapshot] = await Promise.all([getDocs(postsQuery), getDocs(repostsQuery)]);

        const originalPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        const repostsData = repostsSnapshot.docs.map(doc => doc.data());
        const repostedPostIds = repostsData.map(repost => repost.postId);
        
        let repostedPosts: Post[] = [];
        if (repostedPostIds.length > 0) {
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
                        name: profileData.displayName,
                        handle: profileData.handle
                    },
                };
            }).filter(p => p !== null) as Post[];
        }
    
        const allPosts = [...originalPosts, ...repostedPosts].filter(p => p.id !== profileData.pinnedPostId);
        allPosts.sort((a, b) => {
            const timeA = a.repostedAt?.toMillis() || a.createdAt?.toMillis() || 0;
            const timeB = b.repostedAt?.toMillis() || b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });
        
        const finalPosts = allPosts.map(post => ({
            ...post,
            isLiked: (Array.isArray(post.likes) ? post.likes : []).includes(userToFetch.uid || ''),
            isRetweeted: (Array.isArray(post.retweets) ? post.retweets : []).includes(userToFetch.uid || ''),
        }));
    
        setUserPosts(finalPosts);
        setIsLoadingPosts(false);
    
        setIsLoadingMedia(true);
        const allPostsForMedia = [...(pinnedPost ? [pinnedPost] : []), ...finalPosts];
        setMediaPosts(allPostsForMedia.filter(p => p.image));
        setIsLoadingMedia(false);
    
    }, []);

    const fetchUserReplies = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingReplies(true);
        const q = query(collection(db, "comments"), where("authorId", "==", profileId));
        const snapshot = await getDocs(q);
        let repliesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                time: '', 
            } as Reply;
        });
        // Sort replies client-side
        repliesData.sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });
        setUserReplies(repliesData);
        setIsLoadingReplies(false);
    }, [profileId]);


    const fetchLikedPosts = useCallback(async (userToFetch: FirebaseUser, profileData: ZisprUser) => {
        if (profileData.likesArePrivate && profileData.uid !== userToFetch.uid) {
            setLikedPosts([]);
            setIsLoadingLikes(false);
            return;
        }

        setIsLoadingLikes(true);
        try {
            const likedPostIds = profileData.likedPosts || [];

            if (likedPostIds.length === 0) {
                 setLikedPosts([]);
                 setIsLoadingLikes(false);
                 return;
            }
            
            const chunks = [];
            for (let i = 0; i < likedPostIds.length; i += 30) {
                 chunks.push(likedPostIds.slice(i, i + 30));
            }
            const postsSnapshots = await Promise.all(chunks.map(chunk => getDocs(query(collection(db, "posts"), where(documentId(), "in", chunk)))));

            const posts = postsSnapshots.flatMap(snapshot =>
                snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        isLiked: (Array.isArray(data.likes) ? data.likes : []).includes(userToFetch.uid || ''),
                        isRetweeted: (Array.isArray(data.retweets) ? data.retweets : []).includes(userToFetch.uid || ''),
                    } as Post;
                })
            );

            posts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setLikedPosts(posts);
        } catch (error) {
            console.error("Error fetching liked posts:", error);
        } finally {
            setIsLoadingLikes(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);

            const profileDocRef = doc(db, 'users', profileId);
            // Use onSnapshot for real-time updates on the profile user's data
            const unsubscribeProfile = onSnapshot(profileDocRef, async (profileDoc) => {
                if (!profileDoc.exists()) {
                    setIsLoading(false);
                    setProfileUser(null);
                    return;
                }
                const profileData = { uid: profileDoc.id, ...profileDoc.data() } as ZisprUser;
                setProfileUser(profileData);
                
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const currentUserData = { uid: userDoc.id, ...userDoc.data() } as ZisprUser;
                    setZisprUser(currentUserData);
                    setIsFollowing(profileData.followers?.includes(user.uid));
                    setIsFollowedBy(currentUserData.followers?.includes(profileId));
                }

                await fetchUserPosts(user, profileData);
                await fetchUserReplies();
                await fetchLikedPosts(user, profileData);
                setIsLoading(false);
            }, (error) => {
                 console.error("Error fetching profile data:", error);
                 toast({ title: "Error fetching profile", variant: "destructive" });
                 setIsLoading(false);
            });

            return () => unsubscribeProfile();
        });

        return () => unsubscribeAuth();
    }, [profileId, router, fetchUserPosts, fetchUserReplies, fetchLikedPosts, toast]);
    
    const handleToggleFollow = async (targetUser: ZisprUser, currentZisprUser: ZisprUser, isCurrentlyFollowing: boolean) => {
        if (!currentUser) return;
    
        const batch = writeBatch(db);
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const targetUserRef = doc(db, 'users', targetUser.uid);
    
        if (isCurrentlyFollowing) {
            batch.update(currentUserRef, { following: arrayRemove(targetUser.uid) });
            batch.update(targetUserRef, { followers: arrayRemove(currentUser.uid) });
            
            // Note: We don't need to send 'unfollow' notifications per X/Twitter's behavior.
            // If you want them, you can add notification creation logic here.

        } else {
            batch.update(currentUserRef, { following: arrayUnion(targetUser.uid) });
            batch.update(targetUserRef, { followers: arrayUnion(currentUser.uid) });

            const prefs = targetUser.notificationPreferences;
            const canSendNotification = !prefs || prefs['follow'] !== false;

            if (canSendNotification) {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    toUserId: targetUser.uid,
                    fromUserId: currentUser.uid,
                    fromUser: {
                        name: currentZisprUser.displayName,
                        handle: currentZisprUser.handle,
                        avatar: currentZisprUser.avatar,
                        isVerified: currentZisprUser.isVerified || false,
                    },
                    type: 'follow',
                    text: 'seguiu você',
                    createdAt: serverTimestamp(),
                    read: false,
                });
            }
        }
    
        await batch.commit();
        
        // Let onSnapshot handle UI updates to avoid race conditions
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
        if (!postToDelete || !currentUser || !profileUser) return;
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
            await fetchUserPosts(currentUser, profileUser);
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
        if (!editingPost || !editedContent.trim() || !currentUser || !profileUser) return;
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
             await fetchUserPosts(currentUser, profileUser);
        }
    };

    const handleSavePost = async (postId: string) => {
        if (!currentUser) return;
        const userRef = doc(db, 'users', currentUser.uid);
        const isSaved = zisprUser?.savedPosts?.includes(postId);

        if (isSaved) {
            await updateDoc(userRef, { savedPosts: arrayRemove(postId) });
        } else {
            await updateDoc(userRef, { savedPosts: arrayUnion(postId) });
        }
        // Let onSnapshot handle UI updates
        toast({ title: isSaved ? 'Post removido dos salvos' : 'Post salvo!' });
    };

    const handlePostAction = async (postId: string, action: 'like' | 'retweet', authorId: string) => {
        if (!currentUser || !zisprUser) return;
    
        const postRef = doc(db, 'posts', postId);
        const post = userPosts.find(p => p.id === postId) || likedPosts.find(p => p.id === postId) || mediaPosts.find(p => p.id === postId) || (pinnedPost?.id === postId ? pinnedPost : null);
        if (!post) return;
    
        const isActioned = action === 'like' ? (Array.isArray(post.likes) && post.likes.includes(currentUser.uid)) : (Array.isArray(post.retweets) && post.retweets.includes(currentUser.uid));

        const userRef = doc(db, 'users', currentUser.uid);
    
        const batch = writeBatch(db);
    
        if (isActioned) {
            const field = action === 'like' ? 'likes' : 'retweets';
            batch.update(postRef, { [field]: arrayRemove(currentUser.uid) });

            if (action === 'like') {
                batch.update(userRef, { likedPosts: arrayRemove(postId) });
            }
    
            if (action === 'retweet') {
                const repostQuery = query(collection(db, 'reposts'), where('userId', '==', currentUser.uid), where('postId', '==', postId));
                const repostSnapshot = await getDocs(repostQuery);
                repostSnapshot.forEach(doc => batch.delete(doc.ref));
            }
        } else {
            const field = action === 'like' ? 'likes' : 'retweets';
            batch.update(postRef, { [field]: arrayUnion(currentUser.uid) });
    
            if (action === 'like') {
                batch.update(userRef, { likedPosts: arrayUnion(postId) });
            }

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
                const authorDoc = await getDoc(doc(db, 'users', authorId));
                if (authorDoc.exists()) {
                    const authorData = authorDoc.data();
                    const prefs = authorData.notificationPreferences;
                    const canSendNotification = !prefs || prefs[action] !== false;

                    if (canSendNotification) {
                        const notificationRef = doc(collection(db, 'notifications'));
                        batch.set(notificationRef, {
                            toUserId: authorId,
                            fromUserId: currentUser.uid,
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
            }
        }
        await batch.commit();
    };
    
    const handleVote = async (postId: string, optionIndex: number) => {
        if (!currentUser) return;
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
    
                if (poll.voters && poll.voters[currentUser.uid] !== undefined) {
                    toast({
                        title: "Você já votou nesta enquete.",
                        variant: "destructive"
                    });
                    return;
                }
    
                const newVotes = [...poll.votes];
                newVotes[optionIndex] += 1;
    
                const newVoters = { ...poll.voters, [currentUser.uid]: optionIndex };
    
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


    const handleTogglePinPost = async (post: Post) => {
        if (!currentUser || !profileUser) return;
        const userRef = doc(db, 'users', currentUser.uid);
        const isCurrentlyPinned = profileUser?.pinnedPostId === post.id;
        
        try {
            await updateDoc(userRef, {
                pinnedPostId: isCurrentlyPinned ? null : post.id
            });
            toast({
                title: isCurrentlyPinned ? 'Post desafixado!' : 'Post fixado no perfil!',
            });
            // onSnapshot will handle the UI update
        } catch (error) {
            console.error("Error pinning/unpinning post: ", error);
            toast({ title: 'Erro ao fixar post.', variant: 'destructive' });
        }
    };
    
    const handleQuoteClick = (postToQuote: Post) => {
        setPostToQuote(postToQuote);
        setIsQuoteModalOpen(true);
    };

    const PostList = ({ posts, loading, emptyTitle, emptyDescription, showPinnedPost = false, emptyIcon }: { posts: Post[], loading: boolean, emptyTitle: string, emptyDescription: string, showPinnedPost?: boolean, emptyIcon?: React.ElementType }) => {
        if (loading) {
            return (
                <ul>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                </ul>
            );
        }
    
        const displayPosts = showPinnedPost ? posts : posts.filter(p => !p.isPinned);
    
        if (displayPosts.length === 0 && (!showPinnedPost || !pinnedPost)) {
            return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />;
        }
    
        return (
            <ul className="divide-y divide-border">
                {showPinnedPost && pinnedPost && (
                    <PostItem 
                        key={`${pinnedPost.id}-pinned`}
                        post={{...pinnedPost, isPinned: true}}
                        user={currentUser}
                        zisprUser={zisprUser}
                        onAction={handlePostAction}
                        onDelete={setPostToDelete}
                        onEdit={handleEditClick}
                        onSave={handleSavePost}
                        onPin={() => handleTogglePinPost(pinnedPost)}
                        onVote={handleVote}
                        toast={toast}
                        onQuote={handleQuoteClick}
                        onImageClick={setPostToView}
                    />
                )}
                {displayPosts.map((post) => (
                    <PostItem 
                        key={`${post.id}-${post.repostedAt?.toMillis() || ''}`}
                        post={post}
                        user={currentUser}
                        zisprUser={zisprUser}
                        onAction={handlePostAction}
                        onDelete={setPostToDelete}
                        onEdit={handleEditClick}
                        onSave={handleSavePost}
                        onPin={() => handleTogglePinPost(post)}
                        onVote={handleVote}
                        toast={toast}
                        onQuote={handleQuoteClick}
                        onImageClick={setPostToView}
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
    
    const showFollowers = () => {
        if (!profileUser) return;
        setFollowListTitle('Seguidores');
        setFollowListUserIds(profileUser.followers);
        setIsFollowListOpen(true);
    }
    
    const showFollowing = () => {
        if (!profileUser) return;
        setFollowListTitle('Seguindo');
        setFollowListUserIds(profileUser.following);
        setIsFollowListOpen(true);
    }

    if (isLoading || !profileUser) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isZisprAccount = profileUser.handle === '@Zispr';
    const isRulioAccount = profileUser.handle === '@Rulio';
    const isProfileVerified = profileUser.isVerified || profileUser.handle === '@Rulio';
    const canViewLikes = isOwnProfile || !profileUser.likesArePrivate;
    const tabIndicatorPositions: { [key: string]: number } = {
        posts: 0,
        replies: 1,
        media: 2,
        likes: 3,
    };

  return (
    <div className="animate-fade-in">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex items-center gap-4 px-4 py-2 border-b">
             <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-xl font-bold flex items-center gap-1">
                    {profileUser.displayName}
                    {isZisprAccount ? <Bird className="h-5 w-5 text-primary" /> : (isProfileVerified && <BadgeCheck className="h-5 w-5 text-primary" />)}
                </h1>
                <p className="text-sm text-muted-foreground">{userPosts.length + (pinnedPost ? 1 : 0)} posts</p>
            </div>
        </header>
        <main className="flex-1">
        <div className="relative h-48 bg-muted">
           {isZisprAccount ? (
                <div className="w-full h-full bg-primary flex items-center justify-center">
                    <Bird className="h-24 w-24 text-primary-foreground" />
                </div>
            ) : (
                profileUser.banner && <Image
                    src={profileUser.banner}
                    alt="Banner"
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="profile banner"
                />
            )}
        </div>
        <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="-mt-20">
                    <Avatar className="h-32 w-32 border-4 border-background bg-muted">
                        {isZisprAccount ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Bird className="h-16 w-16 text-primary" />
                            </div>
                        ) : (
                           <>
                             <AvatarImage src={profileUser.avatar} data-ai-hint="profile avatar" alt={profileUser.displayName} />
                             <AvatarFallback className="text-4xl">{profileUser.displayName?.[0]}</AvatarFallback>
                           </>
                        )}
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
                        <Button variant={isFollowing ? 'secondary' : 'default'} className="rounded-full font-bold" onClick={() => handleToggleFollow(profileUser, zisprUser!, isFollowing)}>
                            {isFollowing ? 'Seguindo' : 'Seguir'}
                        </Button>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold flex items-center gap-1">
                        {profileUser.displayName}
                        {isZisprAccount ? <Bird className="h-6 w-6 text-primary" /> : (isProfileVerified && <BadgeCheck className="h-6 w-6 text-primary" />)}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">{profileUser.handle}</p>
                  {isFollowedBy && !isOwnProfile && <Badge variant="secondary">Segue você</Badge>}
                </div>
                <p className="mt-2 whitespace-pre-wrap">{profileUser.bio}</p>
            </div>
             {isZisprAccount && (
                <Card className="mt-4 border-primary/50">
                    <CardHeader className="flex-row items-center gap-3 space-y-0 p-3">
                        <Info className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">Conta Oficial</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <p className="text-xs text-muted-foreground">Esta é a conta oficial do Zispr. Fique de olho para anúncios, dicas e atualizações importantes da plataforma.</p>
                    </CardContent>
                </Card>
            )}
            {isRulioAccount && (
                <Card className="mt-4 border-primary/50">
                    <CardHeader className="flex-row items-center gap-3 space-y-0 p-3">
                        <Info className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">Fundador e CEO do Zispr</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <p className="text-xs text-muted-foreground">Esta é a conta do fundador do Zispr. Siga para atualizações sobre o desenvolvimento e o futuro da plataforma.</p>
                    </CardContent>
                </Card>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
                {profileUser.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{profileUser.location}</span></div>}
                {profileUser.birthDate && (
                    <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        <span>
                            {format(profileUser.birthDate.toDate(), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                    </div>
                )}
                {profileUser.createdAt && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Ingressou em {format(profileUser.createdAt.toDate(), 'MMMM yyyy', { locale: ptBR })}</span></div>}
            </div>
             <div className="flex gap-4 mt-4 text-sm">
                <button onClick={showFollowing} className="hover:underline"><span className="font-bold text-foreground">{profileUser.following?.length || 0}</span> Seguindo</button>
                <button onClick={showFollowers} className="hover:underline"><span className="font-bold text-foreground">{profileUser.followers?.length || 0}</span> Seguidores</button>
            </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full justify-center p-2 border-b">
                 <TabsList className="relative grid w-full grid-cols-4 p-1 bg-muted/50 rounded-full h-11">
                    <TabsTrigger value="posts" className="relative z-10 rounded-full text-base">Posts</TabsTrigger>
                    <TabsTrigger value="replies" className="relative z-10 rounded-full text-base">Respostas</TabsTrigger>
                    <TabsTrigger value="media" className="relative z-10 rounded-full text-base">Mídia</TabsTrigger>
                    <TabsTrigger value="likes" className="relative z-10 rounded-full text-base">Curtidas</TabsTrigger>
                    <motion.div
                        layoutId="profile-tab-indicator"
                        className="absolute inset-0 h-full p-1"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{
                            left: `${activeTab === 'posts' ? 0 : activeTab === 'replies' ? 25 : activeTab === 'media' ? 50 : 75}%`,
                            width: '25%',
                        }}
                    >
                        <div className="w-full h-full bg-background rounded-full shadow-md"></div>
                    </motion.div>
                </TabsList>
            </div>

             <TabsContent value="posts" className="mt-0">
                <PostList 
                    posts={userPosts} 
                    loading={isLoadingPosts} 
                    emptyTitle="Nenhum post ainda" 
                    emptyDescription="Quando este usuário postar, os posts aparecerão aqui."
                    showPinnedPost={true}
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
                {canViewLikes ? (
                    <PostList 
                        posts={likedPosts} 
                        loading={isLoadingLikes}
                        emptyTitle="Nenhum post curtido" 
                        emptyDescription="Quando este usuário curtir posts, eles aparecerão aqui."
                    />
                ) : (
                     <EmptyState 
                        title="As curtidas são privadas"
                        description={`@${profileUser.handle} optou por manter suas curtidas privadas.`}
                        icon={Lock}
                     />
                )}
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
            <DialogContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
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
        <CreatePostModal 
            open={isQuoteModalOpen}
            onOpenChange={setIsQuoteModalOpen}
            quotedPost={postToQuote}
        />
        {isFollowListOpen && zisprUser && (
            <FollowListDialog
                open={isFollowListOpen}
                onOpenChange={setIsFollowListOpen}
                title={followListTitle}
                userIds={followListUserIds}
                currentUser={zisprUser}
                onToggleFollow={handleToggleFollow}
            />
        )}
        <ImageViewer post={postToView} onOpenChange={() => setPostToView(null)} />
    </div>
  );
}
