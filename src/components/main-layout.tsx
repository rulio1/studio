
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BottomNavBar from './bottom-nav-bar';
import React from 'react';
import CreatePostFAB from './create-post-fab';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const noLayoutPages = ['/login', '/register', '/', '/privacy'];
    const shouldHideLayout = noLayoutPages.includes(pathname);

    if (shouldHideLayout) {
        return <>{children}</>;
    }
    
    // During server-side rendering or before the client has mounted,
    // we render nothing to avoid hydration mismatches.
    if (!isClient) {
        return null;
    }
    
    // Pages where the FAB should not be shown
    const fabBlacklist = [
        '/messages/', // Important: This targets specific message threads like /messages/xyz
        '/chat',
        '/profile/edit',
        '/communities/create',
    ];

    const showFab = !fabBlacklist.some(path => pathname.startsWith(path) && pathname !== '/messages');

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
