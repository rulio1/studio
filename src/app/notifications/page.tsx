
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Home, Mail, MessageCircle, Mic, MoreHorizontal, PlayCircle, Plus, Search, Settings, Star, Video, Users, Heart } from 'lucide-react';
import Link from 'next/link';

const notifications = [
    { 
        type: 'like', 
        icon: Heart, 
        iconColor: 'text-red-500',
        users: [{ name: 'Taylor Swift', avatar: 'https://placehold.co/48x48.png'}],
        text: 'liked your post',
        post: 'Just released a new album! 🚀',
        time: '2h'
    },
    { 
        type: 'follow', 
        icon: Users, 
        iconColor: 'text-blue-500',
        users: [{ name: 'Vercel', avatar: 'https://placehold.co/48x48.png'}, { name: 'Next.js', avatar: 'https://placehold.co/48x48.png'}],
        text: 'followed you',
        time: '1d'
    },
    { 
        type: 'post', 
        icon: Star, 
        iconColor: 'text-purple-500',
        text: 'Recent post from Beta Profiles',
        post: 'iOS 26 Beta 5 brings some tweaks to the Liquid Glass tab bar 👀 pic.x.com/qv1GUVZEUP',
        time: '4d'
    },
     { 
        type: 'post', 
        icon: Star, 
        iconColor: 'text-purple-500',
        users: [{ name: 'CHOQUEI', avatar: 'https://placehold.co/48x48.png'}],
        text: '',
        post: '🚨 ATENÇÃO: Felca revela que, por conta das denúncias feitas, agora anda com seguranças e carro blindado. pic.x.com/k3R8YUawpn',
        time: '4d'
    },
];


export default function NotificationsPage() {
  return (
    <>
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://placehold.co/40x40.png" alt="admin" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-center">Notifications</h1>
          </div>
          <Settings className="h-6 w-6" />
        </div>
        <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
              <TabsTrigger value="all" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">All</TabsTrigger>
              <TabsTrigger value="mentions" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Mentions</TabsTrigger>
               <TabsTrigger value="verified" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Verified</TabsTrigger>
            </TabsList>
        </Tabs>
      </header>

        <Tabs defaultValue="all">
            <TabsContent value="all" className="mt-0">
                <ul className="divide-y divide-border">
                    {notifications.map((item, index) => (
                        <li key={index} className="p-4 flex gap-4 hover:bg-muted/50 cursor-pointer">
                           <div className="w-8 flex justify-end">
                                <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                           </div>
                           <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">{item.time}</p>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                               </div>
                               <div className="flex items-center gap-2 mb-2">
                                    {item.users && item.users.map((user, userIndex) => (
                                        <Avatar key={userIndex} className="h-8 w-8">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                                        </Avatar>
                                    ))}
                               </div>
                                <p className="font-bold">
                                    {item.users && <span className="mr-1">{item.users.map(u => u.name).join(' & ')}</span>}
                                    <span className="font-normal text-muted-foreground">{item.text}</span>
                                </p>
                                {item.post && <p className="text-muted-foreground mt-1">{item.post}</p>}
                           </div>
                        </li>
                    ))}
                </ul>
            </TabsContent>
            <TabsContent value="mentions" className="mt-0">
                <div className="p-8 text-center text-muted-foreground">
                    <h3 className="font-bold text-2xl text-foreground">Nothing to see here — yet</h3>
                    <p>When someone mentions you, you’ll find it here.</p>
                </div>
            </TabsContent>
            <TabsContent value="verified" className="mt-0">
                 <div className="p-8 text-center text-muted-foreground">
                    <h3 className="font-bold text-2xl text-foreground">Nothing to see here — yet</h3>
                    <p>Likes, mentions, Reposts, and a whole lot more — when it comes from a verified account, you’ll find it here.</p>
                </div>
            </TabsContent>
        </Tabs>
    </>
  );
}
