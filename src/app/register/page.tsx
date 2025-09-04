
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { parse } from 'date-fns';
import React from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Endereço de e-mail inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  birthDate: z.string().refine((val) => /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
    message: "Por favor, insira a data no formato DD/MM/AAAA.",
  }),
}).refine((data) => {
    try {
        const date = parse(data.birthDate, 'dd/MM/yyyy', new Date());
        const today = new Date();
        const sixteenYearsAgo = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
        return date <= sixteenYearsAgo;
    } catch (e) {
        return false;
    }
}, {
    message: "Você deve ter pelo menos 16 anos para se cadastrar.",
    path: ['birthDate'],
});

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      birthDate: '',
    },
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    let formattedDate = '';
    if (input.length > 0) {
      formattedDate = input.substring(0, 2);
    }
    if (input.length > 2) {
      formattedDate += '/' + input.substring(2, 4);
    }
    if (input.length > 4) {
      formattedDate += '/' + input.substring(4, 8);
    }
    form.setValue('birthDate', formattedDate, { shouldValidate: true });
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        await updateProfile(user, {
            displayName: values.name,
        });

        const handle = values.email.split('@')[0].replace(/[^a-z0-9_]/g, '');
        
        const birthDateAsDate = parse(values.birthDate, 'dd/MM/yyyy', new Date());

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName: values.name,
            searchableDisplayName: values.name.toLowerCase(),
            email: values.email,
            createdAt: serverTimestamp(),
            handle: `@${handle}`,
            searchableHandle: handle.toLowerCase(),
            avatar: `https://placehold.co/128x128.png?text=${values.name[0]}`,
            banner: 'https://placehold.co/600x200.png',
            bio: '',
            location: '',
            website: '',
            birthDate: birthDateAsDate,
            followers: [],
            following: [],
            savedPosts: [],
            isVerified: false,
        });

        // Enviar e-mail de boas-vindas
        await fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: values.email,
            name: values.name,
          }),
        });
        
        toast({
          title: "Conta Criada!",
          description: "Agora você pode fazer login com sua nova conta.",
        });
        router.push('/home');

    } catch (error: any) {
      let description = 'Ocorreu um erro inesperado.';
      if (error.code === 'auth/email-already-in-use') {
          description = 'Este e-mail já está em uso. Por favor, tente outro.';
      }
      toast({
        title: "Falha no Cadastro",
        description,
        variant: "destructive",
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
              <CardTitle className="text-2xl font-headline">Criar uma Conta</CardTitle>
              <CardDescription>Insira seus dados abaixo para começar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu Nome" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="DD/MM/AAAA" 
                        {...field} 
                        onChange={handleDateChange}
                        disabled={isLoading}
                        maxLength={10}
                        inputMode="numeric"
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Conta
              </Button>
            </CardContent>
            <CardFooter className="flex-col gap-4 text-center">
              <p className="text-xs text-muted-foreground">
                Ao se inscrever, você concorda com nossos <Link href="/privacy" className="underline hover:text-primary">Termos de Serviço</Link> e <Link href="/privacy" className="underline hover:text-primary">Política de Privacidade</Link>.
              </p>
              <div className="flex justify-center text-sm">
                <span className="text-muted-foreground">Já tem uma conta?</span>
                <Link href="/login" className="ml-1 underline">
                  Entrar
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </AuthLayout>
  );
}
