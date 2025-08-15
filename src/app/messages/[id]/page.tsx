
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MoreHorizontal, Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, updateDoc, increment, setDoc } from 'firebase/firestore';


interface ChirpUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
}

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = params.id as string;
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [otherUser, setOtherUser] = useState<ChirpUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
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
                    if (!conversationDoc.exists() || !conversationDoc.data().participants.includes(currentUser.uid)) {
                         setOtherUser(null);
                         setIsLoading(false);
                         return;
                    }

                    const otherUserId = conversationId.replace(currentUser.uid, '').replace('_', '');
                    const userDoc = await getDoc(doc(db, 'users', otherUserId));
                    if (userDoc.exists()) {
                        setOtherUser({ uid: userDoc.id, ...userDoc.data() } as ChirpUser);
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
        if (user && conversationId) {
            const conversationRef = doc(db, 'conversations', conversationId);
            // This overwrites the whole map, which is fine for this use case.
            // A more complex app might need to use dot notation for a specific field.
            setDoc(conversationRef, { unreadCounts: { [user.uid]: 0 } }, { merge: true });
        }
    }, [user, conversationId]);


    useEffect(() => {
        if (!conversationId) return;

        const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [conversationId]);


    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
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
                [unreadCountKey]: increment(1)
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
    
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push(`/profile/${otherUser.uid}`)}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={otherUser.avatar} alt={otherUser.displayName} />
                        <AvatarFallback>{otherUser.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-lg font-bold">{otherUser.displayName}</h1>
                        <p className="text-xs text-muted-foreground">{otherUser.handle}</p>
                    </div>
                </div>
            </div>
            <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-3 ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                       {message.senderId !== user?.uid && (
                           <Avatar className="h-8 w-8">
                               <AvatarImage src={otherUser.avatar} alt={otherUser.displayName} />
                               <AvatarFallback>{otherUser.displayName[0]}</AvatarFallback>
                           </Avatar>
                       )}
                       <div className={`rounded-lg px-4 py-2 max-w-xs md:max-w-md ${message.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                           <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                       </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t">
            <div className="flex items-center gap-2">
                <Input 
                    placeholder="Inicie uma nova mensagem"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSending}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending}>
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}
