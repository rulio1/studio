
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Gift, Loader2, Mail, MapPin, MoreHorizontal, Search, Repeat, Heart, MessageCircle, BarChart2, Bell, Trash2, Edit, Save, Bookmark, BadgeCheck, Bird, Pin, Sparkles, Frown, BarChart3, Flag, Megaphone, UserRound, Info, Star, PenSquare, Lock, HandHeart, UserX, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion, arrayRemove, onSnapshot, DocumentData, QuerySnapshot, writeBatch, serverTimestamp, deleteDoc, setDoc, documentId, addDoc, runTransaction, increment } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ptBR, enUS, es, de } from 'date-fns/locale';
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
import SpotifyEmbed from '@/components/spotify-embed';
import { motion } from 'framer-motion';
import React from 'react';
import { useUserStore } from '@/store/user-store';
import { useTranslation } from '@/hooks/use-translation';

const CreatePostModal = lazy(() => import('@/components/create-post-modal'));
const ImageViewer = lazy(() => import('@/components/image-viewer'));
const PostAnalyticsModal = lazy(() => import('@/components/post-analytics-modal'));
const SaveToCollectionModal = lazy(() => import('@/components/save-to-collection-modal'));

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
    profileVisits?: number;
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
    badgeTier?: 'bronze' | 'silver' | 'gold';
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
    replyingTo: {
        handle: string;
    };
    originalPost: {
        content: string;
        authorHandle: string;
    } | null;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
}

interface Collection {
    id: string;
    name: string;
    postIds: string[];
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
    collections?: Collection[];
    pinnedPostId?: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    supporterTier?: string;
    likesArePrivate?: boolean;
    notificationPreferences?: {
        [key: string]: boolean;
    };
    blocked?: string[];
    blockedBy?: string[];
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

const badgeBorderColors = {
    bronze: 'border-amber-600/50',
    silver: 'border-slate-400/50',
    gold: 'border-yellow-400/50'
};

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
                    {(post.isVerified || isRulio) && <BadgeCheck className={`h-4 w-4 ${isRulio ? 'text-white fill-primary' : badgeColor}`} />}
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


const PostItem = React.memo(function PostItem({ post, user, zisprUser, onAction, onDelete, onEdit, onSave, onPin, onVote, toast, onQuote, onImageClick, onAnalyticsClick }: { post: Post, user: FirebaseUser | null, zisprUser: ZisprUser | null, onAction: (id: string, action: 'like' | 'retweet', authorId: string) => void, onDelete: (id: string) => void, onEdit: (post: Post) => void, onSave: (id: string) => void, onPin: () => void, onVote: (postId: string, optionIndex: number) => Promise<void>, toast: any, onQuote: (post: Post) => void, onImageClick: (post: Post) => void, onAnalyticsClick: (post: Post) => void }) {
    const router = useRouter();
    const { t } = useTranslation();
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
    
    const isZisprAccount = post.handle === '@Zispr' || post.handle === '@ZisprUSA';
    const isRulio = post.handle === '@Rulio';
    const isVerified = post.isVerified || isRulio;
    const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';
    const isEditable = post.createdAt && (new Date().getTime() - post.createdAt.toDate().getTime()) < 5 * 60 * 1000;
    const isRetweeted = Array.isArray(post.retweets) && post.retweets.includes(user?.uid || '');
    const isLiked = Array.isArray(post.likes) && post.likes.includes(user?.uid || '');
    const isSaved = zisprUser?.collections?.some(c => c.postIds.includes(post.id)) ?? false;

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
             {post.repostedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-6">
                    <Repeat className="h-4 w-4" />
                    <span>{post.repostedBy.handle === zisprUser?.handle ? t('post.you') : post.repostedBy.name} {t('post.reposted')}</span>
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
                                {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className={`h-6 w-6 ${isRulio ? 'text-white fill-primary' : badgeColor}`} />)}
                            </p>
                            <p className="text-muted-foreground">{post.handle} · {time}</p>
                            
                            {post.editedAt && <p className="text-xs text-muted-foreground">({t('post.edited')})</p>}
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
                                        <DropdownMenuItem onClick={() => onAnalyticsClick(post)}>
                                            <BarChart3 className="mr-2 h-4 w-4"/>
                                            {t('post.menu.viewEngagements')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            {t('post.menu.delete')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEdit(post)} disabled={!isEditable}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            {t('post.menu.edit')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                         <DropdownMenuItem onClick={onPin}>
                                            <Pin className="mr-2 h-4 w-4"/>
                                            {post.isPinned ? t('post.menu.unpin') : t('post.menu.pin')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toast({ title: t('post.menu.comingSoon.title'), description: t('post.menu.comingSoon.highlights')})}>
                                            <Sparkles className="mr-2 h-4 w-4"/>
                                            {t('post.menu.addHighlights')}
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem onClick={() => onSave(post.id)}>
                                            <Save className="mr-2 h-4 w-4"/>
                                            {isSaved ? t('post.menu.removeFromSaved') : t('post.menu.save')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => toast({ title: t('post.menu.comingSoon.title'), description: t('post.menu.comingSoon.notInterested')})}>
                                            <Frown className="mr-2 h-4 w-4"/>
                                            {t('post.menu.notInterested')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toast({ title: t('post.menu.comingSoon.title'), description: t('post.menu.comingSoon.report')})}>
                                            <Flag className="mr-2 h-4 w-4"/>
                                            {t('post.menu.report')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toast({ title: t('post.menu.comingSoon.title'), description: t('post.menu.comingSoon.viewEngagements')})}>
                                            <BarChart3 className="mr-2 h-4 w-4"/>
                                            {t('post.menu.viewEngagements')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toast({ title: t('post.menu.comingSoon.title'), description: t('post.menu.comingSoon.communityNote')})}>
                                            <Megaphone className="mr-2 h-4 w-4"/>
                                            {t('post.menu.communityNote')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => router.push(`/profile/${post.authorId}`)}>
                                            <UserRound className="mr-2 h-4 w-4"/>
                                            {t('post.menu.goToProfile', { handle: post.handle })}
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
                                        {isRetweeted ? t('post.menu.undoRepost') : t('post.menu.repost')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={(e) => { e.stopPropagation(); onQuote(post); }}
                                    >
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        {t('post.menu.quote')}
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
});

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
    
    const isZisprAccount = reply.handle === '@Zispr' || reply.handle === '@ZisprUSA';
    const isRulio = reply.handle === '@Rulio';
    const isVerified = reply.isVerified || isRulio;
    const badgeColor = reply.badgeTier ? badgeColors[reply.badgeTier] : 'text-primary';

    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${reply.postId}`)}>
            <div className="flex gap-4">
                <Avatar>
                    {isZisprAccount ? (
                        <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                            <Bird className="h-5 w-5 text-primary" />
                        </div>
                    ) : (
                        <>
                            <AvatarImage src={reply.avatar} alt={reply.handle} />
                            <AvatarFallback>{reply.avatarFallback}</AvatarFallback>
                        </>
                    )}
                </Avatar>
                <div className='w-full'>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <p className="font-bold text-base flex items-center gap-1">
                                {reply.author}
                                {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className={`h-6 w-6 ${isRulio ? 'text-white fill-primary' : badgeColor}`} />)}
                            </p>
                            <p className="text-muted-foreground">{reply.handle} · {time}</p>
                        </div>
                    </div>
                    {reply.replyingTo && (
                        <p className="text-sm text-muted-foreground">
                            Respondendo a <span className="text-primary">{reply.replyingTo.handle}</span>
                        </p>
                    )}
                    <p className="mb-1 whitespace-pre-wrap">{reply.content}</p>
                    {reply.originalPost && (
                         <div className="mt-2 border rounded-xl p-2 cursor-pointer hover:bg-muted/50 text-sm">
                            <p className="text-muted-foreground line-clamp-2">
                                <span className="font-bold text-foreground">{reply.originalPost.authorHandle}</span>: {reply.originalPost.content}
                            </p>
                         </div>
                    )}
                </div>
            </div>
        </li>
    )
}

export default function ProfilePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const profileId = params.id as string;
    const { toast } = useToast();
    const { t, language } = useTranslation();

    const { user: currentUser, zisprUser, setUser: setCurrentZisprUser } = useUserStore();
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
    const [isBlockAlertOpen, setIsBlockAlertOpen] = useState(false);
    const [analyticsPost, setAnalyticsPost] = useState<Post | null>(null);
    const [postToSave, setPostToSave] = useState<string | null>(null);


    // Follow list dialog state
    const [followListTitle, setFollowListTitle] = useState('');
    const [followListUserIds, setFollowListUserIds] = useState<string[]>([]);
    const [isFollowListOpen, setIsFollowListOpen] = useState(false);
    
    const isOwnProfile = currentUser?.uid === profileId;
    const isBlockedByYou = zisprUser?.blocked?.includes(profileId);
    const hasBlockedYou = zisprUser?.blockedBy?.includes(profileId);
    
    const dateLocale = { pt: ptBR, en: enUS, es, de }[language];

    useEffect(() => {
        if (searchParams.get('payment_success') === 'true') {
            toast({
                title: "Bem-vindo, Apoiador!",
                description: "Obrigado por apoiar o Zispr! Seu selo de verificação foi aplicado.",
                duration: 5000,
            });
            // Remove o parâmetro da URL para não mostrar o toast novamente
            router.replace(`/profile/${profileId}`, undefined);
        }
    }, [searchParams, toast, profileId, router]);

    const fetchUserPosts = useCallback(async (userToFetch: FirebaseUser, profileData: ZisprUser) => {
        if (!userToFetch || !profileData) return;
        setIsLoadingPosts(true);
        setPinnedPost(null);

        // Fetch Pinned Post
        if (profileData.pinnedPostId) {
            const postDoc = await getDoc(doc(db, 'posts', profileData.pinnedPostId));
            if (postDoc.exists()) {
                const data = postDoc.data();
                if (data.handle === '@stefanysouza') {
                    data.isVerified = true;
                    data.badgeTier = 'silver';
                }
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
        
        const finalPosts = allPosts.map(post => {
            if (post.handle === '@stefanysouza') {
                post.isVerified = true;
                post.badgeTier = 'silver';
            }
            return {
                ...post,
                isLiked: (Array.isArray(post.likes) ? post.likes : []).includes(userToFetch.uid || ''),
                isRetweeted: (Array.isArray(post.retweets) ? post.retweets : []).includes(userToFetch.uid || ''),
            }
        });
    
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
        try {
            const q = query(collection(db, "comments"), where("authorId", "==", profileId));
            const snapshot = await getDocs(q);
    
            if (snapshot.empty) {
                setUserReplies([]);
                setIsLoadingReplies(false);
                return;
            }
    
            const postIds = [...new Set(snapshot.docs.map(doc => doc.data().postId))];
            
            const postDocs = await getDocs(query(collection(db, "posts"), where(documentId(), "in", postIds)));
            const postsMap = new Map(postDocs.docs.map(doc => [doc.id, doc.data()]));
    
            const repliesData = snapshot.docs.map(doc => {
                const commentData = doc.data();
                const originalPost = postsMap.get(commentData.postId);
                const originalPostAuthorHandle = originalPost ? originalPost.handle : '';
                
                 if (commentData.handle === '@stefanysouza') {
                    commentData.isVerified = true;
                    commentData.badgeTier = 'silver';
                }

                return {
                    id: doc.id,
                    ...commentData,
                    time: '', 
                    replyingTo: {
                        handle: originalPostAuthorHandle
                    },
                    originalPost: originalPost ? {
                        content: originalPost.content,
                        authorHandle: originalPost.handle
                    } : null
                } as Reply;
            });
            
            repliesData.sort((a, b) => {
                 const timeA = a.createdAt?.toMillis() || 0;
                 const timeB = b.createdAt?.toMillis() || 0;
                 return timeB - timeA;
            });
    
            setUserReplies(repliesData);
        } catch (error) {
            console.error("Error fetching user replies:", error);
            setUserReplies([]);
        } finally {
            setIsLoadingReplies(false);
        }
    }, [profileId]);


    const fetchLikedPosts = useCallback(async (userToFetch: FirebaseUser, profileData: ZisprUser) => {
        if (profileData.likesArePrivate && profileData.uid !== userToFetch.uid) {
            setLikedPosts([]);
            setIsLoadingLikes(false);
            return;
        }

        setIsLoadingLikes(true);
        try {
            const likedPostIds = profileData.likes || []; // LIKED POSTS ARE ON THE `likes` FIELD, NOT `likedPosts`

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
                    if (data.handle === '@stefanysouza') {
                        data.isVerified = true;
                        data.badgeTier = 'silver';
                    }
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
        const profileDocRef = doc(db, 'users', profileId);
        const unsubscribeProfile = onSnapshot(profileDocRef, async (profileDoc) => {
            if (!currentUser) return;
            if (!profileDoc.exists()) {
                setIsLoading(false);
                setProfileUser(null);
                return;
            }
            const profileData = { uid: profileDoc.id, ...profileDoc.data() } as ZisprUser;

             if (profileData.handle === '@stefanysouza') {
                profileData.isVerified = true;
                profileData.badgeTier = 'silver';
            }
            
            if (profileData.handle === '@ZisprUSA') {
                profileData.isVerified = true;
                profileData.badgeTier = 'silver';
            }

            setProfileUser(profileData);
            setIsFollowing(profileData.followers?.includes(currentUser.uid));
            setIsFollowedBy(zisprUser?.followers?.includes(profileId) || false);

            if (!profileData.blockedBy?.includes(currentUser.uid)) {
                await fetchUserPosts(currentUser, profileData);
                await fetchUserReplies();
                await fetchLikedPosts(currentUser, profileData);
            } else {
                 setUserPosts([]);
                setUserReplies([]);
                setMediaPosts([]);
                setLikedPosts([]);
                setPinnedPost(null);
                setIsLoadingPosts(false);
                setIsLoadingReplies(false);
                setIsLoadingMedia(false);
                setIsLoadingLikes(false);
            }
            setIsLoading(false);
        }, (error) => {
             console.error("Error fetching profile data:", error);
             toast({ title: "Error fetching profile", variant: "destructive" });
             setIsLoading(false);
        });

        return () => unsubscribeProfile();
    }, [profileId, currentUser, zisprUser, fetchUserPosts, fetchUserReplies, fetchLikedPosts, toast]);
    
    const handleToggleFollow = async () => {
        if (!currentUser || !profileUser || !zisprUser) return;
    
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        
        const batch = writeBatch(db);
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const targetUserRef = doc(db, 'users', profileUser.uid);
    
        if (wasFollowing) {
            batch.update(currentUserRef, { following: arrayRemove(profileUser.uid) });
            batch.update(targetUserRef, { followers: arrayRemove(currentUser.uid) });
        } else {
            batch.update(currentUserRef, { 
                following: arrayUnion(profileUser.uid),
                blocked: arrayRemove(profileUser.uid) 
            });
            batch.update(targetUserRef, { 
                followers: arrayUnion(currentUser.uid),
                blockedBy: arrayRemove(currentUser.uid)
            });

            const prefs = profileUser.notificationPreferences;
            const canSendNotification = !prefs || prefs['follow'] !== false;

            if (canSendNotification) {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    toUserId: profileUser.uid,
                    fromUserId: currentUser.uid,
                    fromUser: {
                        name: zisprUser.displayName,
                        handle: zisprUser.handle,
                        avatar: zisprUser.avatar,
                        isVerified: zisprUser.isVerified || false,
                        badgeTier: zisprUser.badgeTier || null
                    },
                    type: 'follow',
                    text: 'notifications.follow',
                    createdAt: serverTimestamp(),
                    read: false,
                });
            }
        }
        
        try {
            await batch.commit();
        } catch (error) {
            setIsFollowing(wasFollowing);
            console.error("Error toggling follow:", error);
            toast({ title: 'Erro ao seguir usuário.', variant: 'destructive' });
        }
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
                        text: `_CONVERSATION_STARTED_`,
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
                title: t('messages.toasts.startError.title'),
                description: t('messages.toasts.startError.description'),
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
                batch.update(userRef, { likes: arrayRemove(postId) });
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
                batch.update(userRef, { likes: arrayUnion(postId) });
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
                            text: `notifications.${action}`,
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
                title: isCurrentlyPinned ? t('post.menu.unpinnedSuccess') : t('post.menu.pinnedSuccess'),
            });
        } catch (error) {
            console.error("Error pinning/unpinning post: ", error);
            toast({ title: t('post.menu.pinError'), variant: 'destructive' });
        }
    };
    
    const handleQuoteClick = (postToQuote: Post) => {
        setPostToQuote(postToQuote);
        setIsQuoteModalOpen(true);
    };

    const PostList = ({ posts, loading, emptyTitle, emptyDescription, emptyIcon }: { posts: Post[], loading: boolean, emptyTitle: string, emptyDescription: string, emptyIcon?: React.ElementType }) => {
        if (loading) {
            return (
                <ul>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                    <li className="p-4 border-b"><PostSkeleton /></li>
                </ul>
            );
        }
    
        if (posts.length === 0) {
            return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />;
        }
    
        return (
            <ul className="divide-y divide-border">
                {posts.map((post) => (
                    <PostItem 
                        key={`${post.id}-${post.repostedAt?.toMillis() || ''}`}
                        post={post}
                        user={currentUser}
                        zisprUser={zisprUser}
                        onAction={handlePostAction}
                        onDelete={setPostToDelete}
                        onEdit={handleEditClick}
                        onSave={() => setPostToSave(post.id)}
                        onPin={() => handleTogglePinPost(post)}
                        onVote={handleVote}
                        toast={toast}
                        onQuote={handleQuoteClick}
                        onImageClick={setPostToView}
                        onAnalyticsClick={setAnalyticsPost}
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
        setFollowListTitle(t('profile.followersDialogTitle'));
        setFollowListUserIds(profileUser.followers);
        setIsFollowListOpen(true);
    }
    
    const showFollowing = () => {
        if (!profileUser) return;
        setFollowListTitle(t('profile.followingDialogTitle'));
        setFollowListUserIds(profileUser.following);
        setIsFollowListOpen(true);
    }

    const handleBlockUser = async () => {
        if (!currentUser || !zisprUser || !profileUser) return;

        const isCurrentlyBlocked = isBlockedByYou;

        const batch = writeBatch(db);
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const profileUserRef = doc(db, 'users', profileId);
        
        if (isCurrentlyBlocked) {
            // Unblock
            batch.update(currentUserRef, { blocked: arrayRemove(profileId) });
            batch.update(profileUserRef, { blockedBy: arrayRemove(currentUser.uid) });
            toast({ title: `${t('profile.alerts.unblocked')} ${profileUser.handle}.` });
        } else {
            // Block
             batch.update(currentUserRef, { 
                following: arrayRemove(profileId),
                blocked: arrayUnion(profileId) 
            });
            batch.update(profileUserRef, { 
                followers: arrayRemove(currentUser.uid),
                blockedBy: arrayUnion(currentUser.uid)
            });
            toast({ title: `${t('profile.alerts.blocked')} ${profileUser.handle}.` });
        }
        
        try {
            await batch.commit();
        } catch (error) {
            console.error("Error blocking/unblocking user:", error);
            toast({ title: t('profile.alerts.error'), description: t('profile.alerts.actionFailed'), variant: "destructive" });
        } finally {
            setIsBlockAlertOpen(false);
        }
    };


    if (isLoading || !profileUser) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isZisprAccount = profileUser.handle === '@Zispr' || profileUser.handle === '@ZisprUSA';
    const isRulioAccount = profileUser.handle === '@Rulio';
    const isProfileVerified = profileUser.isVerified || isRulioAccount;
    const badgeColor = profileUser.badgeTier ? badgeColors[profileUser.badgeTier] : 'text-primary';
    const supporterCardBorderColor = profileUser.badgeTier ? badgeBorderColors[profileUser.badgeTier] : 'border-primary/50';
    const canViewLikes = isOwnProfile || !profileUser.likesArePrivate;
    const tabIndicatorPositions: { [key: string]: number } = {
        posts: 0,
        replies: 1,
        media: 2,
        likes: 3,
    };
    
    const combinedPosts = [...(pinnedPost ? [pinnedPost] : []), ...userPosts];

    return (
        <div className="animate-fade-in">
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex items-center gap-4 px-4 py-2 border-b">
                 <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.back()}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-1">
                        {profileUser.displayName}
                        {isZisprAccount ? <Bird className="h-5 w-5 text-primary" /> : (isProfileVerified && <BadgeCheck className={`h-6 w-6 ${isRulioAccount ? 'text-white fill-primary' : badgeColor}`} />)}
                    </h1>
                    <p className="text-sm text-muted-foreground">{userPosts.length + (pinnedPost ? 1 : 0)} {t('profile.header.posts')}</p>
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
                          <Link href="/profile/edit">{t('profile.buttons.editProfile')}</Link>
                        </Button>
                    ) : (
                        <div className='flex items-center gap-2 mt-4'>
                            <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                     <Button variant="ghost" size="icon" className="border rounded-full"><MoreHorizontal /></Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent>
                                     <DropdownMenuItem onClick={() => setIsBlockAlertOpen(true)} className="text-destructive">
                                         <UserX className="mr-2 h-4 w-4" />
                                         {isBlockedByYou ? t('profile.userActions.unblock', { handle: profileUser.handle }) : t('profile.userActions.block', { handle: profileUser.handle })}
                                     </DropdownMenuItem>
                                 </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" size="icon" className="border rounded-full" onClick={handleStartConversation} disabled={isBlockedByYou || hasBlockedYou}><Mail /></Button>
                            <Button variant="ghost" size="icon" className="border rounded-full" disabled={isBlockedByYou || hasBlockedYou}><Bell /></Button>
                            <Button variant={isFollowing ? 'secondary' : 'default'} className="rounded-full font-bold" onClick={handleToggleFollow} disabled={isBlockedByYou || hasBlockedYou}>
                                {isBlockedByYou ? t('profile.buttons.blocked') : isFollowing ? t('profile.buttons.following') : t('profile.buttons.follow')}
                            </Button>
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold flex items-center gap-1">
                            {profileUser.displayName}
                            {isZisprAccount ? <Bird className="h-6 w-6 text-primary" /> : (isProfileVerified && <BadgeCheck className={`h-6 w-6 ${isRulioAccount ? 'text-white fill-primary' : badgeColor}`} />)}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">{profileUser.handle}</p>
                      {isFollowedBy && !isOwnProfile && <Badge variant="secondary">{t('profile.followsYou')}</Badge>}
                    </div>
                    {hasBlockedYou ? (
                         <div className="mt-2 text-muted-foreground italic flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            <span>{t('profile.block.hasBlockedYou')}</span>
                         </div>
                    ) : (
                        <p className="mt-2 whitespace-pre-wrap">{profileUser.bio}</p>
                    )}
                </div>
                 {profileUser.handle === '@Zispr' && (
                    <Card className="mt-4 border-primary/50">
                        <CardHeader className="flex-row items-center gap-3 space-y-0 p-3">
                            <Info className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm">{t('profile.cards.official.title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-xs text-muted-foreground">{t('profile.cards.official.description')}</p>
                        </CardContent>
                    </Card>
                )}
                 {profileUser.handle === '@ZisprUSA' && (
                    <Card className="mt-4 border-primary/50">
                        <CardHeader className="flex-row items-center gap-3 space-y-0 p-3">
                            <Info className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm">{t('profile.cards.official_en.title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-xs text-muted-foreground">{t('profile.cards.official_en.description')}</p>
                        </CardContent>
                    </Card>
                )}
                {isRulioAccount && (
                    <Card className="mt-4 border-primary/50">
                        <CardHeader className="flex-row items-center gap-3 space-y-0 p-3">
                            <Info className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm">{t('profile.cards.founder.title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-xs text-muted-foreground">{t('profile.cards.founder.description')}</p>
                        </CardContent>
                    </Card>
                )}
                 {profileUser.supporterTier && (
                     <Card className={`mt-4 ${supporterCardBorderColor}`}>
                        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-3">
                            <div className="flex items-center gap-3">
                                <HandHeart className="h-4 w-4 text-primary" />
                                <CardTitle className="text-sm">{profileUser.supporterTier}</CardTitle>
                            </div>
                            
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-xs text-muted-foreground">{t('profile.cards.supporter.description')}</p>
                        </CardContent>
                    </Card>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
                    {profileUser.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{profileUser.location}</span></div>}
                    {profileUser.website && (
                        <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                            <LinkIcon className="h-4 w-4" />
                            <span>{profileUser.website.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                        </a>
                    )}
                    {profileUser.birthDate && (
                        <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            <span>
                                {format(profileUser.birthDate.toDate(), "dd 'de' MMMM", { locale: dateLocale })}
                            </span>
                        </div>
                    )}
                    {profileUser.createdAt && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{t('profile.info.joined')} {format(profileUser.createdAt.toDate(), 'MMMM yyyy', { locale: dateLocale })}</span></div>}
                </div>
                 <div className="flex gap-4 mt-4 text-sm">
                    <button onClick={showFollowing} className="hover:underline"><span className="font-bold text-foreground">{profileUser.following?.length || 0}</span> {t('profile.stats.following')}</button>
                    <button onClick={showFollowers} className="hover:underline"><span className="font-bold text-foreground">{profileUser.followers?.length || 0}</span> {t('profile.stats.followers')}</button>
                </div>
                 {pinnedPost && (
                    <div className="mt-4">
                        <div className="text-sm text-muted-foreground font-semibold flex items-center gap-2 mb-2 px-4">
                            <Pin className="h-4 w-4" /> {t('post.pinned')}
                        </div>
                         <PostList 
                            posts={[pinnedPost]}
                            loading={false}
                            emptyTitle=""
                            emptyDescription=""
                        />
                    </div>
                )}
            </div>
            
            {hasBlockedYou ? (
                 <EmptyState 
                    title={t('profile.block.isBlockedTitle', { handle: profileUser.handle })}
                    description={t('profile.block.isBlockedDescription', { handle: profileUser.handle })}
                    icon={UserX}
                 />
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="w-full justify-center p-2 border-b">
                        <TabsList className="relative grid w-full grid-cols-4 p-1 bg-muted/50 rounded-full h-11">
                            <TabsTrigger value="posts" className="relative z-10 rounded-full text-base">{t('profile.tabs.posts')}</TabsTrigger>
                            <TabsTrigger value="replies" className="relative z-10 rounded-full text-base">{t('profile.tabs.replies')}</TabsTrigger>
                            <TabsTrigger value="media" className="relative z-10 rounded-full text-base">{t('profile.tabs.media')}</TabsTrigger>
                            <TabsTrigger value="likes" className="relative z-10 rounded-full text-base">{t('profile.tabs.likes')}</TabsTrigger>
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
                            emptyTitle={t('profile.emptyStates.posts.title')} 
                            emptyDescription={t('profile.emptyStates.posts.description')}
                        />
                    </TabsContent>
                    <TabsContent value="replies" className="mt-0">
                        <ReplyList 
                            replies={userReplies} 
                            loading={isLoadingReplies} 
                            emptyTitle={t('profile.emptyStates.replies.title')} 
                            emptyDescription={t('profile.emptyStates.replies.description')}
                        />
                    </TabsContent>
                    <TabsContent value="media" className="mt-0">
                        <PostList 
                            posts={mediaPosts} 
                            loading={isLoadingMedia}
                            emptyTitle={t('profile.emptyStates.media.title')} 
                            emptyDescription={t('profile.emptyStates.media.description')}
                        />
                    </TabsContent>
                    <TabsContent value="likes" className="mt-0">
                        {canViewLikes ? (
                            <PostList 
                                posts={likedPosts} 
                                loading={isLoadingLikes}
                                emptyTitle={t('profile.emptyStates.likes.title')} 
                                emptyDescription={t('profile.emptyStates.likes.description')}
                            />
                        ) : (
                            <EmptyState 
                                title={t('profile.emptyStates.privateLikes.title')}
                                description={t('profile.emptyStates.privateLikes.description', { handle: profileUser.handle })}
                                icon={Lock}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            )}
          </main>
            <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{t('profile.dialogs.deletePost.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('profile.dialogs.deletePost.description')}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPostToDelete(null)}>{t('profile.dialogs.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">{t('profile.dialogs.deletePost.confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
                <DialogContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                    <DialogHeader>
                        <DialogTitle>{t('profile.dialogs.editPost.title')}</DialogTitle>
                    </DialogHeader>
                    <Textarea 
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={5}
                        className="my-4"
                    />
                    <Button onClick={handleUpdatePost} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('profile.dialogs.editPost.save')}
                    </Button>
                </DialogContent>
            </Dialog>
             <AlertDialog open={isBlockAlertOpen} onOpenChange={setIsBlockAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isBlockedByYou ? t('profile.dialogs.unblock.title', { handle: profileUser.handle }) : t('profile.dialogs.block.title', { handle: profileUser.handle })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isBlockedByYou
                                ? t('profile.dialogs.unblock.description')
                                : t('profile.dialogs.block.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('profile.dialogs.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlockUser} className={isBlockedByYou ? '' : 'bg-destructive hover:bg-destructive/90'}>
                            {isBlockedByYou ? t('profile.dialogs.unblock.confirm') : t('profile.dialogs.block.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Suspense fallback={<div />}>
                {isQuoteModalOpen && <CreatePostModal 
                    open={isQuoteModalOpen}
                    onOpenChange={setIsQuoteModalOpen}
                    quotedPost={postToQuote}
                />}
                {isFollowListOpen && zisprUser && (
                    <FollowListDialog
                        open={isFollowListOpen}
                        onOpenChange={setIsFollowListOpen}
                        title={followListTitle}
                        userIds={followListUserIds}
                        currentUser={zisprUser}
                        onToggleFollow={async (target, _, isFollowing) => {
                            // A versão simplificada de `handleToggleFollow` para o diálogo.
                            if (!currentUser || !zisprUser) return;
                            const batch = writeBatch(db);
                            const currentUserRef = doc(db, 'users', currentUser.uid);
                            const targetUserRef = doc(db, 'users', target.uid);
                            
                            if (isFollowing) {
                                batch.update(currentUserRef, { following: arrayRemove(target.uid) });
                                batch.update(targetUserRef, { followers: arrayRemove(currentUser.uid) });
                            } else {
                                batch.update(currentUserRef, { following: arrayUnion(target.uid) });
                                batch.update(targetUserRef, { followers: arrayUnion(currentUser.uid) });
                            }
                            await batch.commit();
                        }}
                    />
                )}
                {postToView && <ImageViewer post={postToView} onOpenChange={() => setPostToView(null)} />}
                {analyticsPost && <PostAnalyticsModal post={analyticsPost} onOpenChange={() => setAnalyticsPost(null)} />}
                {postToSave && currentUser && (
                    <SaveToCollectionModal
                        open={!!postToSave}
                        onOpenChange={(open) => !open && setPostToSave(null)}
                        postId={postToSave}
                        currentUser={currentUser}
                    />
                )}
            </Suspense>
        </div>
    );
}

    