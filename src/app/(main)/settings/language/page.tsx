
'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

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
    const [selectedLang, setSelectedLang] = useState('pt');
    const { toast } = useToast();

    const handleSelectLanguage = (langCode: string) => {
        setSelectedLang(langCode);
        // Em uma implementação futura, isso salvaria a preferência do usuário
        // e aplicaria a tradução em toda a interface.
        toast({
            title: "Idioma selecionado",
            description: "A funcionalidade completa de tradução será implementada em breve.",
        });
    };

    return (
        <main className="flex-1 overflow-y-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Selecione um Idioma</CardTitle>
                    <CardDescription>O idioma selecionado será usado na interface do Zispr.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-border">
                        {languages.map(lang => (
                            <SettingsItem 
                                key={lang.code}
                                title={lang.name}
                                selected={selectedLang === lang.code}
                                onClick={() => handleSelectLanguage(lang.code)}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
