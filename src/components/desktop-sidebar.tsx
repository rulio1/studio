
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
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
import { Bird, Home, Bell, Mail, User, Bookmark, MoreHorizontal, Feather, LogOut, Settings, BadgeCheck, HandHeart } from 'lucide-react';
import CreatePostModal from './create-post-modal';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ZisprUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
}

export default function DesktopSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [notificationCount, setNotificationCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);

    const navItems = [
        { href: '/home', icon: Home, label: 'Início', count: 0 },
        { href: '/notifications', icon: Bell, label: 'Notificações', count: notificationCount },
        { href: '/messages', icon: Mail, label: 'Mensagens', count: messageCount },
        { href: '/saved', icon: Bookmark, label: 'Salvos', count: 0 },
        { href: zisprUser ? `/profile/${zisprUser.uid}` : '#', icon: User, label: 'Perfil', count: 0 },
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
            setNotificationCount(0);
            setMessageCount(0);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
            }
            setIsLoading(false);
        });

        const notificationsQuery = query(
            collection(db, "notifications"),
            where("toUserId", "==", user.uid),
            where("read", "==", false)
        );
        const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
            setNotificationCount(snapshot.size);
        });

        const conversationsQuery = query(
            collection(db, "conversations"),
            where("participants", "array-contains", user.uid)
        );
        const unsubscribeMessages = onSnapshot(conversationsQuery, (snapshot) => {
            let totalUnread = 0;
            snapshot.forEach(doc => {
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

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            window.location.href = '/login';
        } catch (error) {
            toast({ title: 'Erro ao sair', variant: 'destructive' });
        }
    };
    
    const getIsActive = (href: string) => {
        if (href === '/home') return pathname === href;
        if (zisprUser && href.startsWith(`/profile/${zisprUser.uid}`)) {
            return pathname === `/profile/${zisprUser.uid}`;
        }
        return pathname.startsWith(href);
    };

    const isZisprAccount = zisprUser?.handle === '@Zispr';
    const isUserVerified = zisprUser?.isVerified || zisprUser?.handle === '@Rulio';

    return (
        <aside className="sticky top-0 h-screen w-64 hidden md:flex flex-col justify-between items-end p-2 border-r">
            <div className="flex flex-col items-start gap-2 w-full">
                <Link href="/home" className="p-3">
                    <Bird className="h-8 w-8 text-primary" />
                </Link>

                <nav className="w-full">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                             <li key={item.label} className="relative">
                                <div className="relative">
                                    <Link href={item.href} passHref>
                                        <Button variant="ghost" className={`w-full justify-start text-xl p-6 ${getIsActive(item.href) ? 'font-bold' : ''}`}>
                                            <item.icon className="h-7 w-7 mr-4" />
                                            <span>{item.label}</span>
                                        </Button>
                                    </Link>
                                    {item.count > 0 && (
                                        <Badge className="absolute top-3 left-8 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white p-0 text-xs pointer-events-none">
                                            {item.count}
                                        </Badge>
                                    )}
                                </div>
                            </li>
                        ))}
                         <li>
                            <Link href="/supporter" passHref>
                                <Button variant="ghost" className={`w-full justify-start text-xl p-6 ${getIsActive('/supporter') ? 'font-bold' : ''}`}>
                                    <HandHeart className="h-7 w-7 mr-4" />
                                    <span>Seja um Apoiador</span>
                                </Button>
                            </Link>
                        </li>
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
                                    <p className="font-bold truncate flex items-center gap-1">
                                        {zisprUser.displayName}
                                        {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isUserVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                                    </p>
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
