
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MailPlus, Search, Settings, Loader2, MessageSquare, Pin, Archive, Trash2 } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, deleteDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewMessageModal from '@/components/new-message-modal';
import { useGesture } from '@use-gesture/react';
import { useToast } from '@/hooks/use-toast';

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
        senderId: string;
    };
    unreadCount: number;
}


const ConversationItem = ({ convo, currentUserId, onSwipeOpen, onActionClick, isSwiped }: { convo: Conversation; currentUserId: string | null; onSwipeOpen: (id: string) => void; onActionClick: (convoId: string, action: 'pin' | 'archive' | 'delete') => void; isSwiped: boolean; }) => {
    const router = useRouter();
    const itemRef = useRef<HTMLLIElement>(null);
    const [time, setTime] = useState(() => convo.lastMessage.timestamp ? formatDistanceToNow(convo.lastMessage.timestamp.toDate(), { addSuffix: true, locale: ptBR }) : '');
    
    useEffect(() => {
        if (convo.lastMessage.timestamp) {
            setTime(formatDistanceToNow(convo.lastMessage.timestamp.toDate(), { addSuffix: true, locale: ptBR }));
        }
    }, [convo.lastMessage.timestamp]);

    const bind = useGesture({
        onDrag: ({ down, movement: [mx], direction: [dx], event }) => {
            event.stopPropagation();
            if (itemRef.current) {
                if (mx < 0 && dx < 0) { // Swiping left
                    const newX = Math.max(mx, -200); // Limit swipe distance
                    itemRef.current.style.transform = `translateX(${newX}px)`;
                    if (newX < -50) {
                        onSwipeOpen(convo.id);
                    }
                } else if (mx > 0) { // Swiping right to close
                    itemRef.current.style.transform = `translateX(0px)`;
                }
            }
        },
        onDragEnd: ({ movement: [mx] }) => {
            if (itemRef.current) {
                if (mx < -100) { // Threshold to keep open
                    itemRef.current.style.transform = `translateX(-180px)`;
                    onSwipeOpen(convo.id);
                } else {
                    itemRef.current.style.transform = 'translateX(0)';
                }
            }
        },
    });

    // Reset style if another item is swiped
    useEffect(() => {
        if (!isSwiped && itemRef.current) {
            itemRef.current.style.transform = 'translateX(0)';
        }
    }, [isSwiped]);

    const isMyMessage = convo.lastMessage.senderId === currentUserId;
    const isUnread = convo.unreadCount > 0;
    const messagePreview = `${isMyMessage ? 'Você: ' : ''}${convo.lastMessage.text}`;

    return (
        <div className="relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full flex items-center z-0">
                 <button onClick={() => onActionClick(convo.id, 'pin')} className="h-full flex flex-col items-center justify-center bg-blue-500 text-white w-20 p-2"><Pin className="h-5 w-5 mb-1"/> <span className="text-xs">Fixar</span></button>
                <button onClick={() => onActionClick(convo.id, 'archive')} className="h-full flex flex-col items-center justify-center bg-gray-500 text-white w-20 p-2"><Archive className="h-5 w-5 mb-1"/> <span className="text-xs">Arquivar</span></button>
                <button onClick={() => onActionClick(convo.id, 'delete')} className="h-full flex flex-col items-center justify-center bg-red-500 text-white w-20 p-2"><Trash2 className="h-5 w-5 mb-1"/> <span className="text-xs">Apagar</span></button>
            </div>
            <li 
                ref={itemRef}
                {...bind()}
                onClick={() => router.push(`/messages/${convo.id}`)}
                className={`w-full p-4 hover:bg-muted/50 cursor-pointer bg-background relative z-10 transition-transform duration-200 ease-in-out ${isUnread ? 'border-l-2 border-primary' : ''}`}
            >
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
                            <p className="text-xs text-muted-foreground whitespace-nowrap">{time}</p>
                        </div>
                        <div className="flex justify-between items-center">
                           <p className={`text-sm mt-1 truncate ${isUnread && !isMyMessage ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                               {messagePreview}
                           </p>
                           {isUnread && !isMyMessage && (
                               <div className="w-2.5 h-2.5 bg-primary rounded-full ml-2 flex-shrink-0"></div>
                           )}
                        </div>
                    </div>
                </div>
            </li>
        </div>
    );
};


export default function MessagesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [swipedConversationId, setSwipedConversationId] = useState<string | null>(null);


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
                    },
                    unreadCount: conversationData.unreadCounts?.[user.uid] || 0
                } as Conversation;
            });
            
            let resolvedConvs = (await Promise.all(convsPromises)).filter(Boolean) as Conversation[];
            
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

    const handleSwipeOpen = (id: string) => {
        setSwipedConversationId(id);
    };

    const handleActionClick = async (convoId: string, action: 'pin' | 'archive' | 'delete') => {
        if (action === 'delete') {
            try {
                await deleteDoc(doc(db, 'conversations', convoId));
                toast({
                    title: "Conversa apagada",
                    description: "A conversa foi removida permanentemente.",
                });
                setSwipedConversationId(null);
            } catch (error) {
                 toast({
                    title: "Erro",
                    description: "Não foi possível apagar a conversa.",
                    variant: 'destructive'
                });
            }
        } else {
             toast({
                title: "Função em breve",
                description: `A função de ${action === 'pin' ? 'fixar' : 'arquivar'} será implementada em breve.`,
            });
            setSwipedConversationId(null);
        }
    };
  
    const filteredConversations = useMemo(() => {
        if (!searchTerm) return conversations;
        return conversations.filter(convo => 
            convo.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            convo.otherUser.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            convo.lastMessage.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, conversations]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
           {chirpUser && (
                <Avatar className="h-8 w-8 cursor-pointer" onClick={() => user && router.push(`/profile/${user.uid}`)}>
                    <AvatarImage src={chirpUser.avatar} alt={chirpUser.displayName} />
                    <AvatarFallback>{chirpUser.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
           )}
          <div className="flex-1">
             <h1 className="text-xl font-bold">Mensagens</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsNewMessageModalOpen(true)}>
                <MailPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 border-b">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar Mensagens Diretas" 
                className="w-full rounded-full bg-muted pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
        
        {isLoading ? (
            <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ): filteredConversations.length === 0 ? (
             <div className="text-center p-8 mt-16">
                <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-bold">{searchTerm ? 'Nenhum resultado encontrado' : 'Sem mensagens ainda'}</h2>
                <p className="mt-2 text-muted-foreground">{searchTerm ? 'Tente um termo de busca diferente.' : 'Quando você tiver novas conversas, elas aparecerão aqui.'}</p>
                 <Button className="mt-4" onClick={() => setIsNewMessageModalOpen(true)}>Encontrar pessoas</Button>
            </div>
        ) : (
             <ul className="divide-y divide-border">
                {filteredConversations.map((convo) => (
                   <ConversationItem 
                        key={convo.id} 
                        convo={convo} 
                        currentUserId={user?.uid || null}
                        onSwipeOpen={handleSwipeOpen}
                        onActionClick={handleActionClick}
                        isSwiped={swipedConversationId === convo.id}
                    />
                ))}
             </ul>
        )}
         {isNewMessageModalOpen && user && (
            <NewMessageModal 
                open={isNewMessageModalOpen}
                onOpenChange={setIsNewMessageModalOpen}
                currentUser={user}
            />
        )}
    </>
  );
}
