

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Loader2, Heart, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface ZisprUser {
    likesArePrivate?: boolean;
}

export default function PrivacySettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

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

    const handleToggleLikesPrivacy = async (isPrivate: boolean) => {
        if (!user || isSaving) return;
        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                likesArePrivate: isPrivate
            });
            toast({
                title: "Configuração salva",
                description: `Sua aba de curtidas agora está ${isPrivate ? 'privada' : 'pública'}.`
            });
        } catch (error) {
            console.error("Erro ao atualizar a privacidade das curtidas:", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar sua configuração.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                            <Skeleton className="h-6 w-11 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            </main>
        );
    }
    

    return (
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Visibilidade do Conteúdo</CardTitle>
                    <CardDescription>Escolha quem pode ver suas diferentes partes do seu perfil.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-4">
                             <Heart className="h-6 w-6 text-muted-foreground mt-1" />
                            <div>
                                <Label htmlFor="likes-privacy" className="font-semibold text-base">
                                    Ocultar a aba Curtidas
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Quando ativado, apenas você poderá ver os posts que curtiu.
                                </p>
                            </div>
                        </div>
                         {isSaving ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                         ) : (
                            <Switch
                                id="likes-privacy"
                                checked={zisprUser?.likesArePrivate || false}
                                onCheckedChange={handleToggleLikesPrivacy}
                            />
                         )}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
