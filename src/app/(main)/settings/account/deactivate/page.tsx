

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const formSchema = z.object({
  password: z.string().min(1, { message: "A senha é obrigatória para desativar a conta." }),
});

export default function DeactivateAccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: '',
        },
    });

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        const user = auth.currentUser;

        if (!user || !user.email) {
            toast({
                title: "Erro",
                description: "Usuário não encontrado. Por favor, faça login novamente.",
                variant: "destructive",
            });
            setIsLoading(false);
            router.push('/login');
            return;
        }

        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, values.password);
            await reauthenticateWithCredential(user, credential);

            // Set deactivated flag in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                deactivated: true,
                deactivatedAt: new Date(),
            });
            
            // Sign out the user
            await signOut(auth);

            toast({
                title: "Conta Desativada",
                description: "Sua conta foi desativada. Você pode reativá-la fazendo login novamente.",
            });

            router.push('/login');

        } catch (error: any) {
            let description = "Ocorreu um erro ao desativar a conta.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = "A senha está incorreta. Por favor, tente novamente.";
            }
             toast({
                title: "Falha na Desativação",
                description,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <main className="flex-1 overflow-y-auto p-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserX /> Desativar sua conta</CardTitle>
                    <CardDescription>Esta ação desativará sua conta. Para confirmar, por favor, insira sua senha.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="default" className="bg-muted/50">
                        <AlertTitle>O que você deve saber</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Seu perfil, posts, curtidas e comentários serão ocultados.</li>
                                <li>Para reativar sua conta e restaurar seu conteúdo, basta fazer login novamente.</li>
                                <li>Sua @handle e informações de conta serão salvas.</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha</FormLabel>
                                    <FormControl>
                                    <Input type="password" placeholder="Digite sua senha" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <Button type="submit" disabled={isLoading} className="w-full sm:w-auto" variant="secondary">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Desativar conta
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    );
}
