

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MailPlus, Search, Settings, Loader2, MessageSquare, Pin, Archive, Trash2, MoreHorizontal, BadgeCheck, Bird } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, updateDoc, arrayUnion } from 'firebase/firestore';
import { formatTimeAgo } from '@/lib/utils';
import NewMessageModal from '@/components/new-message-modal';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface ZisprUser {
    uid: string;
    displayName: string;
    avatar: string;
    handle: string;
    isVerified?: boolean;
}

interface Conversation {
    id: string;
    otherUser: {
        id: string;
        name: string;
        handle: string;
        avatar: string;
        isVerified?: boolean;
    };
    lastMessage: {
        text: string;
        timestamp: any;
        senderId: string;
    };
    unreadCount: number;
    deletedFor?: string[];
}


const ConversationItem = ({ convo, currentUserId, onActionClick }: { convo: Conversation; currentUserId: string | null; onActionClick: (convoId: string, action: 'pin' | 'archive' | 'delete') => void; }) => {
    const router = useRouter();
    const [time, setTime] = useState('');
    
    useEffect(() => {
        if (convo.lastMessage?.timestamp) {
            try {
                setTime(formatTimeAgo(convo.lastMessage.timestamp.toDate()));
            } catch (e) {
                setTime('');
            }
        }
    }, [convo.lastMessage.timestamp]);


    const isMyMessage = convo.lastMessage.senderId === currentUserId;
    const isUnread = convo.unreadCount > 0;
    const messagePreview = `${isMyMessage ? 'Você: ' : ''}${convo.lastMessage.text}`;
    const isZisprAccount = convo.otherUser.handle === '@Zispr';
    const isVerified = convo.otherUser.isVerified || convo.otherUser.handle === '@Rulio';

    return (
         <div
            onClick={() => router.push(`/messages/${convo.id}`)}
            className={`w-full p-3 hover:bg-muted/50 cursor-pointer flex items-center gap-4 border-b last:border-b-0`}
        >
            <Avatar className="h-12 w-12">
                {isZisprAccount ? (
                    <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                        <Bird className="h-6 w-6 text-primary" />
                    </div>
                ) : (
                    <>
                        <AvatarImage src={convo.otherUser.avatar} alt={convo.otherUser.name} />
                        <AvatarFallback>{convo.otherUser.name[0]}</AvatarFallback>
                    </>
                )}
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                        <p className="font-bold truncate flex items-center gap-1">
                            {convo.otherUser.name}
                            {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                        </p>
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
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onActionClick(convo.id, 'pin')}>
                        <Pin className="mr-2 h-4 w-4"/>
                        Fixar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onActionClick(convo.id, 'archive')}>
                        <Archive className="mr-2 h-4 w-4"/>
                        Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onActionClick(convo.id, 'delete')} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Apagar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};


export default function MessagesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                 const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setZisprUser(userDoc.data() as ZisprUser);
                }
            } else {
                setUser(null);
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user) {
            setConversations([]);
            setIsLoading(false);
            return () => {};
        }
        
        setIsLoading(true);
        const q = query(
            collection(db, "conversations"), 
            where("participants", "array-contains", user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const currentUser = auth.currentUser;
            if (!currentUser) { 
                setConversations([]);
                setIsLoading(false);
                return;
            };

            const filteredDocs = snapshot.docs.filter(doc => {
                 const data = doc.data();
                 return !data.deletedFor || !data.deletedFor.includes(currentUser.uid);
            });

            if (filteredDocs.length === 0) {
                setConversations([]);
                setIsLoading(false);
                return;
            }

            const convsPromises = filteredDocs.map(async (docData) => {
                const conversationData = docData.data();
                const otherUserId = conversationData.participants.find((p: string) => p !== user.uid);
                
                if (!otherUserId) return null;

                const userDoc = await getDoc(doc(db, "users", otherUserId));
                if (!userDoc.exists()) return null;
                const otherUserData = userDoc.data();

                return {
                    id: docData.id,
                    otherUser: {
                        id: otherUserId,
                        name: otherUserData.displayName,
                        handle: otherUserData.handle,
                        avatar: otherUserData.avatar,
                        isVerified: otherUserData.isVerified,
                    },
                    lastMessage: {
                        ...conversationData.lastMessage,
                    },
                    unreadCount: conversationData.unreadCounts?.[user.uid] || 0,
                    deletedFor: conversationData.deletedFor || [],
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
        }, (error) => {
            console.error("Error fetching conversations:", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [user]);

    const handleActionClick = async (convoId: string, action: 'pin' | 'archive' | 'delete') => {
        if (!user) return;
        
        if (action === 'delete') {
            try {
                const convoRef = doc(db, 'conversations', convoId);
                await updateDoc(convoRef, {
                    deletedFor: arrayUnion(user.uid)
                });
                toast({
                    title: "Conversa apagada",
                    description: "A conversa foi removida da sua lista.",
                });
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
           {zisprUser ? (
                <Avatar className="h-8 w-8 cursor-pointer" onClick={() => user && router.push(`/profile/${user.uid}`)}>
                    <AvatarImage src={zisprUser.avatar} alt={zisprUser.displayName} />
                    <AvatarFallback>{zisprUser.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
           ) : <div className="w-8"></div>}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar Mensagens" 
                className="w-full rounded-full bg-muted pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
                <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsNewMessageModalOpen(true)}>
                <MailPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

       <div className="flex-1 overflow-y-auto">
        {isLoading ? (
            <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : filteredConversations.length === 0 ? (
             <div className="text-center p-8 mt-16">
                <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-bold">{searchTerm ? 'Nenhum resultado encontrado' : 'Sem mensagens ainda'}</h2>
                <p className="mt-2 text-muted-foreground">{searchTerm ? 'Tente um termo de busca diferente.' : 'Quando você tiver novas conversas, elas aparecerão aqui.'}</p>
                 <Button className="mt-4" onClick={() => setIsNewMessageModalOpen(true)}>Encontrar pessoas</Button>
            </div>
        ) : (
             <Card className="m-2 md:m-4 border-0 md:border">
                 <CardContent className="p-0">
                    {filteredConversations.map((convo) => (
                       <ConversationItem 
                            key={convo.id} 
                            convo={convo} 
                            currentUserId={user?.uid || null}
                            onActionClick={handleActionClick}
                        />
                    ))}
                 </CardContent>
             </Card>
        )}
        </div>
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
