
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusSquare, Search, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, limit, query, doc, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';


interface Community {
    id: string;
    name: string;
    topic: string;
    memberCount: number;
    image: string;
    imageHint: string;
    avatar?: string;
    avatarHint?: string;
    isJoined?: boolean;
}

interface ZisprUser {
    uid: string;
    communities?: string[];
}

const CommunityCardSkeleton = () => (
    <Card>
        <Skeleton className="w-full h-32" />
        <CardContent className="p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
        </CardContent>
        <CardFooter>
            <Skeleton className="h-10 w-full" />
        </CardFooter>
    </Card>
)

const CommunityListSkeleton = () => (
    <div className="py-4 flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="h-10 w-20" />
    </div>
)


export default function CommunitiesPage() {
    const router = useRouter();
    const [featuredCommunities, setFeaturedCommunities] = useState<Community[]>([]);
    const [discoverCommunities, setDiscoverCommunities] = useState<Community[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
                setZisprUser({ uid: userDoc.id, ...userDoc.data() } as ZisprUser);
            }
        });
        return () => unsubUser();
    }, [user]);


    const fetchCommunities = useCallback(async () => {
        if (!zisprUser) return;
        setIsLoading(true);
        try {
            const featuredQuery = query(collection(db, 'communities'), limit(2));
            const discoverQuery = query(collection(db, 'communities'), limit(5));

            const [featuredSnapshot, discoverSnapshot] = await Promise.all([
                getDocs(featuredQuery),
                getDocs(discoverQuery)
            ]);

            const userCommunityIds = new Set(zisprUser.communities || []);

            const featuredData = featuredSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                isJoined: userCommunityIds.has(doc.id)
            } as Community));
            const discoverData = discoverSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                isJoined: userCommunityIds.has(doc.id)
            } as Community));
            
            setFeaturedCommunities(featuredData);
            setDiscoverCommunities(discoverData);

        } catch (error) {
            console.error("Erro ao buscar comunidades: ", error);
        } finally {
            setIsLoading(false);
        }
    }, [zisprUser]);

    useEffect(() => {
        if(zisprUser) {
            fetchCommunities();
        }
    }, [zisprUser, fetchCommunities]);
    
    const handleJoinLeaveCommunity = async (communityId: string, isJoined: boolean) => {
        if (!user) return;

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const communityRef = doc(db, 'communities', communityId);

        if (isJoined) {
            batch.update(userRef, { communities: arrayRemove(communityId) });
            batch.update(communityRef, { memberCount: increment(-1) });
        } else {
            batch.update(userRef, { communities: arrayUnion(communityId) });
            batch.update(communityRef, { memberCount: increment(1) });
        }

        await batch.commit();
        // UI will update due to the onSnapshot listener on the user document.
    };

    return (
        <>
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Comunidades</h1>
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon">
                            <Search className="h-5 w-5" />
                        </Button>
                         <Button variant="ghost" size="icon" onClick={() => router.push('/communities/create')}>
                            <PlusSquare className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="p-4">
                <h2 className="text-2xl font-bold mb-4">Comunidades em Destaque</h2>
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        <CommunityCardSkeleton />
                        <CommunityCardSkeleton />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {featuredCommunities.map((community) => (
                            <Card key={community.id} className="overflow-hidden">
                                <CardHeader className="p-0">
                                    <Image src={community.image} width={400} height={200} alt={community.name} data-ai-hint={community.imageHint} className="w-full h-32 object-cover" />
                                </CardHeader>
                                <CardContent className="p-4">
                                    <CardTitle>{community.name}</CardTitle>
                                    <CardDescription>{community.topic}</CardDescription>
                                    <p className="text-sm text-muted-foreground mt-2">{community.memberCount.toLocaleString()} membros</p>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" variant={community.isJoined ? "secondary" : "default"} onClick={() => handleJoinLeaveCommunity(community.id, !!community.isJoined)}>
                                        {community.isJoined ? 'Membro' : 'Entrar'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

             <div className="p-4">
                <h2 className="text-2xl font-bold mb-4">Descubra novas Comunidades</h2>
                {isLoading ? (
                    <ul className="divide-y divide-border">
                        {[...Array(3)].map((_, i) => <li key={i}><CommunityListSkeleton /></li>)}
                    </ul>
                ) : (
                 <ul className="divide-y divide-border">
                    {discoverCommunities.map((community) => (
                        <li key={community.id} className="py-4 flex items-center justify-between">
                             <div className="flex items-center gap-4 flex-grow">
                                <Avatar className="h-12 w-12 rounded-lg">
                                    <AvatarImage src={community.avatar} data-ai-hint={community.avatarHint} alt={community.name} />
                                    <AvatarFallback>{community.name.substring(1,3)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{community.name}</p>
                                    <p className="text-sm text-muted-foreground">{community.memberCount.toLocaleString()} membros</p>
                                </div>
                            </div>
                            <Button variant={community.isJoined ? "secondary" : "outline"} onClick={() => handleJoinLeaveCommunity(community.id, !!community.isJoined)}>
                                {community.isJoined ? 'Membro' : 'Entrar'}
                            </Button>
                        </li>
                    ))}
                 </ul>
                )}
             </div>
             <div className="p-4 text-center">
                <Button variant="link">Mostrar mais</Button>
             </div>
        </>
    );
}
