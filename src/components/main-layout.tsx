
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BottomNavBar from './bottom-nav-bar';
import React from 'react';
import CreatePostModal from './create-post-modal';
import { Toaster } from './ui/toaster';


export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const noLayoutPages = ['/login', '/register', '/'];
    if (noLayoutPages.includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen">
            <main className="flex-1 min-w-0 pb-24 md:pb-0">
              {children}
            </main>
            {isClient && (
                <>
                    <CreatePostModal />
                    <BottomNavBar />
                    <Toaster />
                </>
            )}
        </div>
    );
}
