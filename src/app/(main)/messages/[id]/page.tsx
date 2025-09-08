
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MoreHorizontal, Send, Loader2, BadgeCheck, Bird, Smile, UserX, ShieldAlert, Mic, Trash, Play, Pause, Square } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, updateDoc, increment, arrayUnion, arrayRemove, runTransaction, writeBatch } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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


interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    blocked?: string[];
    blockedBy?: string[];
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
    reactions?: Record<string, string[]>; // emoji: [userId1, userId2]
    audioUrl?: string;
    audioDuration?: number;
}

interface Conversation {
    participants: string[];
    lastMessage?: {
        senderId: string;
    };
    lastMessageReadBy?: string[];
    unreadCounts?: Record<string, number>;
    deletedFor?: string[];
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

const AudioPlayer = ({ audioUrl }: { audioUrl: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    const handleTimeUpdate = () => {
        if(audioRef.current) setCurrentTime(audioRef.current.currentTime);
    }
    
    const handleLoadedMetadata = () => {
        if(audioRef.current) setDuration(audioRef.current.duration);
    }
    
    const formatTime = (time: number) => {
        if (isNaN(time) || time < 0) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return (
        <div className="flex items-center gap-3 w-52 md:w-64">
            <audio 
                ref={audioRef} 
                src={audioUrl} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
            />
            <Button onClick={togglePlayPause} size="icon" className="h-10 w-10 rounded-full shrink-0">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="w-full h-1 bg-muted rounded-full">
                <div 
                    className="h-1 bg-primary rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%`}}
                ></div>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{formatTime(duration)}</span>
        </div>
    );
};


const AudioPreview = ({ audioBlob, onDiscard }: { audioBlob: Blob, onDiscard: () => void }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);

     useEffect(() => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            const audio = new Audio(url);
            audio.onloadedmetadata = () => {
                setDuration(audio.duration);
            };
            audioRef.current = audio;

            const handleEnded = () => setIsPlaying(false);
            audio.addEventListener('ended', handleEnded);

            return () => {
                URL.revokeObjectURL(url);
                if (audio) {
                    audio.removeEventListener('ended', handleEnded);
                }
            };
        }
    }, [audioBlob]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };
    
    return (
         <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onDiscard}>
                 <Trash className="h-4 w-4 text-destructive" />
             </Button>
            <Button onClick={togglePlay} size="icon" className="h-8 w-8 rounded-full shrink-0">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
             <span className="text-sm text-muted-foreground font-mono">{duration.toFixed(1)}s</span>
        </div>
    )
};


export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const conversationId = params.id as string;
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [otherUser, setOtherUser] = useState<ZisprUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isBlockAlertOpen, setIsBlockAlertOpen] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
                    const conversationData = conversationDoc.data();
                    if (!conversationDoc.exists() || !conversationData?.participants?.includes(currentUser.uid)) {
                         setOtherUser(null);
                         setIsLoading(false);
                         return;
                    }

                    const zisprUserDocRef = doc(db, 'users', currentUser.uid);
                    onSnapshot(zisprUserDocRef, (doc) => {
                        if (doc.exists()) {
                            setZisprUser({ uid: doc.id, ...doc.data() } as ZisprUser);
                        }
                    });

                    const otherUserId = conversationId.replace(currentUser.uid, '').replace('_', '');
                    const userDocRef = doc(db, 'users', otherUserId);
                    onSnapshot(userDocRef, (doc) => {
                        if (doc.exists()) {
                            const data = { uid: doc.id, ...doc.data() } as ZisprUser
                            if (data.handle === '@stefanysouza') {
                                data.isVerified = true;
                                data.badgeTier = 'silver';
                            }
                            setOtherUser(data);
                        }
                    });

                } catch (error) {
                    console.error("Erro ao buscar dados do usuário:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router, conversationId]);

    // Mark messages as read when entering conversation
    useEffect(() => {
        if (!user || !conversationId || !conversation) return;

        const conversationRef = doc(db, 'conversations', conversationId);

        // Mark last message as read by current user
        if (conversation.lastMessage?.senderId !== user.uid) {
            if (conversation.lastMessageReadBy && !conversation.lastMessageReadBy.includes(user.uid)) {
                updateDoc(conversationRef, {
                    lastMessageReadBy: arrayUnion(user.uid)
                });
            }
        }
        
        // Reset unread count for the current user
        const unreadCountKey = `unreadCounts.${user.uid}`;
        if (conversation.unreadCounts && conversation.unreadCounts.hasOwnProperty(user.uid) && conversation.unreadCounts[user.uid] > 0) {
            updateDoc(conversationRef, { [unreadCountKey]: 0 });
        }

    }, [user, conversationId, conversation]);


    useEffect(() => {
        if (!conversationId) return () => {};

        const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
        });

        const conversationRef = doc(db, 'conversations', conversationId);
        const unsubscribeConversation = onSnapshot(conversationRef, (doc) => {
            if (doc.exists()) {
                setConversation(doc.data() as Conversation);
            }
        });


        return () => {
            unsubscribeMessages();
            unsubscribeConversation();
        };
    }, [conversationId]);


    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user || isSending || !otherUser) return;
        
        setIsSending(true);
        try {
            const conversationRef = doc(db, 'conversations', conversationId);
            
            // Add message to subcollection
            await addDoc(collection(conversationRef, 'messages'), {
                senderId: user.uid,
                text: newMessage,
                createdAt: serverTimestamp(),
                reactions: {},
            });

            // Update last message and increment unread count for the other user
            const unreadCountKey = `unreadCounts.${otherUser.uid}`;
            await updateDoc(conversationRef, {
                lastMessage: {
                    text: newMessage,
                    senderId: user.uid,
                    timestamp: serverTimestamp()
                },
                lastMessageReadBy: [user.uid], // Reset read status, only sender has read it
                [unreadCountKey]: increment(1),
                deletedFor: [], // If a user deleted it before, bring it back on new message
            });

            setNewMessage('');

        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user) return;
        const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);

        try {
            await runTransaction(db, async (transaction) => {
                const messageDoc = await transaction.get(messageRef);
                if (!messageDoc.exists()) {
                    throw "Mensagem não encontrada!";
                }

                const currentReactions = messageDoc.data().reactions || {};
                const reactionForEmoji = currentReactions[emoji] || [];
                const userHasReactedWithEmoji = reactionForEmoji.includes(user.uid);

                const newReactions = { ...currentReactions };
                
                // User is removing their reaction
                if (userHasReactedWithEmoji) {
                    newReactions[emoji] = reactionForEmoji.filter((uid: string) => uid !== user.uid);
                    // If no one else has this reaction, remove the emoji key
                    if (newReactions[emoji].length === 0) {
                        delete newReactions[emoji];
                    }
                } 
                // User is adding a new reaction
                else {
                    newReactions[emoji] = [...reactionForEmoji, user.uid];
                }
                
                transaction.update(messageRef, { reactions: newReactions });
            });
        } catch (error) {
            console.error("Erro ao reagir à mensagem:", error);
            toast({
                title: "Erro",
                description: "Não foi possível adicionar sua reação.",
                variant: "destructive"
            });
        }
    };

    const handleBlockUser = async () => {
        if (!user || !otherUser) return;

        const batch = writeBatch(db);
        const currentUserRef = doc(db, 'users', user.uid);
        const otherUserRef = doc(db, 'users', otherUser.uid);

        // Remove follow relationships
        batch.update(currentUserRef, { 
            following: arrayRemove(otherUser.uid),
            blocked: arrayUnion(otherUser.uid)
        });
        batch.update(otherUserRef, { 
            followers: arrayRemove(user.uid),
            blockedBy: arrayUnion(user.uid)
        });

        try {
            await batch.commit();
            toast({
                title: `Bloqueado`,
                description: `Você bloqueou ${otherUser.handle}.`,
            });
            setIsBlockAlertOpen(false);
            router.push('/messages');
        } catch(error) {
            console.error("Error blocking user:", error);
            toast({
                title: "Erro",
                description: `Não foi possível bloquear ${otherUser.handle}.`,
                variant: "destructive"
            });
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop microphone access
                if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            recordingStartTimeRef.current = Date.now();
            setRecordingDuration(0);

            recordingIntervalRef.current = setInterval(() => {
                if (recordingStartTimeRef.current) {
                    setRecordingDuration((Date.now() - recordingStartTimeRef.current) / 1000);
                }
            }, 100);

        } catch (error) {
            console.error("Error starting recording:", error);
            toast({ title: "Erro de Gravação", description: "Não foi possível acessar o microfone.", variant: "destructive" });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    
   const sendAudioMessage = async () => {
    if (!audioBlob || !user || !otherUser) return;
    setIsSending(true);

    try {
        const storage = getStorage();
        const filePath = `audio_messages/${conversationId}/${Date.now()}.webm`;
        const audioStorageRef = storageRef(storage, filePath);

        await uploadBytes(audioStorageRef, audioBlob);
        const downloadURL = await getDownloadURL(audioStorageRef);

        const conversationRef = doc(db, 'conversations', conversationId);
        const batch = writeBatch(db);

        // Add audio message to subcollection
        const messageRef = doc(collection(conversationRef, 'messages'));
        batch.set(messageRef, {
            senderId: user.uid,
            audioUrl: downloadURL,
            audioDuration: recordingDuration,
            text: '',
            createdAt: serverTimestamp(),
            reactions: {},
        });
        
        // Update last message in conversation
        batch.update(conversationRef, {
            lastMessage: {
                text: '🎤 Mensagem de voz',
                senderId: user.uid,
                timestamp: serverTimestamp()
            },
            lastMessageReadBy: [user.uid],
            [`unreadCounts.${otherUser.uid}`]: increment(1),
            deletedFor: [],
        });
        
        await batch.commit();

        setAudioBlob(null);
        setRecordingDuration(0);

    } catch (error) {
        console.error("Error sending audio message:", error);
        toast({ title: "Erro", description: "Não foi possível enviar a mensagem de voz.", variant: "destructive" });
    } finally {
        setIsSending(false);
    }
};
    
    const handleDiscardAudio = () => {
        setAudioBlob(null);
        setRecordingDuration(0);
    }
    
    const formatRecordingTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
             <div className="flex flex-col h-full bg-background">
                 <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                     <div className="flex items-center gap-4 px-4 py-2">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                             <Loader2 className="h-6 w-6 animate-spin" />
                             <h1 className="text-lg font-bold">Carregando...</h1>
                        </div>
                    </div>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

     if (!otherUser) {
        return (
             <div className="flex flex-col h-full bg-background">
                 <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                     <div className="flex items-center gap-4 px-4 py-2">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                         <h1 className="text-lg font-bold">Conversa não encontrada</h1>
                    </div>
                </header>
                 <div className="flex-1 flex items-center justify-center text-center p-4">
                    <p className="text-muted-foreground">Não foi possível carregar os detalhes da conversa. O usuário pode não existir ou você não tem permissão para vê-la.</p>
                </div>
            </div>
        );
    }
    
    const isZisprAccount = otherUser.handle === '@Zispr' || otherUser.handle === '@ZisprUSA';
    const isOtherUserVerified = otherUser.isVerified || otherUser.handle === '@Rulio';
    const badgeColor = otherUser.badgeTier ? badgeColors[otherUser.badgeTier] : 'text-primary';
    const isBlockedByYou = zisprUser?.blocked?.includes(otherUser.uid);
    const hasBlockedYou = zisprUser?.blockedBy?.includes(otherUser.uid);
    const isConversationDisabled = isBlockedByYou || hasBlockedYou;

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/messages')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push(`/profile/${otherUser.uid}`)}>
                    <Avatar className="h-8 w-8">
                         {isZisprAccount ? (
                            <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                                <Bird className="h-5 w-5 text-primary" />
                            </div>
                        ) : (
                            <>
                                <AvatarImage src={otherUser.avatar} alt={otherUser.displayName} />
                                <AvatarFallback>{otherUser.displayName[0]}</AvatarFallback>
                            </>
                        )}
                    </Avatar>
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-1">
                            {otherUser.displayName}
                            {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isOtherUserVerified && <BadgeCheck className={`h-4 w-4 ${badgeColor}`} />)}
                        </h1>
                        <p className="text-xs text-muted-foreground">{otherUser.handle}</p>
                    </div>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setIsBlockAlertOpen(true)} className="text-destructive">
                        <UserX className="mr-2 h-4 w-4" />
                        Bloquear {otherUser.handle}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
                {messages.map((message, index) => {
                    const isLastMessage = index === messages.length - 1;
                    const isMyMessage = message.senderId === user?.uid;
                    const isRead = isLastMessage && isMyMessage && !!conversation?.lastMessageReadBy?.includes(otherUser.uid);

                    const reactionEntries = Object.entries(message.reactions || {}).filter(([, uids]) => uids.length > 0);

                    return (
                        <div key={message.id}>
                             <div className={`group flex items-end gap-2 relative ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                {!message.audioUrl && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className={`absolute -top-4 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isMyMessage ? 'left-0' : 'right-0'}`}>
                                                <Smile className="h-5 w-5 text-muted-foreground" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-none">
                                            <EmojiPicker onEmojiClick={(emojiData: EmojiClickData) => handleReaction(message.id, emojiData.emoji)} />
                                        </PopoverContent>
                                    </Popover>
                                )}
                                
                                {!isMyMessage && (
                                    <Avatar className="h-8 w-8">
                                        {isZisprAccount ? (
                                            <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                                                <Bird className="h-5 w-5 text-primary" />
                                            </div>
                                        ) : (
                                            <>
                                                <AvatarImage src={otherUser.avatar} alt={otherUser.displayName} />
                                                <AvatarFallback>{otherUser.displayName[0]}</AvatarFallback>
                                            </>
                                        )}
                                    </Avatar>
                                )}
                                <div className={`relative rounded-2xl px-4 py-2 max-w-[80%] md:max-w-[70%] ${isMyMessage ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                                     {message.audioUrl ? (
                                        <AudioPlayer audioUrl={message.audioUrl} />
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                    )}
                                    {reactionEntries.length > 0 && !message.audioUrl && (
                                        <div className={`absolute -bottom-4 flex gap-1 ${isMyMessage ? 'right-0' : 'left-0'}`}>
                                            {reactionEntries.map(([emoji, uids]) => (
                                                <div 
                                                    key={emoji}
                                                    onClick={() => handleReaction(message.id, emoji)}
                                                    className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 cursor-pointer border ${uids.includes(user!.uid) ? 'bg-primary/20 border-primary' : 'bg-muted/80 border-border'}`}
                                                >
                                                    <span>{emoji}</span>
                                                    <span className="font-semibold">{uids.length}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isRead && (
                                <div className="text-right text-xs text-muted-foreground mt-1 pr-2">
                                    Lida
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
        <footer className="p-4 pt-2 border-t bg-background">
            {audioBlob && !isSending ? (
                 <div className="relative flex items-center justify-between rounded-2xl border bg-background p-2 gap-2">
                     <AudioPreview audioBlob={audioBlob} onDiscard={handleDiscardAudio} />
                     <Button onClick={sendAudioMessage} size="icon" className="rounded-full shrink-0">
                         <Send className="h-5 w-5" />
                     </Button>
                 </div>
            ) : (
                 <div className="relative flex items-center rounded-2xl border bg-background p-2">
                     {isRecording ? (
                         <div className="w-full flex items-center px-2">
                             <div className="h-2.5 w-2.5 bg-destructive rounded-full animate-pulse mr-2"></div>
                             <span className="text-sm text-muted-foreground font-mono animate-pulse">{formatRecordingTime(recordingDuration)}</span>
                         </div>
                     ) : (
                         <Input 
                             placeholder={isConversationDisabled ? "Não é possível enviar mensagens" : "Inicie uma nova mensagem"}
                             value={newMessage}
                             onChange={(e) => setNewMessage(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                             disabled={isSending || isConversationDisabled}
                             className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                         />
                     )}

                     {newMessage.trim() ? (
                        <Button onClick={handleSendMessage} disabled={isSending} size="icon" className="rounded-full">
                           {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                     ) : (
                        <Button 
                            onClick={toggleRecording}
                            disabled={isSending || isConversationDisabled}
                            size="icon" 
                            variant="ghost"
                            className="rounded-full"
                        >
                            {isRecording ? <Square className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                        </Button>
                     )}
                 </div>
            )}
        </footer>
      </div>
    </div>
    
     <AlertDialog open={isBlockAlertOpen} onOpenChange={setIsBlockAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Bloquear {otherUser.handle}?</AlertDialogTitle>
                <AlertDialogDescription>
                    Eles não poderão seguir ou enviar mensagens para você, e você não verá notificações deles. Eles não serão notificados que foram bloqueados.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleBlockUser} className="bg-destructive hover:bg-destructive/90">
                    Bloquear
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
