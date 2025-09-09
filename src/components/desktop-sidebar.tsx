
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, User as FirebaseUser } from 'firebase/auth';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Bird, Home, Bell, Mail, User, Bookmark, MoreHorizontal, Feather, LogOut, Settings, BadgeCheck, Bot, Library, Radio, Languages, Check } from 'lucide-react';
import CreatePostModal from './create-post-modal';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/user-store';
import { useTranslation } from '@/hooks/use-translation';

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

export default function DesktopSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const { user, zisprUser, isLoading, language, setLanguage } = useUserStore();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);

    const navItems = [
        { href: '/home', icon: Home, label: t('sidebar.home'), count: 0 },
        { href: '/notifications', icon: Bell, label: t('sidebar.notifications'), count: notificationCount },
        { href: '/messages', icon: Mail, label: t('sidebar.messages'), count: messageCount },
        { href: '/news', icon: Radio, label: t('sidebar.news'), count: 0 },
        { href: '/saved', icon: Bookmark, label: t('sidebar.saved'), count: 0 },
        { href: '/profile/edit', icon: User, label: t('sidebar.profile'), count: 0 },
    ];

    useEffect(() => {
        if (!user) {
            setNotificationCount(0);
            setMessageCount(0);
            return;
        }

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
            unsubscribeNotifications();
            unsubscribeMessages();
        };
    }, [user]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            window.location.href = '/login';
        } catch (error) {
            toast({ title: t('toasts.signOutError.title'), variant: 'destructive' });
        }
    };
    
    const getIsActive = (href: string) => {
        if (href === '/home') return pathname === href;
        if (href === '/profile/edit' && zisprUser) {
            return pathname === `/profile/${zisprUser.uid}`;
        }
        return pathname.startsWith(href);
    };

    const isZisprAccount = zisprUser?.handle === '@Zispr' || zisprUser?.handle === '@ZisprUSA';
    const isRulioAccount = zisprUser?.handle === '@Rulio';
    const isUserVerified = zisprUser?.isVerified || isRulioAccount;
    const badgeColor = zisprUser?.badgeTier ? badgeColors[zisprUser.badgeTier] : 'text-primary';

    const getNavItemHref = (item: any) => {
        if (item.label === t('sidebar.profile') && zisprUser) {
            return `/profile/${zisprUser.uid}`;
        }
        return item.href;
    };
    
    const handleLanguageChange = (lang: 'pt' | 'en') => {
        setLanguage(lang);
    };

    return (
        <aside className="sticky top-0 h-screen w-64 hidden md:flex flex-col justify-between items-end p-2 border-r">
            <div className="flex flex-col items-start gap-2 w-full">
                <Link href="/home" className="w-full flex justify-center p-3">
                    <Bird className="h-8 w-8 text-primary" />
                </Link>

                <nav className="w-full">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                             <li key={item.label} className="relative">
                                <div className="relative">
                                    <Link href={getNavItemHref(item)} passHref>
                                        <Button variant="ghost" className={`w-full justify-start text-xl p-6 ${getIsActive(getNavItemHref(item)) ? 'font-bold' : ''}`}>
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
                    </ul>
                </nav>

                <Button className="w-full rounded-full mt-4 p-6 text-lg" onClick={() => setIsModalOpen(true)}>
                    <Feather className="mr-2 h-5 w-5" />
                    {t('sidebar.post')}
                </Button>

                <Link href="/chat" className='w-full'>
                    <Button variant="ghost" className="w-full justify-start text-xl p-6 mt-2">
                        <Bot className="h-7 w-7 mr-4" />
                        <span>{t('sidebar.zisprAi')}</span>
                    </Button>
                </Link>

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
                                    {isZisprAccount ? (
                                        <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                                            <Bird className="h-6 w-6 text-primary" />
                                        </div>
                                    ) : (
                                        <>
                                            <AvatarImage src={zisprUser.avatar} alt={zisprUser.displayName} />
                                            <AvatarFallback>{zisprUser.displayName[0]}</AvatarFallback>
                                        </>
                                    )}
                                </Avatar>
                                <div className="ml-3 text-left overflow-hidden">
                                    <p className="font-bold truncate flex items-center gap-1">
                                        {zisprUser.displayName}
                                        {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isUserVerified && <BadgeCheck className={`h-4 w-4 ${isRulioAccount ? 'text-white fill-primary' : badgeColor}`} />)}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">{zisprUser.handle}</p>
                                </div>
                                <MoreHorizontal className="ml-auto h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-60 mb-2" side="top">
                             <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Languages className="mr-2 h-4 w-4" />
                                    <span>Idioma</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleLanguageChange('pt')}>
                                        {language === 'pt' && <Check className="mr-2 h-4 w-4" />}
                                        Português
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                                        {language === 'en' && <Check className="mr-2 h-4 w-4" />}
                                        English
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuItem onClick={() => router.push('/settings')}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.settings')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.signOut', { handle: zisprUser.handle })}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            
            <CreatePostModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </aside>
    );
}
