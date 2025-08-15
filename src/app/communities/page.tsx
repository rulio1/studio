
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell, Home, Mail, MoreHorizontal, Search, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const featuredCommunities = [
    {
        name: '#Geral',
        topic: 'General conversation',
        members: '1.2M members',
        image: 'https://placehold.co/400x200.png',
        imageHint: 'abstract background',
    },
    {
        name: '#WebDev',
        topic: 'Web Development',
        members: '876K members',
        image: 'https://placehold.co/400x200.png',
        imageHint: 'coding on laptop',
    }
];

const discoverCommunities = [
    { name: '#ReactJS', members: '543K', avatar: 'https://placehold.co/48x48.png', avatarHint: 'React logo' },
    { name: '#NextJS', members: '412K', avatar: 'https://placehold.co/48x48.png', avatarHint: 'Next.js logo' },
    { name: '#NodeJS', members: '389K', avatar: 'https://placehold.co/48x48.png', avatarHint: 'Node.js logo' },
    { name: '#TaylorSwift', members: '2.1M', avatar: 'https://placehold.co/48x48.png', avatarHint: 'pop music' },
    { name: '#AI', members: '980K', avatar: 'https://placehold.co/48x48.png', avatarHint: 'artificial intelligence' },
];

export default function CommunitiesPage() {
    const router = useRouter();

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
                <div className="grid gap-4 md:grid-cols-2">
                    {featuredCommunities.map((community, index) => (
                        <Card key={index} className="overflow-hidden">
                            <CardHeader className="p-0">
                                <Image src={community.image} width={400} height={200} alt={community.name} data-ai-hint={community.imageHint} className="w-full h-32 object-cover" />
                            </CardHeader>
                            <CardContent className="p-4">
                                <CardTitle>{community.name}</CardTitle>
                                <CardDescription>{community.topic}</CardDescription>
                                <p className="text-sm text-muted-foreground mt-2">{community.members}</p>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full">Join</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

             <div className="p-4">
                <h2 className="text-2xl font-bold mb-4">Discover new Communities</h2>
                 <ul className="divide-y divide-border">
                    {discoverCommunities.map((community, index) => (
                        <li key={index} className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                 <Avatar className="h-12 w-12 rounded-lg">
                                    <AvatarImage src={community.avatar} data-ai-hint={community.avatarHint} alt={community.name} />
                                    <AvatarFallback>{community.name.substring(1,3)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{community.name}</p>
                                    <p className="text-sm text-muted-foreground">{community.members} members</p>
                                </div>
                            </div>
                            <Button variant="outline">Join</Button>
                        </li>
                    ))}
                 </ul>
             </div>
             <div className="p-4 text-center">
                <Button variant="link">Show more</Button>
             </div>
        </>
    );
}
