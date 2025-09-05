'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, writeBatch, addDoc, query, where, limit, getDocs } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { Loader2, X, ImageIcon, ListOrdered, Smile, MapPin, Globe, Users, AtSign, BadgeCheck, Bird } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import React from 'react';
import { fileToDataUri, extractSpotifyUrl } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import PollCreator, { PollData } from './poll-creator';
import { useDebounce } from 'use-debounce';


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
    replySettings?: 'everyone' | 'following' | 'mentioned';
}

interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
}

interface CreatePostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quotedPost?: Post | null;
}

type ReplySetting = 'everyone' | 'following' | 'mentioned';

const replyOptions: Record<ReplySetting, { icon: React.ElementType, text: string }> = {
    everyone: { icon: Globe, text: 'Qualquer pessoa pode responder' },
    following: { icon: Users, text: 'Contas que você segue' },
    mentioned: { icon: AtSign, text: 'Apenas contas que você menciona' }
};

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

const MAX_CHARS = 280;

const extractHashtags = (content: string) => {
    const regex = /#(\w+)/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
};

const extractMentions = (content: string) => {
    const regex = /@(\w+)/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches)];
};

interface Suggestion {
    type: 'mention' | 'hashtag';
    data: any;
}

export default function CreatePostModal({ open, onOpenChange, quotedPost }: CreatePostModalProps) {
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postImageDataUri, setPostImageDataUri] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [replySetting, setReplySetting] = useState<ReplySetting>('everyone');
    const [location, setLocation] = useState('');
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollData, setPollData] = useState<PollData | null>(null);

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionType, setSuggestionType] = useState<'mention' | 'hashtag' | null>(null);
    const [debouncedSuggestionQuery] = useDebounce(suggestionQuery, 300);

    const { toast } = useToast();

    const getCurrentWord = () => {
        if (!textareaRef.current) return { word: null, start: -1 };
        const cursor = textareaRef.current.selectionStart;
        const text = textareaRef.current.value;
        const textBeforeCursor = text.substring(0, cursor);
        const lastWordMatch = textBeforeCursor.match(/([@#]\w*)$/);
        if (lastWordMatch) {
            const word = lastWordMatch[1];
            const start = textBeforeCursor.lastIndexOf(word);
            return { word, start };
        }
        return { word: null, start: -1 };
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewPostContent(e.target.value);
    
        const { word } = getCurrentWord();
    
        if (word && (word.startsWith('@') || word.startsWith('#'))) {
            setSuggestionType(word.startsWith('@') ? 'mention' : 'hashtag');
            setSuggestionQuery(word.substring(1));
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };
    
    const handleSuggestionClick = (suggestion: string) => {
        const { start } = getCurrentWord();
        if (start === -1 || !textareaRef.current) return;
    
        const text = textareaRef.current.value;
        const currentWord = text.substring(start, textareaRef.current.selectionStart);
        const textBefore = text.substring(0, start);
        const textAfter = text.substring(start + currentWord.length);
        const newText = `${textBefore}${suggestion} ${textAfter}`;
    
        setNewPostContent(newText);
        setShowSuggestions(false);
        setSuggestionQuery('');

        // Move cursor to the end of the inserted suggestion
         setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPosition = start + suggestion.length + 1;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        }, 0);
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!debouncedSuggestionQuery) {
                setSuggestions([]);
                return;
            }
    
            try {
                let q;
                if (suggestionType === 'mention') {
                    q = query(collection(db, 'users'), where('handle', '>=', `@${debouncedSuggestionQuery}`), where('handle', '<=', `@${debouncedSuggestionQuery}\uf8ff`), limit(5));
                } else { // hashtag
                    q = query(collection(db, 'hashtags'), where('name', '>=', debouncedSuggestionQuery), where('name', '<=', `${debouncedSuggestionQuery}\uf8ff`), limit(5));
                }
    
                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(doc => ({
                    type: suggestionType!,
                    data: doc.data()
                }));
                setSuggestions(results);
            } catch (error) {
                console.error("Error fetching suggestions:", error);
                setSuggestions([]);
            }
        };
    
        if (showSuggestions && debouncedSuggestionQuery) {
            fetchSuggestions();
        } else {
            setSuggestions([]);
        }
    }, [debouncedSuggestionQuery, showSuggestions, suggestionType]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setZisprUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
            }
        });
        return () => unsubscribeUser();
    }, [user]);

    const resetModalState = useCallback(() => {
        setNewPostContent('');
        setPostImageDataUri(null);
        setPostImagePreview(null);
        setReplySetting('everyone');
        setLocation('');
        setShowPollCreator(false);
        setPollData(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        onOpenChange(false);
        setIsPosting(false);
        setShowSuggestions(false);
        setSuggestionQuery('');
    }, [onOpenChange]);

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 150);
        }
    }, [open]);

    useEffect(() => {
        if (!open) {
            const timer = setTimeout(() => {
                resetModalState();
            }, 300); 
            return () => clearTimeout(timer);
        }
    }, [open, resetModalState]);


     const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast({
                title: 'Imagem muito grande',
                description: 'Por favor, selecione uma imagem menor que 10MB.',
                variant: 'destructive',
            });
            return;
        }

        setShowPollCreator(false);
        const dataUri = await fileToDataUri(file);
        setPostImagePreview(URL.createObjectURL(file));
        setPostImageDataUri(dataUri);
    };

    const handleCreatePost = async () => {
        if ((!newPostContent.trim() && !postImageDataUri && !quotedPost) && !pollData) {
            toast({ title: "Não é possível criar um post vazio.", variant: "destructive" });
            return;
        }
        if (!user || !zisprUser) {
            toast({ title: "Você precisa estar logado para postar.", variant: "destructive" });
            return;
        }
        
        setIsPosting(true);

        try {
            let imageUrl: string | null = postImageDataUri;

            const hashtags = extractHashtags(newPostContent);
            const mentionedHandles = extractMentions(newPostContent);
            const spotifyUrl = extractSpotifyUrl(newPostContent);
            
            const quotedPostData = quotedPost ? {
                id: quotedPost.id,
                authorId: quotedPost.authorId,
                author: quotedPost.author,
                handle: quotedPost.handle,
                avatar: quotedPost.avatar,
                avatarFallback: quotedPost.avatarFallback,
                content: quotedPost.content,
                image: quotedPost.image || null,
                isVerified: quotedPost.isVerified || false,
                badgeTier: quotedPost.badgeTier || null,
                createdAt: quotedPost.createdAt
            } : null;


            const postData = {
                authorId: user.uid,
                author: zisprUser.displayName,
                handle: zisprUser.handle,
                avatar: zisprUser.avatar,
                avatarFallback: zisprUser.displayName[0],
                content: newPostContent,
                isVerified: zisprUser.isVerified || zisprUser.handle === '@Rulio',
                badgeTier: zisprUser.badgeTier || null,
                quotedPostId: quotedPost ? quotedPost.id : null,
                quotedPost: quotedPostData,
                location: location.trim() || null,
                poll: pollData ? { options: pollData.options.map(o => o.text), votes: pollData.options.map(() => 0), voters: {} } : null,
                replySettings: replySetting,
                image: imageUrl,
                hashtags,
                mentions: mentionedHandles,
                spotifyUrl,
                createdAt: serverTimestamp(),
                comments: 0,
                retweets: [],
                likes: [],
                views: 0,
                status: 'published',
            };
            
            await addDoc(collection(db, "posts"), postData);
            
            if (hashtags.length > 0) {
                 await runTransaction(db, async (transaction) => {
                    for (const tag of hashtags) {
                        const hashtagRef = doc(db, 'hashtags', tag);
                        const hashtagDoc = await transaction.get(hashtagRef);
                        if (hashtagDoc.exists()) {
                            const currentCount = hashtagDoc.data().count || 0;
                            transaction.update(hashtagRef, { count: currentCount + 1 });
                        } else {
                            transaction.set(hashtagRef, { name: tag, count: 1 });
                        }
                    }
                });
            }
            
            resetModalState();
            toast({
                title: "Post criado!",
                description: "Seu post foi publicado com sucesso.",
            });

        } catch (error: any) {
            console.error("Falha ao criar o post:", error);
            const errorMessage = error.message || "Por favor, tente novamente.";
            toast({ title: "Falha ao criar o post", description: errorMessage, variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };
    
    const onEmojiClick = (emojiData: EmojiClickData) => {
        const cursor = textareaRef.current?.selectionStart ?? newPostContent.length;
        const text = newPostContent.slice(0, cursor) + emojiData.emoji + newPostContent.slice(cursor);
        setNewPostContent(text);
    };

    const handlePollClick = () => {
        if (!showPollCreator) {
            setPostImageDataUri(null);
            setPostImagePreview(null);
        }
        setShowPollCreator(!showPollCreator);
    };
    
    const isSubmitDisabled = (newPostContent.length === 0 && !postImageDataUri && !quotedPost && !pollData) || isPosting || newPostContent.length > MAX_CHARS;
    
    const QuotedPostPreview = ({ post }: { post: Post }) => {
        const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';
        return (
            <div className="mt-2 border rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm">
                    <Avatar className="h-5 w-5">
                        <AvatarImage src={post.avatar} />
                        <AvatarFallback>{post.avatarFallback || post.author[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold flex items-center gap-1">
                        {post.author}
                         {(post.isVerified || post.handle === '@Rulio') && <BadgeCheck className={`h-4 w-4 ${badgeColor}`} />}
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
    
    const CurrentReplyOption = replyOptions[replySetting];

    const SuggestionPopup = () => (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
                suggestion.type === 'mention' ? (
                    <div 
                        key={index} 
                        className="flex items-center p-2 hover:bg-muted cursor-pointer"
                        onClick={() => handleSuggestionClick(suggestion.data.handle)}
                    >
                        <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={suggestion.data.avatar} />
                            <AvatarFallback>{suggestion.data.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{suggestion.data.displayName}</p>
                            <p className="text-sm text-muted-foreground">{suggestion.data.handle}</p>
                        </div>
                    </div>
                ) : (
                    <div 
                        key={index} 
                        className="p-2 hover:bg-muted cursor-pointer"
                        onClick={() => handleSuggestionClick(`#${suggestion.data.name}`)}
                    >
                        <p className="font-bold">#{suggestion.data.name}</p>
                        <p className="text-sm text-muted-foreground">{suggestion.data.count.toLocaleString()} posts</p>
                    </div>
                )
            ))}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetModalState(); else onOpenChange(true); }}>
            <DialogContent 
                className="p-0 gap-0 rounded-2xl bg-background sm:max-w-xl flex flex-col h-auto max-h-[80svh]"
                hideCloseButton={true}
            >
                <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" disabled={isPosting}>
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogClose>
                    <DialogTitle className="sr-only">Novo post</DialogTitle>
                </DialogHeader>

                <main className="px-4 pt-4 pb-0 flex-1 flex flex-col gap-3 overflow-y-auto">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={zisprUser?.avatar} alt={zisprUser?.handle} />
                                <AvatarFallback>{zisprUser?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            { (newPostContent || postImagePreview || quotedPost) && <div className="w-0.5 flex-1 bg-border my-2"></div> }
                        </div>
                        <div className="w-full">
                            <div className="relative">
                                <Textarea
                                    ref={textareaRef}
                                    placeholder="O que está acontecendo?"
                                    className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none min-h-[80px]"
                                    value={newPostContent}
                                    onChange={handleTextChange}
                                    disabled={isPosting}
                                />
                                {showSuggestions && suggestions.length > 0 && <SuggestionPopup />}
                            </div>
                            {showPollCreator && (
                                <div className="mt-2">
                                    <PollCreator onChange={setPollData} />
                                </div>
                            )}
                            {postImagePreview && (
                                <div className="mt-4 relative w-fit">
                                    <Image
                                        src={postImagePreview}
                                        alt="Prévia da imagem"
                                        width={500}
                                        height={300}
                                        className="rounded-lg object-cover w-full h-auto max-h-60"
                                    />
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white"
                                        onClick={() => {
                                            setPostImagePreview(null);
                                            setPostImageDataUri(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            {quotedPost && (
                                <div className="w-full mt-2">
                                    <QuotedPostPreview post={quotedPost} />
                                </div>
                            )}
                            {location && (
                                <div className="mt-2 text-sm text-primary flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="pl-12 flex flex-col gap-2">
                         {quotedPost && (
                            <div className="flex items-center gap-2">
                               <span className="text-sm text-muted-foreground">Respondendo a</span>
                               <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-sm font-semibold">{quotedPost.handle}</span>
                            </div>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 text-primary self-start rounded-full -ml-2 h-auto py-1 px-2">
                                    <CurrentReplyOption.icon className="h-4 w-4"/>
                                    <span className="font-bold text-sm">{CurrentReplyOption.text}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => setReplySetting('everyone')}>
                                    <Globe className="mr-2 h-4 w-4"/>
                                    <span>Qualquer pessoa</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setReplySetting('following')}>
                                    <Users className="mr-2 h-4 w-4"/>
                                    <span>Contas que você segue</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setReplySetting('mentioned')}>
                                    <AtSign className="mr-2 h-4 w-4"/>
                                    <span>Apenas contas que você menciona</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                </main>

                <DialogFooter className="p-2 border-t mt-auto">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex justify-start items-center -ml-2">
                            <Input type="file" className="hidden" ref={imageInputRef} accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} disabled={showPollCreator} />
                            <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isPosting || showPollCreator}>
                                <ImageIcon className="h-5 w-5 text-primary" />
                            </Button>
                             <Button variant="ghost" size="icon" disabled={isPosting} onClick={handlePollClick}>
                                <ListOrdered className="h-5 w-5 text-primary" />
                            </Button>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isPosting}>
                                        <Smile className="h-5 w-5 text-primary" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0">
                                    <EmojiPicker onEmojiClick={onEmojiClick} />
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isPosting}>
                                        <MapPin className="h-5 w-5 text-primary" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Adicionar Localização</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Digite sua cidade ou local.
                                            </p>
                                        </div>
                                        <Input 
                                            id="location" 
                                            placeholder="Ex: São Paulo, Brasil"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="relative h-7 w-7">
                                <svg className="h-full w-full" viewBox="0 0 20 20">
                                    <circle className="text-muted" strokeWidth="2" stroke="currentColor" fill="transparent" r="8" cx="10" cy="10"/>
                                    <circle
                                        className={newPostContent.length > MAX_CHARS ? 'text-destructive' : 'text-primary'}
                                        strokeWidth="2"
                                        strokeDasharray={`${(newPostContent.length / MAX_CHARS) * 2 * Math.PI * 8}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="8"
                                        cx="10"
                                        cy="10"
                                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                    />
                                </svg>
                                {newPostContent.length > 260 && (
                                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${newPostContent.length > MAX_CHARS ? 'text-destructive' : ''}`}>{MAX_CHARS - newPostContent.length}</span>
                                )}
                            </div>
                            <Button onClick={handleCreatePost} disabled={isSubmitDisabled} className="rounded-full font-bold px-5">
                                {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Postar'}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
