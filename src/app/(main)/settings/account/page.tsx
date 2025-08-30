

'use client';

import { useRouter } from 'next/navigation';
import { User, Lock, ChevronRight, UserX, Trash2, CreditCard } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

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
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);

    const redirectToCustomerPortal = async () => {
        if (!user) return;
        setIsPortalLoading(true);
        try {
            const response = await fetch('/api/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid }),
            });
            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || 'Failed to create portal session');
            }
            const { url } = await response.json();
            router.push(url);
        } catch (error: any) {
            toast({
                title: "Erro ao abrir portal",
                description: error.message,
                variant: "destructive"
            });
            setIsPortalLoading(false);
        }
    };


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
            <div className="relative">
                <SettingsItem 
                    icon={CreditCard}
                    title="Gerenciar Assinatura"
                    description="Altere seu plano, cartão de crédito e veja seu histórico de pagamentos."
                    onClick={redirectToCustomerPortal}
                    disabled={isPortalLoading}
                />
                 {isPortalLoading && <Loader2 className="absolute top-1/2 right-4 -translate-y-1/2 h-5 w-5 animate-spin" />}
            </div>
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
