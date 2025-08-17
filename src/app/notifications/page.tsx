
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Settings, Star, Users, Heart, Loader2, AtSign, BadgeCheck, Bird, UserX } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, writeBatch, getDocs, doc } from 'firebase/firestore';
import { formatTimeAgo } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    type: 'like' | 'follow' | 'post' | 'retweet' | 'mention' | 'unfollow';
    fromUserId: string;
    fromUser: {
        name: string;
        avatar: string;
        handle: string;
        isVerified?: boolean;
    };
    text: string;
    postContent?: string;
    postId?: string;
    createdAt: any;
    time: string;
    read: boolean;
}

const iconMap = {
    like: { icon: Heart, color: 'text-red-500' },
    follow: { icon: Users, color: 'text-blue-500' },
    post: { icon: Star, color: 'text-purple-500' },
    retweet: { icon: Users, color: 'text-green-500' },
    mention: { icon: AtSign, color: 'text-primary' },
    unfollow: { icon: UserX, color: 'text-muted-foreground' },
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
    const router = useRouter();
    const { icon: Icon, color } = iconMap[notification.type] || iconMap.post;
    const [time, setTime] = useState('');
    
    useEffect(() => {
        if (notification.createdAt) {
            try {
                const date = notification.createdAt.toDate();
                setTime(formatTimeAgo(date));
            } catch(e) {
                setTime('agora');
            }
        }
    }, [notification.createdAt]);
    
    const handleItemClick = () => {
        if (notification.type === 'follow' || notification.type === 'unfollow') {
            router.push(`/profile/${notification.fromUserId}`);
        } else if (notification.postId) {
            router.push(`/post/${notification.postId}`);
        }
    };
    
    const handleAvatarClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Impede que o clique no avatar acione o clique no item da lista
        router.push(`/profile/${notification.fromUserId}`);
    };

    const isVerified = notification.fromUser.isVerified || notification.fromUser.handle === '@rulio';
    const isChirpAccount = notification.fromUser.handle === '@chirp';

    return (
        <li className={`p-4 flex gap-4 hover:bg-muted/50 cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`} onClick={handleItemClick}>
            <div className="w-8 flex justify-end">
                <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8" onClick={handleAvatarClick}>
                        <AvatarImage src={notification.fromUser.avatar} alt={notification.fromUser.name} />
                        <AvatarFallback>{notification.fromUser.name[0]}</AvatarFallback>
                    </Avatar>
                </div>
                <p>
                    <span className="font-bold">{notification.fromUser.name}</span>
                    {isChirpAccount ? <Bird className="inline-block h-4 w-4 text-primary ml-1" /> : (isVerified && <BadgeCheck className="inline-block h-4 w-4 text-primary ml-1" />)}
                    <span className="font-normal text-muted-foreground"> {notification.text}</span>
                </p>
                {notification.postContent && <p className="text-muted-foreground mt-1">{notification.postContent}</p>}
                <p className="text-sm text-muted-foreground mt-1">{time}</p>
            </div>
        </li>
    );
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

    const markNotificationsAsRead = async (userId: string) => {
        const unreadQuery = query(
            collection(db, "notifications"),
            where("toUserId", "==", userId),
            where("read", "==", false)
        );
        const snapshot = await getDocs(unreadQuery);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    };

    useEffect(() => {
        if (!user) return;
        
        markNotificationsAsRead(user.uid);

        setIsLoading(true);
        const q = query(
            collection(db, "notifications"),
            where("toUserId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    time: '', // will be handled by NotificationItem
                } as Notification;
            });
            // Sort client-side
            notifs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setNotifications(notifs);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar notificações:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const mentions = useMemo(() => {
        return notifications.filter(n => n.type === 'mention');
    }, [notifications]);

    const verifiedNotifications = useMemo(() => {
        return notifications.filter(n => n.fromUser.isVerified || n.fromUser.handle === '@chirp' || n.fromUser.handle === '@rulio');
    }, [notifications]);

  return (
    <Tabs defaultValue="all" className="flex flex-col h-screen">
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <div className="w-6"></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-center">Notificações</h1>
          </div>
           <div className="w-6"></div>
        </div>
        <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
            <TabsTrigger value="all" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Todas</TabsTrigger>
            <TabsTrigger value="verified" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Verificados</TabsTrigger>
            <TabsTrigger value="mentions" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Menções</TabsTrigger>
        </TabsList>
      </header>

        <div className="flex-1 overflow-y-auto">
            <TabsContent value="all" className="mt-0">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : notifications.length === 0 ? (
                     <div className="p-8 text-center text-muted-foreground">
                        <Bell className="mx-auto h-16 w-16 mb-4" />
                        <h3 className="font-bold text-2xl text-foreground">Nenhuma notificação ainda</h3>
                        <p>Quando você tiver novas notificações, elas aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {notifications.map((item) => (
                           <NotificationItem key={item.id} notification={item} />
                        ))}
                    </ul>
                )}
            </TabsContent>
            <TabsContent value="verified" className="mt-0">
                 {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : verifiedNotifications.length === 0 ? (
                     <div className="p-8 text-center text-muted-foreground">
                        <h3 className="font-bold text-2xl text-foreground">Nada para ver aqui — ainda</h3>
                        <p>Curtidas, menções, repostagens e muito mais — quando vier de uma conta verificada, você encontrará aqui.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {verifiedNotifications.map((item) => (
                           <NotificationItem key={item.id} notification={item} />
                        ))}
                    </ul>
                )}
            </TabsContent>
            <TabsContent value="mentions" className="mt-0">
                 {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : mentions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <h3 className="font-bold text-2xl text-foreground">Nada para ver aqui — ainda</h3>
                        <p>Quando alguém mencionar você, você encontrará aqui.</p>
                    </div>
                ) : (
                     <ul className="divide-y divide-border">
                        {mentions.map((item) => (
                           <NotificationItem key={item.id} notification={item} />
                        ))}
                    </ul>
                )}
            </TabsContent>
        </div>
    </Tabs>
  );
}
