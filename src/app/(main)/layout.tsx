
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import HomeLoading from '@/app/(main)/home/loading';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import DesktopSidebar from '@/components/desktop-sidebar';
import RightSidebar from '@/components/right-sidebar';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function MainLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
    const initialLoadTime = useRef(new Date());

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                // This check is now primarily handled by the parent MainLayout
            } else {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user) return;
    
        const notificationsQuery = query(
            collection(db, "notifications"), 
            where("toUserId", "==", user.uid)
        );
    
        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const notification = change.doc.data();
                    const notificationTime = notification.createdAt?.toDate();
    
                    if (notificationTime && notificationTime > initialLoadTime.current) {
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
            });
        });
    
        return () => unsubscribe();
    }, [user, router, toast]);

    const fabBlacklist = [
        '/messages/',
        '/chat',
        '/profile/edit',
        '/privacy',
    ];
    const showFab = !fabBlacklist.some(path => pathname.startsWith(path) && pathname !== '/messages');
    
    const hideSidebars = [
        '/chat',
        '/profile/edit',
        '/settings'
    ].some(path => pathname.startsWith(path));

    if (hideSidebars) {
         return (
            <div className="flex min-h-svh justify-center">
                <main className="w-full md:max-w-2xl md:border-x">
                    <div className="animate-fade-in animate-slide-in-from-bottom">
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
        <div className="flex min-h-svh justify-center">
            <DesktopSidebar />
            <main className="flex-1 min-w-0 pb-24 md:pb-0 max-w-2xl border-x">
                 <div className="animate-fade-in animate-slide-in-from-bottom">
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
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                // If after checking, there's no user, redirect.
                router.push('/login');
            } else {
                // If there is a user, stop loading and show the content.
                setIsLoading(false);
            }
        });

        // Handle case where auth takes a while to initialize
        const timer = setTimeout(() => {
            if (auth.currentUser === null) {
                setIsLoading(false); // Stop loading even if there's no user, to prevent infinite spinner
                router.push('/login');
            } else {
                // Also handle the case where user is available but loading state hasn't changed
                setIsLoading(false);
            }
        }, 2500); // 2.5-second timeout as a fallback

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, [router]);

    if (isLoading) {
        return <HomeLoading />;
    }

    return (
        <Suspense fallback={<HomeLoading />}>
            <MainLayoutClient>{children}</MainLayoutClient>
        </Suspense>
    );
}
