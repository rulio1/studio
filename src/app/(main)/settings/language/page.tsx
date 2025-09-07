
'use client';

import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/user-store';
import { useTranslation } from '@/hooks/use-translation';

const languages = [
    { code: 'pt', name: 'Português' },
    { code: 'en', name: 'English' },
];

const SettingsItem = ({ title, selected, onClick }: { title: string, selected: boolean, onClick: () => void }) => (
    <div 
        className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg cursor-pointer"
        onClick={onClick}
    >
        <p className="font-semibold">{title}</p>
        {selected && <Check className="h-5 w-5 text-primary" />}
    </div>
);

export default function LanguageSettingsPage() {
    const { language, setLanguage } = useUserStore();
    const { t } = useTranslation();
    const { toast } = useToast();

    const handleSelectLanguage = (langCode: 'pt' | 'en') => {
        setLanguage(langCode);
        const toastTitle = t('languageSelectedToast.title');
        const toastDescription = t('languageSelectedToast.description');
        toast({
            title: toastTitle,
            description: toastDescription,
        });
    };

    return (
        <main className="flex-1 overflow-y-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>{t('language.title')}</CardTitle>
                    <CardDescription>{t('language.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-border">
                        {languages.map(lang => (
                            <SettingsItem 
                                key={lang.code}
                                title={lang.name}
                                selected={language === lang.code}
                                onClick={() => handleSelectLanguage(lang.code as 'pt' | 'en')}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
