
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const formSchema = z.object({
  password: z.string().min(1, { message: "A senha é obrigatória para excluir a conta." }),
});

export default function DeleteAccountPage() {
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

            // Delete user document from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await deleteDoc(userDocRef);

            // Delete user from Auth
            await deleteUser(user);

            toast({
                title: "Conta Excluída",
                description: "Sua conta e todos os seus dados foram excluídos permanentemente.",
            });

            router.push('/');

        } catch (error: any) {
            let description = "Ocorreu um erro ao excluir a conta.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = "A senha está incorreta. Por favor, tente novamente.";
            } else if (error.code === 'auth/requires-recent-login') {
                description = "Esta operação é sensível e requer autenticação recente. Por favor, faça login novamente e tente de novo.";
            }
             toast({
                title: "Falha na Exclusão",
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
                    <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 /> Excluir sua conta</CardTitle>
                    <CardDescription>Esta ação é permanente e não pode ser desfeita. Para confirmar, por favor, insira sua senha.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="destructive">
                        <AlertTitle>Atenção: Ação Irreversível</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Sua conta e todas as informações de perfil serão excluídas permanentemente.</li>
                                <li>Todos os seus posts, comentários, curtidas e seguidores serão perdidos.</li>
                                <li>Você não poderá reativar sua conta ou recuperar qualquer conteúdo ou informação.</li>
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
                             <Button type="submit" disabled={isLoading} className="w-full sm:w-auto" variant="destructive">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Excluir conta permanentemente
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    );
}
