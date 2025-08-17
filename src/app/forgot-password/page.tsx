
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: "Endereço de e-mail inválido." }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: 'E-mail Enviado',
        description: 'Verifique sua caixa de entrada para o link de redefinição de senha.',
      });
      router.push('/login');
    } catch (error: any) {
        let description = 'Ocorreu um erro inesperado.';
        if (error.code === 'auth/user-not-found') {
            description = 'Nenhuma conta encontrada com este e-mail.';
        }
      toast({
        title: 'Falha ao Enviar E-mail',
        description,
        variant: 'destructive',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md animate-slide-in-from-bottom bg-card/80 backdrop-blur-lg rounded-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-headline">Esqueceu a Senha?</CardTitle>
              <CardDescription>Insira seu e-mail para receber um link de redefinição.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="nome@exemplo.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar E-mail de Redefinição
              </Button>
            </CardContent>
            <CardFooter className="flex justify-center text-sm">
                <Link href="/login" className="underline">
                    Voltar para o Login
                </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </AuthLayout>
  );
}
