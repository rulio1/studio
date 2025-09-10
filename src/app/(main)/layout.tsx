
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import HomeLoading from '@/app/(main)/home/loading';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db, requestNotificationPermission } from '@/lib/firebase';
import DesktopSidebar from '@/components/desktop-sidebar';
import RightSidebar from '@/components/right-sidebar';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/user-store';
import { useIsMobile } from '@/hooks/use-mobile';

function MainLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isLoading } = useUserStore();
    const initialLoadTime = useRef(new Date());
    const isMobile = useIsMobile();

    useEffect(() => {
        if (!user || isLoading) return;
    
        const notificationsQuery = query(
            collection(db, "notifications"), 
            where("toUserId", "==", user.uid)
        );
    
        const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === "added") {
                    const notification = change.doc.data();
                    const notificationTime = notification.createdAt?.toDate();
    
                    if (notificationTime && notificationTime > initialLoadTime.current) {
                        
                        const fromUserDoc = await getDoc(doc(db, "users", notification.fromUserId));
                        const fromUserData = fromUserDoc.data();

                        toast({
                            title: `${notification.fromUser.name}`,
                            description: `${notification.text}`,
                            onClick: () => {
                                if (notification.postId) {
                                    router.push(`/post/${notification.postId}`);
                                } else if (notification.fromUserId) {
                                    router.push(`/profile/${notification.fromUserId}`);
                                }
                            }
                        });
                    }
                }
            }
        });
    
        return () => unsubscribe();
    }, [user, isLoading, router, toast]);

    const fabBlacklist = [
        '/messages/',
        '/profile/edit',
        '/privacy',
        '/chat'
    ];
    const showFab = !fabBlacklist.some(path => pathname.startsWith(path) && pathname !== '/messages');
    
    // Specific logic for chat and conversation pages
    const isChatPage = pathname.startsWith('/chat');
    const isConversationPage = /^\/messages\/[^/]+$/.test(pathname);
    
    if (isChatPage || isConversationPage) {
        const pageClass = isConversationPage ? 'h-full' : 'h-full';
        return (
            <div className="flex h-screen justify-center">
                <DesktopSidebar />
                <main className="flex-1 min-w-0 max-w-2xl md:border-x">
                    <div className={`animate-fade-in animate-slide-in-from-bottom ${pageClass}`}>
                        {children}
                    </div>
                </main>
                 <RightSidebar />
                <div className="md:hidden">
                    {/* BottomNavBar is intentionally hidden on chat/conversation pages for mobile */}
                </div>
            </div>
        );
    }
    
    const hideSidebars = [
        '/profile/edit',
    ].some(path => pathname.startsWith(path));

    if (hideSidebars) {
         return (
            <div className="flex h-screen justify-center">
                <main className="flex-1 min-w-0 max-w-2xl md:border-x">
                    <div className="animate-fade-in animate-slide-in-from-bottom h-full">
                        {children}
                    </div>
                </main>
                <div className="md:hidden">
                    <BottomNavBar />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen justify-center">
            <DesktopSidebar />
            <main className="flex-1 min-w-0 max-w-2xl border-x flex flex-col">
                 <div className="flex-1 overflow-y-auto pb-[calc(var(--bottom-nav-height)+50px)] md:pb-0">
                    {children}
                </div>
            </main>
            <RightSidebar />
            <div className="md:hidden">
                {showFab && <CreatePostFAB />}
                <BottomNavBar />
            </div>
        </div>
    );
}


export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { isLoading, user } = useUserStore();
    const router = useRouter();

    useEffect(() => {
        // This effect will run once when the layout mounts, and whenever isLoading or user changes.
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, user, router]);


    if (isLoading) {
        return <HomeLoading />;
    }
    
    // Render children only if user is present after loading. 
    // The effect above will handle redirection.
    return user ? (
        <Suspense fallback={<HomeLoading />}>
            <MainLayoutClient>{children}</MainLayoutClient>
        </Suspense>
    ) : <HomeLoading />;
}
