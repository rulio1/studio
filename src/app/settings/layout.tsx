
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    // A simple regex to get the last part of the path for the title
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const titlePath = path.split('/').pop();
    const title = titlePath ? titlePath.charAt(0).toUpperCase() + titlePath.slice(1) : 'Configurações';
    const pageTitle = title === 'Settings' ? 'Configurações e privacidade' : 'Sua Conta';
    
    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">{pageTitle}</h1>
                </div>
            </header>
            {children}
        </div>
    );
}
