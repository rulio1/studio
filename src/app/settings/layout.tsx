
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const titleMap: Record<string, string> = {
    'settings': 'Configurações e privacidade',
    'account': 'Sua Conta',
    'change-password': 'Alterar Senha',
    'deactivate': 'Desativar Conta',
    'delete': 'Excluir Conta',
};

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [pageTitle, setPageTitle] = useState('Configurações');

    useEffect(() => {
        const pathSegments = pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        const title = titleMap[lastSegment] || 'Configurações';
        setPageTitle(title);
    }, [pathname]);
    
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
