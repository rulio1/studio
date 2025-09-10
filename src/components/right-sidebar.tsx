
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDocs, writeBatch, arrayRemove, arrayUnion } from 'firebase/firestore';
import { useDebounce } from 'use-debounce';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, MoreHorizontal, BadgeCheck, Bird, HandHeart } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import NewsCard from './news-card';
import { useTranslation } from '@/hooks/use-translation';

interface UserToFollow {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    followers: string[];
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
}

interface CurrentZisprUser {
    following?: string[];
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

export default function RightSidebar() {
    const router = useRouter();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [usersToFollow, setUsersToFollow] = useState<UserToFollow[]>([]);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<CurrentZisprUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            setZisprUser(doc.data() as CurrentZisprUser);
        });
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        if (debouncedSearchTerm) {
            router.push(`/search?q=${debouncedSearchTerm}`);
        }
    }, [debouncedSearchTerm, router]);

    const fetchUsersToFollow = useCallback(() => {
        if (!currentUser) return () => {};
        
        const usersQuery = query(collection(db, 'users'), orderBy('followers', 'desc'), limit(10));
        return onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs
                .map(doc => ({ uid: doc.id, ...doc.data() } as UserToFollow))
                .filter(user => user.uid !== currentUser.uid && !zisprUser?.following?.includes(user.uid))
                .slice(0, 3);
            setUsersToFollow(usersData);
            setIsLoading(false);
        }, (error) => {
             console.error(error)
             setIsLoading(false);
        });
    }, [currentUser, zisprUser?.following]);

    useEffect(() => {
        const unsubUsers = fetchUsersToFollow();
        return () => {
            unsubUsers();
        };
    }, [fetchUsersToFollow]);
    
    const handleFollow = async (targetUserId: string) => {
        if (!currentUser) return;
        
        const userToFollow = usersToFollow.find(u => u.uid === targetUserId);
        if (!userToFollow) return;
        const isFollowing = userToFollow.followers.includes(currentUser.uid);

        const batch = writeBatch(db);
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const targetUserRef = doc(db, 'users', targetUserId);
        
        if (isFollowing) {
            batch.update(currentUserRef, { following: arrayRemove(targetUserId) });
            batch.update(targetUserRef, { followers: arrayRemove(targetUserId) });
        } else {
            batch.update(currentUserRef, { following: arrayUnion(targetUserId) });
            batch.update(targetUserRef, { followers: arrayUnion(targetUserId) });
        }
        
        await batch.commit();
    };

    return (
        <aside className="sticky top-0 h-screen w-80 hidden lg:block p-4">
            <div className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Buscar"
                        className="w-full rounded-full bg-muted pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                 <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HandHeart className="text-primary"/>
                            {t('supporter.title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('supporter.description')}
                        </p>
                         <Button className="w-full rounded-full font-bold" onClick={() => router.push('/supporter')}>
                           {t('supporter.button')}
                        </Button>
                    </CardContent>
                </Card>

                <NewsCard />

                <Card>
                    <CardHeader>
                        <CardTitle>Quem seguir</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                     <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-1 flex-1">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                        <Skeleton className="h-8 w-20 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {usersToFollow.map(user => {
                                    const isFollowing = user.followers?.includes(currentUser?.uid || '');
                                    const isZisprAccount = user.handle === '@Zispr' || user.handle === '@ZisprUSA';
                                    const isRulio = user.handle === '@Rulio';
                                    const isVerified = user.isVerified || isRulio;
                                    const badgeColor = user.badgeTier ? badgeColors[user.badgeTier] : 'text-primary';

                                    return (
                                        <li key={user.uid} className="flex items-center gap-2">
                                            <Avatar className="h-10 w-10 cursor-pointer" onClick={() => router.push(`/profile/${user.uid}`)}>
                                                {isZisprAccount ? (
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
                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/profile/${user.uid}`)}>
                                                <p className="font-bold flex items-center gap-1 hover:underline truncate">
                                                    {user.displayName}
                                                    {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className={`h-4 w-4 ${isRulio ? 'text-primary fill-primary' : badgeColor}`} />)}
                                                </p>
                                                <p className="text-sm text-muted-foreground truncate">{user.handle}</p>
                                            </div>
                                            <Button variant={isFollowing ? 'secondary' : 'default'} size="sm" className="rounded-full" onClick={() => handleFollow(user.uid)}>
                                                {isFollowing ? 'Seguindo' : 'Seguir'}
                                            </Button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                         <Button variant="link" className="p-0 h-auto mt-4" onClick={() => router.push('/search')}>Mostrar mais</Button>
                    </CardContent>
                </Card>
                 <footer className="text-xs text-muted-foreground space-x-2">
                    <a href="#" className="hover:underline">Termos de Serviço</a>
                    <a href="/privacy" className="hover:underline">Política de Privacidade</a>
                    <span>&copy; 2025 Zispr, Inc.</span>
                </footer>
            </div>
        </aside>
    );
}

    