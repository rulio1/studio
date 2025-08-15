
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail, Users } from 'lucide-react';

export default function BottomNavBar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/search', icon: Search, label: 'Busca' },
        { href: '/communities', icon: Users, label: 'Comunidades' },
        { href: '/notifications', icon: Bell, label: 'Notificações' },
        { href: '/messages', icon: Mail, label: 'Mensagens' },
    ];

    return (
        <footer className="fixed bottom-2 inset-x-0 z-10 flex justify-center">
            <nav className="flex justify-around items-center h-16 w-[calc(100%-2rem)] max-w-sm bg-background/70 backdrop-blur-lg border rounded-full shadow-lg">
                {navItems.map((item) => (
                    <Link key={item.href} href={item.href} className={`flex-1 flex justify-center items-center h-full rounded-full transition-colors ${pathname === item.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <item.icon className="h-7 w-7" />
                    </Link>
                ))}
            </nav>
        </footer>
    );
}

    