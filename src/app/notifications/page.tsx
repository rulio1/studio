
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Home, Mail, MessageCircle, Mic, MoreHorizontal, PlayCircle, Plus, Search, Settings, Star, Video, Users } from 'lucide-react';
import Link from 'next/link';

const notifications = [
    { 
        type: 'space', 
        icon: Mic, 
        iconColor: 'text-purple-500',
        avatar: 'https://placehold.co/48x48.png',
        user: 'Minaj',
        text: 'is speaking in easyyyyyyyy af',
        time: '20m',
        space: {
            host: 'carm.',
            title: 'easyyyyyyyy af',
            listeners: 20
        }
    },
    { 
        type: 'live', 
        icon: Video, 
        iconColor: 'text-pink-500',
        avatar: 'https://placehold.co/48x48.png',
        user: 'Paradigma Education',
        text: 'is LIVE: "Estamos próximos ao TOPO do CICLO? | RANGO CRIPTO #23"',
        time: '12h'
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
        avatar: 'https://placehold.co/48x48.png',
        user: 'CHOQUEI',
        post: '🚨 ATENÇÃO: Felca revela que, por conta das denúncias feitas, agora anda com seguranças e carro blindado. pic.x.com/k3R8YUawpn',
        time: '4d'
    },
];


export default function NotificationsPage() {
  return (
    <div className="flex flex-col h-screen bg-background relative">
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

      <main className="flex-1 overflow-y-auto">
        <Tabs defaultValue="all">
            <TabsContent value="all" className="mt-0">
                <ul className="divide-y divide-border">
                    {notifications.map((item, index) => (
                        <li key={index} className="p-4 flex gap-4 hover:bg-muted/50 cursor-pointer">
                           <div className="w-8 flex justify-end">
                                <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                           </div>
                           <div className="flex-1">
                               <div className="flex justify-between items-start">
                                    <div>
                                        {item.avatar && <Avatar className="h-8 w-8 mb-2">
                                            <AvatarImage src={item.avatar} alt={item.user} />
                                            <AvatarFallback>{item.user?.[0]}</AvatarFallback>
                                        </Avatar>}
                                        <p className="font-bold">
                                            {item.user && <span className="mr-1">{item.user}</span>}
                                            <span className="font-normal text-muted-foreground">{item.text}</span>
                                        </p>
                                        {item.post && <p className="text-muted-foreground mt-1">{item.post}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{item.time}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                               </div>

                                {item.space && (
                                     <div className="mt-2 p-4 rounded-xl bg-primary/20 border border-primary/50">
                                         <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src="https://placehold.co/20x20.png" alt={item.space.host} />
                                                    <AvatarFallback>{item.space.host[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-semibold text-sm">{item.space.host}</span>
                                                <span className="text-xs bg-primary/80 text-primary-foreground rounded-sm px-1">Host</span>
                                            </div>
                                             <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                         </div>
                                         <p className="font-bold text-lg">{item.space.title}</p>
                                         <div className="flex items-center gap-2 mt-4">
                                            <div className="flex -space-x-2">
                                                <Avatar className="h-5 w-5 border-2 border-primary/20">
                                                    <AvatarImage src="https://placehold.co/20x20.png" />
                                                </Avatar>
                                                <Avatar className="h-5 w-5 border-2 border-primary/20">
                                                    <AvatarImage src="https://placehold.co/20x20.png" />
                                                </Avatar>
                                                <Avatar className="h-5 w-5 border-2 border-primary/20">
                                                    <AvatarImage src="https://placehold.co/20x20.png" />
                                                </Avatar>
                                            </div>
                                            <span className="text-sm text-muted-foreground">{item.space.listeners} listening</span>
                                         </div>
                                     </div>
                                )}
                           </div>
                        </li>
                    ))}
                </ul>
            </TabsContent>
            <TabsContent value="mentions" className="mt-0">
                <div className="p-4 text-center text-muted-foreground">
                    <p>No mentions yet.</p>
                </div>
            </TabsContent>
            <TabsContent value="verified" className="mt-0">
                 <div className="p-4 text-center text-muted-foreground">
                    <p>No notifications from verified accounts yet.</p>
                </div>
            </TabsContent>
        </Tabs>
      </main>

      <Button className="absolute bottom-20 right-4 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90">
        <Plus className="h-8 w-8" />
      </Button>

      <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t">
        <nav className="flex justify-around items-center h-14">
            <Link href="/home" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Home className="h-7 w-7" />
            </Link>
            <Link href="/search" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Search className="h-7 w-7" />
            </Link>
            <Link href="#" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Users className="h-7 w-7" />
            </Link>
            <Link href="#" className="flex-1 flex justify-center items-center text-muted-foreground">
              <PlayCircle className="h-7 w-7" />
            </Link>
            <Link href="/notifications" className="flex-1 flex justify-center items-center text-foreground">
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
