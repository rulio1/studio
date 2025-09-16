
'use client';

import { useRouter } from 'next/navigation';
import { User, Lock, ChevronRight, UserX, Trash2 } from 'lucide-react';
import { useUserStore } from '@/store/user-store';

const SettingsItem = ({ icon, title, description, onClick, isDestructive = false, disabled = false }: { icon: React.ElementType, title: string, description: string, onClick?: () => void, isDestructive?: boolean, disabled?: boolean }) => {
    const Icon = icon;
    return (
        <div className={`flex items-center p-4 rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'} ${isDestructive ? 'text-destructive hover:bg-destructive/10' : ''}`} onClick={disabled ? undefined : onClick}>
            <Icon className={`h-6 w-6 mr-4 ${isDestructive ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div className="flex-1">
                <p className="font-semibold">{title}</p>
                <p className={`text-sm ${isDestructive ? 'text-destructive/80' : 'text-muted-foreground'}`}>{description}</p>
            </div>
            {!disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        </div>
    )
}

export default function AccountSettingsPage() {
    const router = useRouter();
    const { zisprUser } = useUserStore();

    return (
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
             <SettingsItem 
                icon={User} 
                title="Informações da conta" 
                description="Veja as informações da sua conta e edite seu perfil."
                onClick={() => zisprUser && router.push(`/${zisprUser.handle.substring(1)}/edit`)}
            />
             <SettingsItem 
                icon={Lock} 
                title="Altere sua senha" 
                description="Altere sua senha a qualquer momento."
                onClick={() => router.push('/settings/account/change-password')}
            />
             <SettingsItem 
                icon={UserX} 
                title="Desativar sua conta" 
                description="Descubra como você pode desativar sua conta."
                onClick={() => router.push('/settings/account/deactivate')}
            />
            <SettingsItem 
                icon={Trash2} 
                title="Excluir sua conta" 
                description="Descubra como você pode excluir sua conta permanentemente."
                onClick={() => router.push('/settings/account/delete')}
                isDestructive
            />
        </main>
    );
}
