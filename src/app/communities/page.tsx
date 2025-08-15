
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';


interface Community {
    id: string;
    name: string;
    topic: string;
    members: number;
    image: string;
    imageHint: string;
    avatar?: string;
    avatarHint?: string;
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

    useEffect(() => {
        const fetchCommunities = async () => {
            setIsLoading(true);
            try {
                const featuredQuery = query(collection(db, 'communities'), limit(2));
                const discoverQuery = query(collection(db, 'communities'), limit(5));

                const [featuredSnapshot, discoverSnapshot] = await Promise.all([
                    getDocs(featuredQuery),
                    getDocs(discoverQuery)
                ]);

                const featuredData = featuredSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Community));
                const discoverData = discoverSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Community));
                
                setFeaturedCommunities(featuredData);
                setDiscoverCommunities(discoverData);

            } catch (error) {
                console.error("Error fetching communities: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCommunities();
    }, []);

    return (
        <>
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Communities</h1>
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon">
                            <Search className="h-5 w-5" />
                        </Button>
                         <Button variant="ghost" size="icon">
                            <Users className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="p-4">
                <h2 className="text-2xl font-bold mb-4">Featured Communities</h2>
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
                                    <p className="text-sm text-muted-foreground mt-2">{community.members.toLocaleString()} members</p>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full">Join</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

             <div className="p-4">
                <h2 className="text-2xl font-bold mb-4">Discover new Communities</h2>
                {isLoading ? (
                    <ul className="divide-y divide-border">
                        {[...Array(3)].map((_, i) => <li key={i}><CommunityListSkeleton /></li>)}
                    </ul>
                ) : (
                 <ul className="divide-y divide-border">
                    {discoverCommunities.map((community) => (
                        <li key={community.id} className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                 <Avatar className="h-12 w-12 rounded-lg">
                                    <AvatarImage src={community.avatar} data-ai-hint={community.avatarHint} alt={community.name} />
                                    <AvatarFallback>{community.name.substring(1,3)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{community.name}</p>
                                    <p className="text-sm text-muted-foreground">{community.members.toLocaleString()} members</p>
                                </div>
                            </div>
                            <Button variant="outline">Join</Button>
                        </li>
                    ))}
                 </ul>
                )}
             </div>
             <div className="p-4 text-center">
                <Button variant="link">Show more</Button>
             </div>
        </>
    );
}
