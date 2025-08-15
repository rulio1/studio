
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
            const q = query(
                collection(db, "notifications"),
                where("toUserId", "==", user.uid),
                where("read", "==", false)
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setNotificationCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [user]);

    return (
        <footer className="fixed bottom-2 inset-x-0 z-10 flex justify-center md:hidden">
            <nav className="flex justify-around items-center h-16 w-[calc(100%-2rem)] max-w-sm bg-background/70 backdrop-blur-lg border rounded-full shadow-lg">
                {navItems.map((item) => (
                    <Link key={item.href} href={item.href} className={`relative flex-1 flex justify-center items-center h-full rounded-full transition-colors ${pathname.startsWith(item.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <item.icon className="h-7 w-7" />
                        {item.label === 'Notificações' && notificationCount > 0 && (
                             <Badge className="absolute top-2 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white p-0 text-xs">
                                {notificationCount}
                            </Badge>
                        )}
                    </Link>
                ))}
            </nav>
        </footer>
    );
}
