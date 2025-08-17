
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp, limit } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface NewMessageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUser: FirebaseUser;
}

interface UserSearchResult {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
}

export default function NewMessageModal({ open, onOpenChange, currentUser }: NewMessageModalProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            if (debouncedSearchTerm.trim() === '') {
                setResults([]);
                return;
            }
            setIsLoading(true);
            try {
                const nameQuery = query(collection(db, 'users'), where('searchableDisplayName', '>=', debouncedSearchTerm.toLowerCase()), where('searchableDisplayName', '<=', debouncedSearchTerm.toLowerCase() + '\uf8ff'), limit(10));
                const handleQuery = query(collection(db, 'users'), where('searchableHandle', '>=', debouncedSearchTerm.toLowerCase().replace('@','')), where('searchableHandle', '<=', debouncedSearchTerm.toLowerCase().replace('@','') + '\uf8ff'), limit(10));

                const [nameSnapshot, handleSnapshot] = await Promise.all([getDocs(nameQuery), getDocs(handleQuery)]);
                const nameResults = nameSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserSearchResult));
                const handleResults = handleSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserSearchResult));
                
                const allResults = [...nameResults, ...handleResults].filter(u => u.uid !== currentUser.uid);
                const uniqueResults = Array.from(new Map(allResults.map(user => [user.uid, user])).values());

                setResults(uniqueResults);
            } catch (error) {
                console.error("Erro ao buscar usuários: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        searchUsers();
    }, [debouncedSearchTerm, currentUser.uid]);
    
    const handleSelectUser = async (targetUser: UserSearchResult) => {
        setIsCreating(true);
        const conversationId = [currentUser.uid, targetUser.uid].sort().join('_');
        const conversationRef = doc(db, 'conversations', conversationId);

        try {
            const docSnap = await getDoc(conversationRef);
            if (!docSnap.exists()) {
                await setDoc(conversationRef, {
                    participants: [currentUser.uid, targetUser.uid],
                    unreadCounts: { [currentUser.uid]: 0, [targetUser.uid]: 0 },
                    lastMessage: {
                        text: `Iniciou uma conversa`,
                        senderId: null,
                        timestamp: serverTimestamp()
                    },
                    lastMessageReadBy: [],
                });
            }
            onOpenChange(false);
            router.push(`/messages/${conversationId}`);
        } catch (error) {
            console.error("Erro ao criar/acessar conversa:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-lg rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Nova Mensagem</DialogTitle>
                </DialogHeader>
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar pessoas"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="mt-4 h-64 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {results.map(user => (
                                <li key={user.uid}>
                                    <button 
                                        className="w-full flex items-center gap-3 p-2 text-left hover:bg-muted rounded-md"
                                        onClick={() => handleSelectUser(user)}
                                        disabled={isCreating}
                                    >
                                        <Avatar>
                                            <AvatarImage src={user.avatar} alt={user.displayName} />
                                            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{user.displayName}</p>
                                            <p className="text-sm text-muted-foreground">{user.handle}</p>
                                        </div>
                                         {isCreating && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        debouncedSearchTerm && <p className="text-center text-muted-foreground pt-8">Nenhum usuário encontrado.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
