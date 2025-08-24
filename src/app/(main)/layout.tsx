
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import HomeLoading from '@/app/(main)/home/loading';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import DesktopSidebar from '@/components/desktop-sidebar';
import RightSidebar from '@/components/right-sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
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
