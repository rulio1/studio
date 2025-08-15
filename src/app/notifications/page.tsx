
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Settings, Star, Users, Heart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    type: 'like' | 'follow' | 'post';
    fromUser: {
        name: string;
        avatar: string;
    };
    text: string;
    postContent?: string;
    createdAt: any;
    time: string;
}

const iconMap = {
    like: { icon: Heart, color: 'text-red-500' },
    follow: { icon: Users, color: 'text-blue-500' },
    post: { icon: Star, color: 'text-purple-500' },
};


export default function NotificationsPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setIsLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;
        
        setIsLoading(true);
        const q = query(
            collection(db, "notifications"),
            where("toUserId", "==", user.uid)
            // orderBy("createdAt", "desc") // Temporarily removed to prevent index error
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate()) + ' ago' : 'Just now',
                } as Notification;
            });
            // Sort client-side as a fallback
            notifs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setNotifications(notifs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

  return (
    <>
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <Avatar className="h-8 w-8">
            {user ? <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} /> : null}
            <AvatarFallback>{user?.displayName?.[0] || 'A'}</AvatarFallback>
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
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : notifications.length === 0 ? (
                     <div className="p-8 text-center text-muted-foreground">
                        <Bell className="mx-auto h-16 w-16 mb-4" />
                        <h3 className="font-bold text-2xl text-foreground">No notifications yet</h3>
                        <p>When you have new notifications, they'll show up here.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {notifications.map((item) => {
                            const { icon: Icon, color } = iconMap[item.type] || iconMap.post;
                            return (
                                <li key={item.id} className="p-4 flex gap-4 hover:bg-muted/50 cursor-pointer">
                                <div className="w-8 flex justify-end">
                                    <Icon className={`h-6 w-6 ${color}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={item.fromUser.avatar} alt={item.fromUser.name} />
                                            <AvatarFallback>{item.fromUser.name[0]}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <p>
                                        <span className="font-bold">{item.fromUser.name}</span>
                                        <span className="font-normal text-muted-foreground"> {item.text}</span>
                                    </p>
                                    {item.postContent && <p className="text-muted-foreground mt-1">{item.postContent}</p>}
                                    <p className="text-sm text-muted-foreground mt-1">{item.time}</p>
                                </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
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
