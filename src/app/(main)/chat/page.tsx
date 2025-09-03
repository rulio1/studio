
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Bot, Loader2, Send, MoreHorizontal, Trash2 } from 'lucide-react';
import { chat, ChatHistory } from '@/ai/flows/chat-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, writeBatch, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

interface ZisprUser {
    displayName: string;
    avatar: string;
}

export default function ChatPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [messages, setMessages] = useState<ChatHistory[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (authUser) {
            const userDocRef = doc(db, 'users', authUser.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setZisprUser(docSnap.data() as ZisprUser);
                }
            });

            const chatMessagesQuery = query(
                collection(db, 'chats', authUser.uid, 'messages'),
                orderBy('createdAt', 'asc')
            );
            
            const unsubscribe = onSnapshot(chatMessagesQuery, (snapshot) => {
                const history = snapshot.docs.map(doc => doc.data() as ChatHistory);
                setMessages(history);
                setIsLoadingHistory(false);
            }, (error) => {
                 console.error("Error fetching chat history:", error);
                 setIsLoadingHistory(false);
            });

            return () => unsubscribe();
        } else {
            setIsLoadingHistory(false);
        }
    }, [authUser]);

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

    const handleSend = async () => {
        if (!input.trim() || !authUser) return;

        const userMessage: ChatHistory = { role: 'user', content: input };
        
        setIsLoading(true);

        const chatCollectionRef = collection(db, 'chats', authUser.uid, 'messages');
        await addDoc(chatCollectionRef, { ...userMessage, createdAt: serverTimestamp() });
        
        setInput('');
        
        let modelResponse = '';
        const modelMessageRef = await addDoc(chatCollectionRef, {
            role: 'model',
            content: '', // Start with empty content
            createdAt: serverTimestamp()
        });

        try {
            const currentHistory = messages.map(({role, content}) => ({role, content}));
            const { stream } = await chat([...currentHistory, userMessage]);

            for await (const chunk of stream) {
                modelResponse += chunk;
                // Use non-snapshot update for better performance while streaming
                setMessages(prev => {
                    const updatedMessages = [...prev];
                    const lastMsg = updatedMessages[updatedMessages.length - 1];
                    if(lastMsg && lastMsg.role === 'model'){
                        lastMsg.content = modelResponse;
                    }
                    return updatedMessages;
                 });
                 scrollToBottom();
            }
            
            await updateDoc(modelMessageRef, { content: modelResponse });

        } catch (error) {
            console.error('Erro ao obter resposta da IA:', error);
            const errorMessage = "Oops! Algo deu errado. Por favor, tente novamente.";
            await updateDoc(modelMessageRef, { content: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConversation = async () => {
        if (!authUser) return;
        setIsDeleting(true);

        try {
            const messagesQuery = query(collection(db, 'chats', authUser.uid, 'messages'));
            const messagesSnapshot = await getDocs(messagesQuery);

            if(messagesSnapshot.empty) {
                setIsDeleteAlertOpen(false);
                setIsDeleting(false);
                return;
            }

            const batch = writeBatch(db);
            messagesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            toast({
                title: "Conversa apagada",
                description: "Seu histórico de chat foi removido.",
            });

        } catch (error) {
            console.error("Error deleting conversation:", error);
            toast({
                title: "Erro",
                description: "Não foi possível apagar a conversa.",
                variant: "destructive",
            });
        } finally {
            setIsDeleteAlertOpen(false);
            setIsDeleting(false);
        }
    };


  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <header className="bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between gap-4 px-4 py-2">
            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-lg font-bold">Zispr AI</h1>
                        <p className="text-xs text-muted-foreground">Assistente de IA</p>
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
                    <DropdownMenuItem onClick={() => setIsDeleteAlertOpen(true)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Apagar conversa
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="p-4 space-y-6">
                 {isLoadingHistory ? (
                     <div className="flex justify-center items-center h-full">
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                 ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <Bot className="h-16 w-16 mb-4" />
                        <h2 className="text-2xl font-bold text-foreground">Zispr AI está aqui para ajudar</h2>
                        <p>Pergunte-me qualquer coisa, ou apenas diga oi!</p>
                    </div>
                 ) : (
                    messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'model' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={`rounded-lg px-4 py-2 max-w-xs md:max-w-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content || <Loader2 className="h-5 w-5 animate-spin" />}</p>
                            </div>
                            {message.role === 'user' && (
                                zisprUser ? (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={zisprUser.avatar} alt="User" />
                                        <AvatarFallback>{zisprUser.displayName?.[0] || 'U'}</AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                )
                            )}
                        </div>
                    ))
                 )}
            </div>
        </ScrollArea>
      </main>
      <footer className="p-4 pt-2 border-t bg-background">
          <div className="relative flex items-center rounded-2xl border bg-muted p-2 max-w-2xl mx-auto">
              <Input 
                  placeholder="Pergunte qualquer coisa ao Zispr AI..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon" className="rounded-full">
                  <Send className="h-5 w-5" />
              </Button>
          </div>
      </footer>
    </div>

     <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente
                o seu histórico de chat com o Zispr AI.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apagar
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
