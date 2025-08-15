
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MailPlus, Search, Settings, Loader2, MessageSquare } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChirpUser {
    uid: string;
    displayName: string;
    avatar: string;
    handle: string;
}

interface Conversation {
    id: string;
    otherUser: {
        id: string;
        name: string;
        handle: string;
        avatar: string;
    };
    lastMessage: {
        text: string;
        timestamp: any;
        time: string;
    };
    unreadCount: number;
}


export default function MessagesPage() {
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        if (!user) return;
        
        setIsLoading(true);
        const q = query(
            collection(db, "conversations"), 
            where("participants", "array-contains", user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                setConversations([]);
                setIsLoading(false);
                return;
            }

            const convsPromises = snapshot.docs.map(async (docData) => {
                const conversationData = docData.data();
                const otherUserId = conversationData.participants.find((p: string) => p !== user.uid);
                
                if (!otherUserId) return null;

                const userDoc = await getDoc(doc(db, "users", otherUserId));
                if (!userDoc.exists()) return null;
                const otherUserData = userDoc.data();

                return {
                    id: docData.id,
                    otherUser: {
                        id: otherUserData.uid,
                        name: otherUserData.displayName,
                        handle: otherUserData.handle,
                        avatar: otherUserData.avatar
                    },
                    lastMessage: {
                        ...conversationData.lastMessage,
                        time: conversationData.lastMessage.timestamp ? formatDistanceToNow(conversationData.lastMessage.timestamp.toDate(), { addSuffix: true, locale: ptBR }) : ''
                    },
                    unreadCount: 0 // Placeholder
                } as Conversation;
            });
            
            let resolvedConvs = (await Promise.all(convsPromises)).filter(Boolean) as Conversation[];
            
            // Sort client-side
            resolvedConvs.sort((a, b) => {
                const timeA = a.lastMessage?.timestamp?.toMillis() || 0;
                const timeB = b.lastMessage?.timestamp?.toMillis() || 0;
                return timeB - timeA;
            });

            setConversations(resolvedConvs);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [user]);
  
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
           <Avatar className="h-8 w-8 cursor-pointer" onClick={() => user && router.push(`/profile/${user.uid}`)}>
            {chirpUser && <AvatarImage src={chirpUser.avatar} alt={chirpUser.displayName} />}
            <AvatarFallback>{chirpUser?.displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
             <h1 className="text-xl font-bold">Mensagens</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.push('/search')}>
                <MailPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 border-b">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Buscar Mensagens Diretas" className="w-full rounded-full bg-muted pl-10" />
        </div>
      </div>
        
        {isLoading ? (
            <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ): conversations.length === 0 ? (
             <div className="text-center p-8 mt-16">
                <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-bold">Sem mensagens ainda</h2>
                <p className="mt-2 text-muted-foreground">Quando você tiver novas conversas, elas aparecerão aqui.</p>
                 <Button className="mt-4" onClick={() => router.push('/search')}>Encontrar pessoas</Button>
            </div>
        ) : (
             <ul className="divide-y divide-border">
                {conversations.map((convo) => (
                    <li key={convo.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/messages/${convo.id}`)}>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={convo.otherUser.avatar} alt={convo.otherUser.name} />
                                <AvatarFallback>{convo.otherUser.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-baseline gap-2">
                                        <p className="font-bold truncate">{convo.otherUser.name}</p>
                                        <p className="text-sm text-muted-foreground truncate">{convo.otherUser.handle}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">{convo.lastMessage.time}</p>
                                </div>
                                <p className="text-sm text-muted-foreground truncate mt-1">{convo.lastMessage.text}</p>
                            </div>
                        </div>
                    </li>
                ))}
             </ul>
        )}
    </>
  );
}
