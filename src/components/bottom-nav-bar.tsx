
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Badge } from './ui/badge';

export default function BottomNavBar() {
    const pathname = usePathname();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);

    const navItems = [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/search', icon: Search, label: 'Busca' },
        { href: '/communities', icon: Users, label: 'Comunidades' },
        { href: '/notifications', icon: Bell, label: 'Notificações' },
        { href: '/messages', icon: Mail, label: 'Mensagens' },
    ];

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (user) {
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
                unsubscribeNotifications();
                unsubscribeMessages();
            };
        }
    }, [user]);

    return (
        <footer className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/70 backdrop-blur-lg md:bottom-4 md:border md:rounded-full md:w-auto md:left-1/2 md:-translate-x-1/2">
            <nav className="flex justify-around items-center h-16 w-full px-2 md:w-auto">
                {navItems.map((item) => (
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
