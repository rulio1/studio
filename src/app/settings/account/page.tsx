
'use client';

import { useRouter } from 'next/navigation';
import { User, Lock, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/firebase';

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

export default function AccountSettingsPage() {
    const router = useRouter();
    const user = auth.currentUser;

    return (
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
             <SettingsItem 
                icon={User} 
                title="Informações da conta" 
                description="Veja as informações da sua conta e edite seu perfil."
                onClick={() => user && router.push(`/profile/edit`)}
            />
             <SettingsItem 
                icon={Lock} 
                title="Altere sua senha" 
                description="Altere sua senha a qualquer momento."
                onClick={() => router.push('/settings/account/change-password')}
            />
        </main>
    );
}
