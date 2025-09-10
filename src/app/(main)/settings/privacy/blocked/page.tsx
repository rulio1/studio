
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, writeBatch, arrayRemove, getDocs, collection, documentId, query } from 'firebase/firestore';
import { Loader2, UserX, BadgeCheck, Bird } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserStore } from '@/store/user-store';

interface BlockedUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    bio: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

export default function BlockedAccountsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser, zisprUser } = useUserStore();
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    const fetchBlockedUsers = useCallback(async () => {
        if (!zisprUser || !zisprUser.blocked || zisprUser.blocked.length === 0) {
            setBlockedUsers([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const blockedIds = zisprUser.blocked;
        
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where(documentId(), 'in', blockedIds));
            const querySnapshot = await getDocs(q);

            const usersData = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as BlockedUser));
            setBlockedUsers(usersData);
        } catch (error) {
            console.error("Error fetching blocked users:", error);
            toast({ title: "Erro ao buscar contas bloqueadas.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [zisprUser, toast]);

    useEffect(() => {
        if (zisprUser) {
            fetchBlockedUsers();
        }
    }, [zisprUser, fetchBlockedUsers]);
    
    const handleUnblock = async (targetUser: BlockedUser) => {
        if (!currentUser || !targetUser) return;
        setUnblockingId(targetUser.uid);

        try {
            const batch = writeBatch(db);
            const currentUserRef = doc(db, 'users', currentUser.uid);
            const targetUserRef = doc(db, 'users', targetUser.uid);

            batch.update(currentUserRef, { blocked: arrayRemove(targetUser.uid) });
            batch.update(targetUserRef, { blockedBy: arrayRemove(currentUser.uid) });

            await batch.commit();

            toast({
                title: `${targetUser.handle} desbloqueado.`,
            });
            // The onSnapshot listener will update the UI automatically.
        } catch (error) {
            console.error("Error unblocking user:", error);
            toast({ title: "Erro ao desbloquear usuário.", variant: "destructive" });
        } finally {
            setUnblockingId(null);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto p-4">
             <Card>
                <CardHeader>
                    <CardTitle>Contas Bloqueadas</CardTitle>
                    <CardDescription>
                        As contas que você bloqueou aparecerão aqui. Elas não poderão seguir ou enviar mensagens para você, e você não verá notificações delas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : blockedUsers.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            <UserX className="mx-auto h-12 w-12 mb-4" />
                            <h3 className="font-bold text-lg text-foreground">Você não bloqueou ninguém</h3>
                            <p className="text-sm">Quando você bloquear alguém, essa pessoa aparecerá aqui.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {blockedUsers.map(user => {
                                const isZisprAccount = user.handle === '@Zispr';
                                const isRulio = user.handle === '@Rulio';
                                const isVerified = user.isVerified || isRulio;
                                const badgeColor = user.badgeTier ? badgeColors[user.badgeTier] : 'text-primary';

                                return (
                                    <div key={user.uid} className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold flex items-center gap-1">{user.displayName} {isVerified && <BadgeCheck className={`h-4 w-4 ${isRulio ? 'text-primary fill-primary' : badgeColor}`} />}</p>
                                                <p className="text-sm text-muted-foreground">{user.handle}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleUnblock(user)}
                                            disabled={unblockingId === user.uid}
                                        >
                                            {unblockingId === user.uid && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Desbloquear
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
