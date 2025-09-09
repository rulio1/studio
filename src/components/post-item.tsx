
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUserStore } from '@/store/user-store';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { formatTimeAgo } from '@/lib/utils';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where } from 'firebase/firestore';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import SpotifyEmbed from '@/components/spotify-embed';
import Poll from '@/components/poll';

import { 
    Repeat, Heart, BarChart2, MessageCircle, MoreHorizontal, PenSquare, Trash2, Edit, Pin, Sparkles, Frown, 
    Flag, BarChart3, Megaphone, UserRound, Star, Bird, BadgeCheck, Languages, Save
} from 'lucide-react';
import { translateText } from '@/ai/flows/translation-flow';

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

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

const PostContent = React.memo(function PostContent({ content, spotifyUrl }: { content: string, spotifyUrl?: string }) {
    const router = useRouter();
    const parts = content.split(/(#\w+|@\w+|https?:\/\/[^\s]+)/g);
    
    const spotifyLinkIndex = parts.findIndex(part => part && part.includes('spotify.com'));

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
});
PostContent.displayName = 'PostContent';

const PostItem = React.memo(function PostItem({ post, zisprUser, user, handlePostAction, handleQuoteClick, handleDeleteClick, handleEditClick, handleTogglePinPost, onVote, onImageClick, onAnalyticsClick, onSaveClick }: { 
    post: Post; 
    zisprUser: ZisprUser | null; 
    user: FirebaseUser | null;
    handlePostAction: (postId: string, action: 'like' | 'retweet', authorId: string) => void;
    handleQuoteClick: (post: Post) => void;
    handleDeleteClick: (postId: string) => void;
    handleEditClick: (post: Post) => void;
    handleTogglePinPost: (postId: string) => void;
    onVote: (postId: string, optionIndex: number) => void;
    onImageClick: (post: Post) => void;
    onAnalyticsClick: (post: Post) => void;
    onSaveClick: (postId: string) => void;
}) {
    const router = useRouter();
    const { toast } = useToast();
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
    
    const isZisprAccount = post.handle === '@Zispr' || post.handle === '@ZisprUSA';
    const isRulio = post.handle === '@Rulio';
    const isVerified = post.isVerified || isRulio;
    const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';
    const isEditable = post.createdAt && (new Date().getTime() - post.createdAt.toDate().getTime()) < 5 * 60 * 1000;
    
    const isSaved = zisprUser?.collections?.some(c => c.postIds.includes(post.id)) ?? false;


    const QuotedPostPreview = ({ post }: { post: Omit<Post, 'quotedPost' | 'quotedPostId'> }) => {
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
                        {(post.isVerified || isRulio) && <BadgeCheck className={`h-4 w-4 ${isRulio ? 'text-primary fill-primary' : badgeColor}`} />}
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
        )
    };
    
    return (
        <li className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)} data-post-id={post.id}>
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
             {post.isUpdate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-12">
                    <Bird className="h-4 w-4 text-primary" />
                    <span>Atualização</span>
                </div>
            )}
            <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                    {post.repostedBy ? (
                        <Avatar className="h-6 w-6 mb-1 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.repostedBy!.handle.replace('@', '')}`)}}>
                            <AvatarImage src={post.repostedBy.avatar} />
                            <AvatarFallback>{post.repostedBy.name[0]}</AvatarFallback>
                        </Avatar>
                    ) : null}
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
                </div>
                <div className='w-full'>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                        <p className="font-bold text-base flex items-center gap-1">
                            {post.author} 
                            {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className={`h-4 w-4 ${isRulio ? 'text-primary fill-primary' : badgeColor}`} />)}
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
                                    <DropdownMenuItem onClick={() => onAnalyticsClick(post)}>
                                        <BarChart3 className="mr-2 h-4 w-4"/>
                                        Ver interações
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteClick(post.id)} className="text-destructive">
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
                                    <DropdownMenuItem onClick={() => onSaveClick(post.id)}>
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
                                     <DropdownMenuItem onClick={() => onAnalyticsClick(post)}>
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
                    <div className="mt-2 relative w-full max-h-[500px] overflow-hidden rounded-2xl border cursor-pointer" onClick={(e) => { e.stopPropagation(); onImageClick(post); }}>
                        <Image src={post.image} alt="Imagem do post" width={500} height={500} className="w-full h-auto object-contain" data-ai-hint={post.imageHint} />
                    </div>
                )}
                {post.gifUrl && (
                     <div className="mt-2 aspect-video relative w-full overflow-hidden rounded-2xl border" onClick={(e) => e.stopPropagation()}>
                        <Image src={post.gifUrl} alt="Post GIF" layout="fill" objectFit="contain" unoptimized />
                    </div>
                )}
                <div className="mt-2 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`)}} className="flex items-center gap-1 hover:text-primary transition-colors">
                        <MessageCircle className="h-5 w-5" />
                        <span>{post.comments}</span>
                    </button>
                    
                    <Popover>
                        <PopoverTrigger asChild>
                             <button onClick={(e) => e.stopPropagation()} className={`flex items-center gap-1 hover:text-green-500 transition-colors ${post.isRetweeted ? "text-green-500" : ""}`}>
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

                    <button onClick={(e) => {e.stopPropagation(); handlePostAction(post.id, 'like', post.authorId)}} className={`flex items-center gap-1 ${post.isLiked ? "text-red-500" : ""}`}>
                        <Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${post.isLiked ? "fill-current" : ""}`} />
                        <span>{Array.isArray(post.likes) ? post.likes.length : 0}</span>
                    </button>
                    <button
                        className="flex items-center gap-1 hover:text-primary transition-colors disabled:cursor-not-allowed"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (user?.uid === post.authorId) {
                                onAnalyticsClick(post);
                            }
                        }}
                        disabled={user?.uid !== post.authorId}
                    >
                        <BarChart2 className="h-5 w-5" />
                        <span>{post.views}</span>
                    </button>
                </div>
                </div>
            </div>
        </li>
    );
});
PostItem.displayName = 'PostItem';

export default PostItem;
