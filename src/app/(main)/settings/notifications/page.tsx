
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth, db, requestNotificationPermission } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Loader2, Heart, MessageCircle, Repeat, AtSign, UserPlus, Bell, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface NotificationPreferences {
    mention?: boolean;
    reply?: boolean;
    follow?: boolean;
    like?: boolean;
    retweet?: boolean;
}

interface ZisprUser {
    notificationPreferences?: NotificationPreferences;
    fcmToken?: string;
}

const preferenceItems = [
    { id: 'mention', label: 'Menções', description: 'Notificações quando alguém menciona você em um post.', icon: AtSign },
    { id: 'reply', label: 'Respostas', description: 'Notificações quando alguém responde a um de seus posts.', icon: MessageCircle },
    { id: 'follow', label: 'Novos Seguidores', description: 'Notificações quando alguém começa a seguir você.', icon: UserPlus },
    { id: 'like', label: 'Curtidas', description: 'Notificações quando alguém curte um de seus posts.', icon: Heart },
    { id: 'retweet', label: 'Reposts', description: 'Notificações quando alguém reposta um de seus posts.', icon: Repeat },
];

export default function NotificationSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
    const [isActivating, setIsActivating] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleEnableNotifications = async () => {
        if (!user) return;
        setIsActivating(true);
        const result = await requestNotificationPermission(user.uid);
        if (result.success) {
            toast({
                title: "Notificações Ativadas!",
                description: "Você agora receberá notificações push.",
            });
            setPermissionStatus('granted');
        } else {
            toast({
                title: "Falha ao Ativar Notificações",
                description: result.message,
                variant: "destructive"
            });
             if (typeof window !== "undefined" && "Notification" in window && Notification.permission === 'denied') {
                setPermissionStatus('denied');
            }
        }
        setIsActivating(false);
    };

    const handleTogglePreference = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!user || isSaving === key) return;
        setIsSaving(key);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const preferenceKey = `notificationPreferences.${key}`;
            await updateDoc(userDocRef, {
                [preferenceKey]: value
            });
        } catch (error) {
            console.error("Erro ao atualizar a preferência:", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar sua configuração.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(null);
        }
    };
    
    const renderSkeleton = () => (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg">
                        <div className="flex items-start gap-4">
                            <Skeleton className="h-6 w-6 rounded-md" />
                            <div className="space-y-1">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return <main className="flex-1 overflow-y-auto p-4">{renderSkeleton()}</main>;
    }
    
    const preferences = zisprUser?.notificationPreferences || {};
    const hasPushToken = !!zisprUser?.fcmToken;
    const areNotificationsEnabled = permissionStatus === 'granted' && hasPushToken;

    return (
        <main className="flex-1 overflow-y-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Notificações Push</CardTitle>
                    <CardDescription>Receba alertas sobre atividades importantes, mesmo quando o Zispr não estiver aberto.</CardDescription>
                </CardHeader>
                <CardContent>
                    {permissionStatus === 'denied' ? (
                         <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>Permissão Bloqueada</AlertTitle>
                            <AlertDescription>Você bloqueou as notificações. Para reativá-las, você precisará alterar as permissões nas configurações do seu navegador ou dispositivo.</AlertDescription>
                        </Alert>
                    ) : areNotificationsEnabled ? (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Notificações Ativadas</AlertTitle>
                            <AlertDescription>Você está pronto para receber notificações push neste dispositivo.</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-4 sm:mb-0">As notificações push estão desativadas.</p>
                            <Button onClick={handleEnableNotifications} disabled={isActivating}>
                                {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ativar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Preferências</CardTitle>
                    <CardDescription>Escolha quais notificações push você deseja receber. Isso não afeta as notificações dentro do app.</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                    {preferenceItems.map(({ id, label, description, icon: Icon }) => {
                        const isChecked = preferences[id as keyof NotificationPreferences] !== false; // Default to true if undefined
                        return (
                            <div key={id} className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg">
                                <div className="flex items-start gap-4">
                                     <Icon className="h-6 w-6 text-muted-foreground mt-1" />
                                    <div>
                                        <Label htmlFor={`switch-${id}`} className="font-semibold text-base">
                                            {label}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            {description}
                                        </p>
                                    </div>
                                </div>
                                {isSaving === id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Switch
                                        id={`switch-${id}`}
                                        checked={isChecked}
                                        onCheckedChange={(value) => handleTogglePreference(id as keyof NotificationPreferences, value)}
                                        disabled={!areNotificationsEnabled}
                                    />
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </main>
    );
}
