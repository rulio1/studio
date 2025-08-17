
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Bell, Lock, ChevronRight } from 'lucide-react';
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
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Configurações e privacidade</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sua Conta</CardTitle>
                        <CardDescription>Gerencie as informações da sua conta, como senha e informações de perfil.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <SettingsItem 
                            icon={User} 
                            title="Informações da conta" 
                            description="Veja as informações da sua conta, como seu nome de usuário."
                            onClick={() => alert('Página de informações da conta em breve!')}
                        />
                         <SettingsItem 
                            icon={Lock} 
                            title="Altere sua senha" 
                            description="Altere sua senha a qualquer momento."
                            onClick={() => alert('Funcionalidade de alteração de senha em breve!')}
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
                            onClick={() => alert('Página de preferências de notificação em breve!')}
                        />
                    </CardContent>
                </Card>

                 <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Privacidade e Segurança</CardTitle>
                        <CardDescription>Gerencie quais informações você permite que outras pessoas no Chirp vejam.</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <SettingsItem 
                            icon={Lock} 
                            title="Público e marcação" 
                            description="Gerencie quais informações você permite que outras pessoas no Chirp vejam."
                            onClick={() => alert('Página de público e marcação em breve!')}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
