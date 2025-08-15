
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MailPlus, Search, Settings, Loader2, MessageSquare } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';

interface ChirpUser {
    uid: string;
    displayName: string;
    avatar: string;
    handle: string;
}

interface Conversation {
    id: string;
    otherUser: {
        name: string;
        handle: string;
        avatar: string;
    };
    lastMessage: {
        text: string;
        timestamp: string;
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
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [router]);
    
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
           <Avatar className="h-8 w-8">
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
            <Button variant="ghost" size="icon">
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
             <div className="text-center p-8">
                <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-bold">Sem mensagens ainda</h2>
                <p className="mt-2 text-muted-foreground">Quando você tiver novas conversas, elas aparecerão aqui.</p>
            </div>
        ) : (
             <ul className="divide-y divide-border">
                {/* As conversas reais serão renderizadas aqui em breve */}
             </ul>
        )}
    </>
  );
}
