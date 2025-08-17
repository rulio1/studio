
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BottomNavBar from './bottom-nav-bar';
import React from 'react';
import CreatePostModal from './create-post-modal';
import { Toaster } from './ui/toaster';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from './ui/sidebar';
import { ThemeToggle } from './theme-toggle';
import { Home, Search, Users, Bell, Mail, User, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


interface ChirpUser {
    uid: string;
    displayName: string;
    email: string;
    handle: string;
    avatar: string;
    banner: string;
    bio: string;
    location: string;
    website: string;
    birthDate: Date | null;
    followers: string[];
    following: string[];
}

function DesktopSidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, "users", currentUser.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setChirpUser(doc.data() as ChirpUser);
                    }
                });
                return () => unsubscribeUser();
            }
        });
        return () => unsubscribe();
    }, []);

    if (!user || !chirpUser) {
        return null;
    }

    const navItems = [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/search', icon: Search, label: 'Busca' },
        { href: '/communities', icon: Users, label: 'Comunidades' },
        { href: '/notifications', icon: Bell, label: 'Notificações' },
        { href: '/messages', icon: Mail, label: 'Mensagens' },
        { href: `/profile/${user.uid}`, icon: User, label: 'Perfil' },
        { href: '/saved', icon: Bookmark, label: 'Itens Salvos' },
    ];


    return (
        <Sidebar className="border-r hidden md:flex" collapsible="icon">
            <SidebarContent className="p-2">
                <SidebarHeader>
                    <ThemeToggle/>
                </SidebarHeader>
                <SidebarMenu>
                {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                         <Link href={item.href} className="w-full">
                            <SidebarMenuButton tooltip={item.label} isActive={pathname.startsWith(item.href)}>
                                <item.icon />
                                <span>{item.label}</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </SidebarContent>
             <SidebarFooter>
                <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={chirpUser.avatar} alt={chirpUser.handle} />
                      <AvatarFallback>{chirpUser.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm truncate">{chirpUser.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{chirpUser.handle}</p>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}


export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const noLayoutPages = ['/login', '/register', '/'];
    if (noLayoutPages.includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <DesktopSidebar />
                <main className="flex-1 min-w-0 pb-24 md:pb-0">
                  {children}
                </main>
                {isClient && (
                    <>
                        <CreatePostModal />
                        <BottomNavBar />
                    </>
                )}
            </div>
        </SidebarProvider>
    );
}

