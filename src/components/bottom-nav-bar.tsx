
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Skeleton } from './ui/skeleton';

interface ChirpUser {
    uid: string;
    avatar: string;
    displayName: string;
}


export default function BottomNavBar() {
    const pathname = usePathname();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const leftNavItems = [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/search', icon: Search, label: 'Busca' },
    ];
    
    const rightNavItems = [
        { href: '/notifications', icon: Bell, label: 'Notificações' },
        { href: '/messages', icon: Mail, label: 'Mensagens' },
    ];

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
        if (!user) {
            // Reset counts and user info on logout
            setChirpUser(null);
            setNotificationCount(0);
            setMessageCount(0);
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);

        // User listener
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setChirpUser(doc.data() as ChirpUser);
            }
            setIsLoading(false);
        });

        // Notifications listener
        const notificationsQuery = query(
            collection(db, "notifications"),
            where("toUserId", "==", user.uid),
            where("read", "==", false)
        );
        const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
            setNotificationCount(snapshot.size);
        });

        // Messages listener
        const conversationsQuery = query(
            collection(db, "conversations"),
            where("participants", "array-contains", user.uid)
        );
        const unsubscribeMessages = onSnapshot(conversationsQuery, (snapshot) => {
            let totalUnread = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const unread = data.unreadCounts?.[user.uid] || 0;
                totalUnread += unread;
            });
            setMessageCount(totalUnread);
        });

        return () => {
            unsubscribeUser();
            unsubscribeNotifications();
            unsubscribeMessages();
        };
    }, [user]);

    return (
        <footer className="fixed bottom-4 inset-x-4 z-50 border rounded-full bg-background/70 backdrop-blur-lg">
            <nav className="flex justify-around items-center h-16 w-full px-2">
                {leftNavItems.map((item) => (
                    <Link key={item.href} href={item.href} className={`relative flex-1 flex justify-center items-center h-full rounded-full transition-colors ${pathname.startsWith(item.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <item.icon className="h-7 w-7" />
                    </Link>
                ))}

                 <div className="relative flex-1 flex justify-center items-center h-full rounded-full">
                    {isLoading ? (
                        <Skeleton className="h-8 w-8 rounded-full" />
                    ) : user && chirpUser ? (
                        <Link href={`/profile/${user.uid}`} className={`transition-opacity hover:opacity-80 ${pathname.startsWith(`/profile/`) ? 'border-2 border-primary rounded-full p-0.5' : ''}`}>
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={chirpUser.avatar} alt={chirpUser.displayName} />
                                <AvatarFallback>{chirpUser.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                        </Link>
                    ) : null}
                </div>

                {rightNavItems.map((item) => (
                    <Link key={item.href} href={item.href} className={`relative flex-1 flex justify-center items-center h-full rounded-full transition-colors ${pathname.startsWith(item.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <item.icon className="h-7 w-7" />
                        {item.label === 'Notificações' && notificationCount > 0 && (
                             <Badge className="absolute top-2 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white p-0 text-xs">
                                {notificationCount}
                            </Badge>
                        )}
                        {item.label === 'Mensagens' && messageCount > 0 && (
                             <Badge className="absolute top-2 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white p-0 text-xs">
                                {messageCount}
                            </Badge>
                        )}
                    </Link>
                ))}
            </nav>
        </footer>
    );
}
