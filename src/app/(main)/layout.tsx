
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import HomeLoading from '@/app/(main)/home/loading';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

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
                // If no user is logged in, redirect to login page
                // This prevents flashes of content or permission errors
                router.push('/login');
            }
            // Only stop loading once the auth state is determined
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    // Pages where the FAB should not be shown
    const fabBlacklist = [
        '/messages/',
        '/chat',
        '/profile/edit',
        '/communities/create',
    ];

    const showFab = !fabBlacklist.some(path => pathname.startsWith(path) && pathname !== '/messages');
    
    if (isLoading) {
        return <HomeLoading />;
    }
    
    if (!user) {
        // This will be briefly shown while redirecting
        return <HomeLoading />;
    }

    return (
        <div className="flex min-h-screen">
            <main className="flex-1 min-w-0 pb-24 md:pb-0">
                {children}
            </main>
            {showFab && <CreatePostFAB />}
            <BottomNavBar />
        </div>
    );
}
