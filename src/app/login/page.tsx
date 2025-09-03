
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
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email({ message: "Endereço de e-mail inválido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const handleRedirectResult = async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                setIsGoogleLoading(true);
                const user = result.user;
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    const handle = user.email?.split('@')[0].replace(/[^a-z0-9_]/g, '') || `user${Date.now()}`;
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        displayName: user.displayName,
                        searchableDisplayName: user.displayName?.toLowerCase(),
                        email: user.email,
                        createdAt: serverTimestamp(),
                        handle: `@${handle}`,
                        searchableHandle: handle.toLowerCase(),
                        avatar: user.photoURL || `https://placehold.co/128x128.png?text=${user.displayName?.[0] || 'Z'}`,
                        banner: 'https://placehold.co/600x200.png',
                        bio: '',
                        location: '',
                        website: '',
                        followers: [],
                        following: [],
                        savedPosts: [],
                        isVerified: false,
                    });
                }
                toast({ title: 'Login bem-sucedido', description: `Bem-vindo de volta, ${user.displayName}!` });
                router.push('/home');
            }
        } catch (error: any) {
            console.error("Redirect result error:", error);
            toast({ title: 'Falha no Login com Google', description: 'Ocorreu um erro ao processar o login.', variant: 'destructive' });
            setIsGoogleLoading(false);
        }
    };
    handleRedirectResult();
  }, [router, toast]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        await signInWithRedirect(auth, provider);
    } catch (error: any) {
        toast({
            title: 'Falha no Login com Google',
            description: 'Não foi possível iniciar o login com o Google. Tente novamente.',
            variant: 'destructive',
        });
        setIsGoogleLoading(false);
    }
  };


  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'Login bem-sucedido',
        description: "Bem-vindo de volta!",
      });
      router.push('/home');
    } catch (error: any) {
        let description = 'Ocorreu um erro inesperado.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = 'E-mail ou senha inválidos.';
        }
      toast({
        title: 'Falha no Login',
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
              <CardTitle className="text-2xl font-headline">Bem-vindo de Volta</CardTitle>
              <CardDescription>Faça login para continuar no Zispr.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
               <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                  {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FcGoogle className="mr-2 h-4 w-4" />}
                  Entrar com o Google
              </Button>
              <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
                  </div>
              </div>
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
                    <div className="flex items-center">
                      <FormLabel>Senha</FormLabel>
                      <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </CardContent>
            <CardFooter className="flex-col gap-4 text-center">
                <p className="text-xs text-muted-foreground">
                    Ao continuar, você concorda com a nossa <Link href="/privacy" className="underline hover:text-primary">Política de Privacidade</Link>.
                </p>
                <div className="flex justify-center text-sm">
                  <span className="text-muted-foreground">Não tem uma conta?</span>
                  <Link href="/register" className="ml-1 underline">
                  Inscreva-se
                  </Link>
                </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </AuthLayout>
  );
}
