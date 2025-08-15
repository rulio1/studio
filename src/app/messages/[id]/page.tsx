
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
import { doc, getDoc } from 'firebase/firestore';


interface ChirpUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
}

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = params.id as string;
    
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [otherUser, setOtherUser] = useState<ChirpUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const otherUserId = conversationId.replace(currentUser.uid, '').replace('_', '');
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                if (userDoc.exists()) {
                    setOtherUser(userDoc.data() as ChirpUser);
                }
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [router, conversationId]);


    if (isLoading || !otherUser) {
        return (
             <div className="flex flex-col h-screen bg-background">
                 <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                     <div className="flex items-center gap-4 px-4 py-2">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                </header>
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
        <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
                {/* Messages will be rendered here */}
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <h2 className="text-xl font-bold text-foreground">A conversa começa aqui.</h2>
                    <p>As mensagens que você enviar aparecerão aqui.</p>
                </div>
            </div>
        </ScrollArea>
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t">
            <div className="flex items-center gap-2">
                <Input 
                    placeholder="Inicie uma nova mensagem" 
                />
                <Button>
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}
