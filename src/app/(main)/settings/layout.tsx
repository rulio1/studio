
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [pageTitle, setPageTitle] = useState('Configurações');
    const { t } = useTranslation();
    
    useEffect(() => {
        const titleMap: Record<string, string> = {
            'settings': t('settings.layout.title.settings'),
            'account': t('settings.layout.title.account'),
            'change-password': t('settings.layout.title.changePassword'),
            'deactivate': t('settings.layout.title.deactivate'),
            'delete': t('settings.layout.title.delete'),
            'privacy': t('settings.layout.title.privacy'),
            'notifications': t('settings.layout.title.notifications'),
            'language': t('settings.layout.title.language'),
            'blocked': 'Contas Bloqueadas',
            'collections': 'Gerenciar Coleções',
        };

        const pathSegments = pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        const title = titleMap[lastSegment] || t('settings.layout.title.settings');
        setPageTitle(title);
    }, [pathname, t]);
    
    return (
        <div className="flex flex-col bg-background">
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
