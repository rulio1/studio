
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Bell, Mail, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Badge } from './ui/badge';

interface ZisprUser {
    uid: string;
    avatar: string;
    displayName: string;
    handle: string;
}

export default function BottomNavBar() {
    const pathname = usePathname();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const navItems = [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/search', icon: Search, label: 'Busca' },
        { href: zisprUser ? `/profile/${zisprUser.uid}` : '#', icon: User, label: 'Perfil' },
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
            setZisprUser(null);
            setNotificationCount(0);
            setMessageCount(0);
            setIsLoading(false);
            return () => {}; // Return an empty function for cleanup
        }
        
        setIsLoading(true);

        // User listener
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
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
            snapshot.docs.forEach(doc => {
                 const data = doc.data();
                if (!data.deletedFor || !data.deletedFor.includes(user.uid)) {
                    const unread = data.unreadCounts?.[user.uid] || 0;
                    totalUnread += unread;
                }
            });
            setMessageCount(totalUnread);
        });

        return () => {
            unsubscribeUser();
            unsubscribeNotifications();
            unsubscribeMessages();
        };
    }, [user]);

    const getCountForItem = (label: string) => {
        if (label === 'Notificações') return notificationCount;
        if (label === 'Mensagens') return messageCount;
        return 0;
    }
    
    const getIsActive = (href: string, label: string) => {
        if (label === 'Perfil') {
            return pathname.startsWith('/profile/');
        }
        return pathname === href;
    };


    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 h-[var(--bottom-nav-height)] bg-background border-t md:hidden flex justify-around items-center">
            {navItems.map((item) => {
                 const count = getCountForItem(item.label);
                 const isActive = getIsActive(item.href, item.label);
                return (
                    <Link key={item.href} href={item.href} className={`relative flex-1 flex justify-center items-center h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <item.icon className="h-7 w-7" />
                        {count > 0 && (
                             <Badge className="absolute top-1.5 right-[calc(50%-2rem)] h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground p-0 text-xs">
                                {count}
                            </Badge>
                        )}
                    </Link>
                )
            })}
        </nav>
    );
}
