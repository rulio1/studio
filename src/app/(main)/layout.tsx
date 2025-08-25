
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import HomeLoading from '@/app/(main)/home/loading';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import DesktopSidebar from '@/components/desktop-sidebar';
import RightSidebar from '@/components/right-sidebar';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Notification {
    id: string;
    type: 'like' | 'follow' | 'post' | 'retweet' | 'mention' | 'unfollow';
    fromUserId: string;
    fromUser: {
        name: string;
        avatar: string;
        handle: string;
        isVerified?: boolean;
    };
    text: string;
    postContent?: string;
    postId?: string;
    createdAt: any;
    read: boolean;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initialLoadTime = useRef(new Date());

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
            setIsLoading(false);
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
                    const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
                    
                    // Only show toasts for notifications created after the page loaded
                    if (notification.createdAt && notification.createdAt.toDate() > initialLoadTime.current) {
                        toast({
                            title: `${notification.fromUser.name} ${notification.text}`,
                            description: notification.postContent,
                            onClick: () => {
                                if (notification.type === 'follow' || notification.type === 'unfollow') {
                                    router.push(`/profile/${notification.fromUserId}`);
                                } else if (notification.postId) {
                                    router.push(`/post/${notification.postId}`);
                                }
                            }
                        });
                    }
                }
            });
        });

        return () => unsubscribe();

    }, [user, router, toast]);

    // Pages where the FAB should not be shown on mobile
    const fabBlacklist = [
        '/messages/',
        '/chat',
        '/profile/edit',
        '/privacy',
    ];

    const showFab = !fabBlacklist.some(path => pathname.startsWith(path) && pathname !== '/messages');
    
    if (isLoading || !user) {
        return <HomeLoading />;
    }

    // Hide sidebars on specific pages for a more focused view
    const hideSidebars = [
        '/chat',
        '/profile/edit',
        '/settings'
    ].some(path => pathname.startsWith(path));

    if (hideSidebars) {
         return (
            <div className="flex min-h-svh justify-center">
                <main className="w-full md:max-w-2xl md:border-x">
                    {children}
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
                {children}
            </main>
            <RightSidebar />
            <div className="md:hidden">
                {showFab && <CreatePostFAB />}
                <BottomNavBar />
            </div>
        </div>
    );
}
