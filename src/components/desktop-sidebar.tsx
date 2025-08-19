
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Bird, Home, Bell, Mail, User, Bookmark, Users, MoreHorizontal, Feather, LogOut, Settings } from 'lucide-react';
import CreatePostModal from './create-post-modal';
import { Skeleton } from './ui/skeleton';

interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
}

export default function DesktopSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const navItems = [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/notifications', icon: Bell, label: 'Notificações' },
        { href: '/messages', icon: Mail, label: 'Mensagens' },
        { href: '/communities', icon: Users, label: 'Comunidades' },
        { href: '/saved', icon: Bookmark, label: 'Salvos' },
        { href: `/profile/${user?.uid}`, icon: User, label: 'Perfil' },
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
            setZisprUser(null);
            setIsLoading(false);
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
            }
            setIsLoading(false);
        });
        
        return () => unsubscribeUser();
    }, [user]);

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/login');
    };
    
    const getIsActive = (href: string) => {
        if (href === '/home') return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <aside className="sticky top-0 h-screen w-64 hidden md:flex flex-col justify-between items-end p-2 border-r">
            <div className="flex flex-col items-start gap-2 w-full">
                <Link href="/home" className="p-3">
                    <Bird className="h-8 w-8 text-primary" />
                </Link>

                <nav className="w-full">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.label}>
                                <Link href={item.href}>
                                     <Button variant="ghost" className={`w-full justify-start text-xl p-6 ${getIsActive(item.href) ? 'font-bold' : ''}`}>
                                        <item.icon className="h-7 w-7 mr-4" />
                                        {item.label}
                                    </Button>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <Button className="w-full rounded-full mt-4 p-6 text-lg" onClick={() => setIsModalOpen(true)}>
                    <Feather className="mr-2 h-5 w-5" />
                    Postar
                </Button>
            </div>

            <div className="w-full mb-4">
                 {isLoading ? (
                    <div className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ) : zisprUser && (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start items-center p-2 h-auto">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={zisprUser.avatar} alt={zisprUser.displayName} />
                                    <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="ml-3 text-left overflow-hidden">
                                    <p className="font-bold truncate">{zisprUser.displayName}</p>
                                    <p className="text-sm text-muted-foreground truncate">{zisprUser.handle}</p>
                                </div>
                                <MoreHorizontal className="ml-auto h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-60 mb-2" side="top">
                            <DropdownMenuItem onClick={() => router.push('/settings')}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configurações</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sair de {zisprUser.handle}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            
            <CreatePostModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </aside>
    );
}
