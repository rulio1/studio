
'use client';

import { useRouter } from 'next/navigation';
import { User, Bell, Lock, ChevronRight, Languages, Library } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';

const SettingsItem = ({ icon, title, description, onClick }: { icon: React.ElementType, title: string, description: string, onClick?: () => void }) => {
    const Icon = icon;
    return (
        <div className="flex items-center p-4 hover:bg-muted/50 rounded-lg cursor-pointer" onClick={onClick}>
            <Icon className="h-6 w-6 mr-4 text-muted-foreground" />
            <div className="flex-1">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
    )
}

export default function SettingsPage() {
    const router = useRouter();
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-screen bg-background">
            <main className="flex-1 overflow-y-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.sections.yourAccount.title')}</CardTitle>
                        <CardDescription>{t('settings.sections.yourAccount.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <SettingsItem 
                            icon={User} 
                            title={t('settings.sections.yourAccount.item.title')}
                            description={t('settings.sections.yourAccount.item.description')}
                            onClick={() => router.push('/settings/account')}
                        />
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>{t('settings.sections.privacyAndSafety.title')}</CardTitle>
                        <CardDescription>{t('settings.sections.privacyAndSafety.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <SettingsItem 
                            icon={Lock} 
                            title={t('settings.sections.privacyAndSafety.item.title')}
                            description={t('settings.sections.privacyAndSafety.item.description')}
                            onClick={() => router.push('/settings/privacy')}
                        />
                    </CardContent>
                </Card>

                 <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>{t('settings.sections.notifications.title')}</CardTitle>
                        <CardDescription>{t('settings.sections.notifications.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <SettingsItem 
                            icon={Bell} 
                            title={t('settings.sections.notifications.item.title')}
                            description={t('settings.sections.notifications.item.description')}
                            onClick={() => router.push('/settings/notifications')}
                        />
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>{t('settings.sections.contentAndDisplay.title')}</CardTitle>
                        <CardDescription>{t('settings.sections.contentAndDisplay.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <SettingsItem 
                            icon={Library}
                            title={t('settings.sections.contentAndDisplay.collections.title')}
                            description={t('settings.sections.contentAndDisplay.collections.description')}
                            onClick={() => router.push('/settings/collections')}
                          />
                          <SettingsItem 
                            icon={Languages} 
                            title={t('settings.sections.contentAndDisplay.language.title')}
                            description={t('settings.sections.contentAndDisplay.language.description')}
                            onClick={() => router.push('/settings/language')}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
