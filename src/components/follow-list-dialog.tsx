
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, X, BadgeCheck, Bird } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, documentId } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface User {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    bio: string;
    followers: string[];
    isVerified?: boolean;
}

interface ChirpUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    following: string[];
    isVerified?: boolean;
}

interface FollowListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    userIds: string[];
    currentUser: ChirpUser;
    onToggleFollow: (targetUser: User, currentChirpUser: ChirpUser, isCurrentlyFollowing: boolean) => Promise<void>;
}

const UserItem = ({ user, currentUser, onToggleFollow, onDialogClose }: { user: User, currentUser: ChirpUser, onToggleFollow: (targetUser: User, currentChirpUser: ChirpUser, isCurrentlyFollowing: boolean) => Promise<void>, onDialogClose: () => void }) => {
    const router = useRouter();
    const isFollowing = currentUser.following.includes(user.uid);
    const isCurrentUser = user.uid === currentUser.uid;
    const isVerified = user.isVerified || user.handle === '@rulio';
    const isChirpAccount = user.handle === '@chirp';

    const handleUserClick = () => {
        onDialogClose();
        router.push(`/profile/${user.uid}`);
    };
    
    return (
        <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleUserClick}>
                <Avatar className="h-10 w-10">
                     {isChirpAccount ? (
                            <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                                <Bird className="h-5 w-5 text-primary" />
                            </div>
                        ) : (
                            <>
                                <AvatarImage src={user.avatar} alt={user.displayName} />
                                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                            </>
                     )}
                </Avatar>
                <div>
                    <p className="font-bold flex items-center gap-1">
                        {user.displayName}
                        {isChirpAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.handle}</p>
                </div>
            </div>
            {!isCurrentUser && (
                <Button variant={isFollowing ? 'secondary' : 'default'} onClick={() => onToggleFollow(user, currentUser, isFollowing)}>
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                </Button>
            )}
        </div>
    )
}

export default function FollowListDialog({ open, onOpenChange, title, userIds, currentUser, onToggleFollow }: FollowListDialogProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        if (userIds.length === 0) {
            setUsers([]);
            setIsLoading(false);
            return;
        }

        try {
             // Firestore 'in' query has a limit of 30 elements. Chunk if necessary.
            const chunks = [];
            for (let i = 0; i < userIds.length; i += 30) {
                chunks.push(userIds.slice(i, i + 30));
            }

            const usersData: User[] = [];
            for (const chunk of chunks) {
                const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    usersData.push({ uid: doc.id, ...doc.data() } as User);
                });
            }
            setUsers(usersData);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userIds]);

    useEffect(() => {
        if (open) {
            fetchUsers();
        }
    }, [open, fetchUsers]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-lg">
                <DialogHeader className="flex-row items-center justify-between pr-6">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogClose asChild>
                         <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogClose>
                </DialogHeader>
                <div className="h-[400px] overflow-y-auto pr-2">
                   {isLoading ? (
                       <div className="flex justify-center items-center h-full">
                           <Loader2 className="h-8 w-8 animate-spin" />
                       </div>
                   ) : users.length === 0 ? (
                       <div className="flex justify-center items-center h-full text-muted-foreground">
                           <p>Nenhum usuário encontrado.</p>
                       </div>
                   ) : (
                       <div className="flex flex-col gap-2">
                           {users.map(user => (
                               <UserItem 
                                    key={user.uid} 
                                    user={user} 
                                    currentUser={currentUser} 
                                    onToggleFollow={onToggleFollow}
                                    onDialogClose={() => onOpenChange(false)}
                                />
                           ))}
                       </div>
                   )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
