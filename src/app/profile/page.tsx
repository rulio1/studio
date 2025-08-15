
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bell, Briefcase, Calendar, Check, Gift, Heart, Home, Mail, MapPin, MessageCircle, MoreHorizontal, Plus, RefreshCw, Repeat, Search, Upload, Users, Video, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { format } from 'date-fns';

const EmptyState = ({ title, description }: { title: string, description: string }) => (
    <div className="text-center p-8">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground mt-2">{description}</p>
    </div>
);

interface ChirpUser {
    uid: string;
    displayName: string;
    email: string;
    handle: string;
    avatar: string;
    banner: string;
    bio: string;
    location: string;
    website: string;
    birthDate: any;
    createdAt: any;
    followers: string[];
    following: string[];
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
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


    if (isLoading || !user || !chirpUser) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }


  return (
    <div className="flex flex-col h-screen bg-background relative">
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="relative h-48">
          <Image
            src={chirpUser.banner}
            alt="Banner"
            layout="fill"
            objectFit="cover"
            data-ai-hint="concert crowd"
          />
          <div className="absolute top-0 left-0 w-full h-full bg-black/30" />
          <div className="absolute top-4 left-4">
            <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
             <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white">
              <Search className="h-5 w-5" />
            </Button>
             <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="px-4">
            <div className="flex justify-between items-start">
                <div className="-mt-16">
                    <Avatar className="h-32 w-32 border-4 border-background">
                        <AvatarImage src={chirpUser.avatar} data-ai-hint="pop star" alt={chirpUser.displayName} />
                        <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                    </Avatar>
                </div>
                <Button variant="outline" className="rounded-full mt-4 font-bold" asChild>
                  <Link href="/profile/edit">Edit profile</Link>
                </Button>
            </div>
            <div className="mt-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{chirpUser.displayName}</h1>
                </div>
                <p className="text-muted-foreground">{chirpUser.handle}</p>
                <p className="mt-2">{chirpUser.bio}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
                {chirpUser.location && <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{chirpUser.location}</span>
                </div>}
                 {chirpUser.birthDate && <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span>Born {format(chirpUser.birthDate.toDate(), 'MMMM d, yyyy')}</span>
                </div>}
                {chirpUser.createdAt && <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {format(chirpUser.createdAt.toDate(), 'MMMM yyyy')}</span>
                </div>}
            </div>
             <div className="flex gap-4 mt-4 text-sm">
                <p><span className="font-bold text-foreground">{chirpUser.following?.length || 0}</span> Following</p>
                <p><span className="font-bold text-foreground">{chirpUser.followers?.length || 0}</span> Followers</p>
            </div>
        </div>

        <Tabs defaultValue="posts" className="w-full mt-4">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b px-4 overflow-x-auto no-scrollbar">
                <TabsTrigger value="posts" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Posts</TabsTrigger>
                <TabsTrigger value="replies" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Replies</TabsTrigger>
                <TabsTrigger value="highlights" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Highlights</TabsTrigger>
                <TabsTrigger value="media" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Media</TabsTrigger>
                <TabsTrigger value="likes" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Likes</TabsTrigger>
            </TabsList>

             <TabsContent value="posts" className="mt-0">
                <EmptyState title="No posts yet" description="When this user posts, they will show up here." />
            </TabsContent>
            <TabsContent value="replies" className="mt-0">
                <EmptyState title="No replies yet" description="When someone replies to this user, it will show up here." />
            </TabsContent>
            <TabsContent value="highlights" className="mt-0">
                <EmptyState title="No highlights yet" description="This user's highlights will be displayed here." />
            </TabsContent>
            <TabsContent value="media" className="mt-0">
                <EmptyState title="No media yet" description="When this user posts photos or videos, they will appear here." />
            </TabsContent>
            <TabsContent value="likes" className="mt-0">
                 <EmptyState title="No likes yet" description="When this user likes posts, they will appear here." />
            </TabsContent>
        </Tabs>

      </main>

      <Button className="absolute bottom-24 right-4 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90">
        <Plus className="h-8 w-8" />
      </Button>

      <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t">
        <nav className="flex justify-around items-center h-14">
            <Link href="/home" className="flex-1 flex justify-center items-center text-foreground">
              <Home className="h-7 w-7" />
            </Link>
            <Link href="/search" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Search className="h-7 w-7" />
            </Link>
            <Link href="#" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Repeat className="h-7 w-7" />
            </Link>
            <Link href="/notifications" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Bell className="h-7 w-7" />
            </Link>
            <Link href="/messages" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Mail className="h-7 w-7" />
            </Link>
        </nav>
      </footer>
    </div>
  );
}
