
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MoreHorizontal, Send, Loader2, BadgeCheck, Bird } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, updateDoc, increment, setDoc, arrayUnion } from 'firebase/firestore';


interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
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

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = params.id as string;
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [otherUser, setOtherUser] = useState<ZisprUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);


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

                    const otherUserId = conversationId.replace(currentUser.uid, '').replace('_', '');
                    const userDoc = await getDoc(doc(db, 'users', otherUserId));
                    if (userDoc.exists()) {
                        setOtherUser({ uid: userDoc.id, ...userDoc.data() } as ZisprUser);
                    }
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


    if (isLoading) {
        return (
             <div className="flex flex-col h-screen bg-background">
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
             <div className="flex flex-col h-screen bg-background">
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
    
    const isZisprAccount = otherUser.handle === '@Zispr';
    const isOtherUserVerified = otherUser.isVerified || otherUser.handle === '@rulio' || isZisprAccount;

  return (
    <div className="flex flex-col h-screen bg-background">
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
                            {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isOtherUserVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                        </h1>
                        <p className="text-xs text-muted-foreground">{otherUser.handle}</p>
                    </div>
                </div>
            </div>
            <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        </div>
      </header>
        <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pb-40 md:pb-24" ref={scrollAreaRef}>
                <div className="p-4 space-y-4">
                    {messages.map((message, index) => {
                        const isLastMessage = index === messages.length - 1;
                        const isMyMessage = message.senderId === user?.uid;
                        const isRead = isLastMessage && isMyMessage && !!conversation?.lastMessageReadBy?.includes(otherUser.uid);

                        return (
                            <div key={message.id}>
                                <div className={`flex items-end gap-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
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
                                <div className={`rounded-2xl px-4 py-2 max-w-[80%] md:max-w-[60%] ${isMyMessage ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
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
        </main>
      <div className="fixed bottom-0 inset-x-0 p-4 pt-2 border-t bg-background mb-16 md:mb-0">
           <div className="relative flex items-center rounded-2xl border bg-muted p-2">
              <Input 
                  placeholder="Inicie uma nova mensagem"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isSending}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} size="icon" className="rounded-full">
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
          </div>
      </div>
    </div>
  );
}
