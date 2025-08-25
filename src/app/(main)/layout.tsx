
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import HomeLoading from '@/app/(main)/home/loading';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, app } from '@/lib/firebase';
import DesktopSidebar from '@/components/desktop-sidebar';
import RightSidebar from '@/components/right-sidebar';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
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
        if ('serviceWorker' in navigator && typeof window !== 'undefined') {
            const messaging = getMessaging(app);

            // Request permission and get token
            const requestPermission = async () => {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted' && user) {
                        const currentToken = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY_HERE' }); // You need to generate and add your VAPID key
                        if (currentToken) {
                            console.log('FCM Token:', currentToken);
                            // Save the token to the user's document in Firestore
                            const userDocRef = doc(db, 'users', user.uid);
                            await updateDoc(userDocRef, { fcmToken: currentToken });
                        } else {
                            console.log('No registration token available. Request permission to generate one.');
                        }
                    } else {
                        console.log('Unable to get permission to notify.');
                    }
                } catch (error) {
                    console.error('An error occurred while retrieving token. ', error);
                }
            };
            
            if(user) requestPermission();

            // Handle foreground messages
            const unsubscribeOnMessage = onMessage(messaging, (payload) => {
                console.log('Message received. ', payload);
                toast({
                    title: payload.notification?.title,
                    description: payload.notification?.body,
                    onClick: () => {
                       if (payload.data?.url) {
                           router.push(payload.data.url);
                       }
                    }
                });
            });

            return () => {
                unsubscribeOnMessage();
            };
        }
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
