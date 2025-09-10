
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Bell, Lock, ChevronRight, Languages, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

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

    return (
        <div className="flex flex-col h-screen bg-background">
            <main className="flex-1 overflow-y-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sua Conta</CardTitle>
                        <CardDescription>Gerencie as informações da sua conta, como senha e informações de perfil.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <SettingsItem 
                            icon={User} 
                            title="Sua Conta" 
                            description="Veja as informações da sua conta e gerencie suas configurações."
                            onClick={() => router.push('/settings/account')}
                        />
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Privacidade e Segurança</CardTitle>
                        <CardDescription>Controle como o Zispr usa suas informações e quem pode ver seu conteúdo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <SettingsItem 
                            icon={Lock} 
                            title="Privacidade e segurança" 
                            description="Gerencie suas configurações de privacidade e segurança."
                            onClick={() => router.push('/settings/privacy')}
                        />
                    </CardContent>
                </Card>

                 <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Notificações</CardTitle>
                        <CardDescription>Selecione os tipos de notificações que você recebe sobre suas atividades, interesses e recomendações.</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <SettingsItem 
                            icon={Bell} 
                            title="Preferências" 
                            description="Gerencie suas preferências de notificação."
                            onClick={() => router.push('/settings/notifications')}
                        />
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Conteúdo e Exibição</CardTitle>
                        <CardDescription>Gerencie suas coleções, acessibilidade, exibição e idiomas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <SettingsItem 
                            icon={Library}
                            title="Coleções"
                            description="Gerencie suas coleções de posts salvos."
                            onClick={() => router.push('/settings/collections')}
                          />
                          <SettingsItem 
                            icon={Languages} 
                            title="Idioma" 
                            description="Escolha qual idioma usar no Zispr."
                            onClick={() => router.push('/settings/language')}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
