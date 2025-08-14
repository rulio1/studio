
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bell, Briefcase, Calendar, Check, Gift, Heart, Home, Mail, MapPin, MessageCircle, MoreHorizontal, Plus, RefreshCw, Repeat, Search, Upload, Users, Video } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="relative h-48">
          <Image
            src="https://placehold.co/600x200.png"
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
              <RefreshCw className="h-5 w-5" />
            </Button>
             <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white">
              <Search className="h-5 w-5" />
            </Button>
             <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white">
              <Upload className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="px-4">
            <div className="flex justify-between items-start">
                <div className="-mt-16">
                    <Avatar className="h-32 w-32 border-4 border-background">
                        <AvatarImage src="https://placehold.co/128x128.png" data-ai-hint="pop star" alt="Barbie" />
                        <AvatarFallback>B</AvatarFallback>
                    </Avatar>
                </div>
                <Button variant="outline" className="rounded-full mt-4 font-bold">Edit profile</Button>
            </div>
            <div className="mt-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Barbie 🎀</h1>
                    <Badge className="bg-blue-400 hover:bg-blue-500 text-white">
                        <Check className="h-4 w-4 mr-1" />
                        Get verified
                    </Badge>
                </div>
                <p className="text-muted-foreground">@pussypinkprint</p>
                <p className="mt-2">ayo</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>Entertainment & Recreation</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Brasil</span>
                </div>
                 <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span>Born May 14, 1998</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined September 2019</span>
                </div>
            </div>
             <div className="flex gap-4 mt-4 text-sm">
                <p><span className="font-bold text-foreground">539</span> Following</p>
                <p><span className="font-bold text-foreground">675</span> Followers</p>
            </div>
        </div>

        <Tabs defaultValue="posts" className="w-full mt-4">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b px-4 overflow-x-auto no-scrollbar">
                <TabsTrigger value="posts" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Posts</TabsTrigger>
                <TabsTrigger value="replies" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Replies</TabsTrigger>
                <TabsTrigger value="highlights" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Highlights</TabsTrigger>
                <TabsTrigger value="videos" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Videos</TabsTrigger>
                <TabsTrigger value="photos" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Photos</TabsTrigger>
                <TabsTrigger value="articles" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Articles</TabsTrigger>
            </TabsList>

             <TabsContent value="posts" className="mt-0">
                <ul className="divide-y divide-border">
                    <li className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 ml-10">
                            <Repeat className="h-4 w-4" />
                            <span>You reposted</span>
                        </div>
                        <div className="flex gap-4">
                            <Avatar>
                                <AvatarImage src="https://placehold.co/48x48.png" data-ai-hint="cat sunglasses" alt="@RaphaelMemes" />
                                <AvatarFallback>RM</AvatarFallback>
                            </Avatar>
                            <div className="w-full">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">Raphael Memes</p>
                                        <Check className="h-4 w-4 text-blue-500 fill-blue-500" />
                                        <p className="text-sm text-muted-foreground">@RaphaelMemes · 2d</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="mb-2">Moh plateia</p>
                                <div className="relative aspect-video">
                                    <Image src="https://placehold.co/500x281.png" data-ai-hint="funny meme" alt="Meme video" layout="fill" objectFit="cover" className="rounded-2xl border" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-black/50 p-3 rounded-full">
                                            <Video className="h-8 w-8 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between text-muted-foreground pr-4">
                                    <div className="flex items-center gap-1">
                                    <MessageCircle className="h-5 w-5" />
                                    <span>15</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                    <Repeat className="h-5 w-5" />
                                    <span>289</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                    <Heart className="h-5 w-5" />
                                    <span>1.2k</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                </ul>
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
