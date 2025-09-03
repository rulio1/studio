
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Endereço de e-mail inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  birthDate: z.date({
    required_error: "A data de nascimento é obrigatória.",
    invalid_type_error: "Formato de data inválido.",
  })
}).refine(data => {
    const today = new Date();
    const sixteenYearsAgo = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    return data.birthDate <= sixteenYearsAgo;
}, {
    message: "Você deve ter pelo menos 16 anos para se cadastrar.",
    path: ['birthDate'],
});

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        await updateProfile(user, {
            displayName: values.name,
        });

        const handle = values.email.split('@')[0].replace(/[^a-z0-9_]/g, '');

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
            birthDate: values.birthDate,
            followers: [],
            following: [],
            communities: [],
            savedPosts: [],
            isVerified: false,
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Nascimento</FormLabel>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsCalendarOpen(false);
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
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
