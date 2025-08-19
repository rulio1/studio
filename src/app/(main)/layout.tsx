
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
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
