
'use client';

import { Bird } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const phrases = [
  'Participe da Conversa',
  'Conecte-se com o Mundo',
  'Descubra o que Acontece',
  'Compartilhe suas Ideias',
];

export default function DesktopLanding() {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);
    const [currentPhrase, setCurrentPhrase] = useState('');

    useEffect(() => {
        if (subIndex === phrases[index].length + 1 && !reverse) {
            setTimeout(() => setReverse(true), 1000); // Pause before deleting
            return;
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prevIndex) => (prevIndex + 1) % phrases.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prevSubIndex) => prevSubIndex + (reverse ? -1 : 1));
        }, reverse ? 75 : 150); // Faster deleting

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse]);

    useEffect(() => {
        setCurrentPhrase(phrases[index].substring(0, subIndex));
    }, [subIndex, index]);


  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground animate-fade-in">
      <main className="flex flex-1">
        <div className="flex flex-1 items-center justify-center">
          <Bird className="h-64 w-64 text-primary" />
        </div>
        <div className="flex flex-1 flex-col justify-center px-16">
          <div className="w-full max-w-sm">
              <Bird className="h-12 w-12 text-primary mb-8" />
              <h1 className="text-5xl font-extrabold tracking-tighter font-headline min-h-[80px] whitespace-nowrap">
                {currentPhrase}
                <span className="opacity-50 animate-pulse">|</span>
              </h1>
              <h2 className="text-3xl font-bold mb-8">
                Inscreva-se no <span className="animated-zispr">Zispr</span> hoje mesmo.
              </h2>
    
              <div className="space-y-4">
                 <Button asChild className="w-full rounded-full" size="lg">
                  <Link href="/register">Inscreva-se</Link>
                </Button>
    
                <div className="relative">
                   <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                   </div>
                </div>
    
                <p className="text-sm text-muted-foreground">
                    Já tem uma conta?
                </p>
    
                <Button variant="outline" asChild className="w-full rounded-full" size="lg">
                  <Link href="/login">Entrar</Link>
                </Button>
              </div>
          </div>
        </div>
      </main>
       <footer className="w-full py-4 px-8">
         <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:underline">Sobre</Link>
            <Link href="/privacy" className="hover:underline">Baixe o aplicativo Zispr</Link>
            <Link href="/privacy" className="hover:underline">Central de Ajuda</Link>
            <Link href="/privacy" className="hover:underline">Termos de Serviço</Link>
            <Link href="/privacy" className="hover:underline">Política de Privacidade</Link>
            <Link href="/privacy" className="hover:underline">Política de Cookies</Link>
            <Link href="/privacy" className="hover:underline">Acessibilidade</Link>
            <Link href="/privacy" className="hover:underline">Informações de Anúncios</Link>
            <Link href="/privacy" className="hover:underline">Blog</Link>
            <Link href="/privacy" className="hover:underline">Status</Link>
            <Link href="/privacy" className="hover:underline">Carreiras</Link>
            <Link href="/privacy" className="hover:underline">Recursos da Marca</Link>
            <Link href="/privacy" className="hover:underline">Publicidade</Link>
            <Link href="/privacy" className="hover:underline">Marketing</Link>
            <Link href="/privacy" className="hover:underline">Zispr para Empresas</Link>
            <Link href="/privacy" className="hover:underline">Desenvolvedores</Link>
            <Link href="/privacy" className="hover:underline">Diretório</Link>
            <Link href="/privacy" className="hover:underline">Configurações</Link>
            <span className="ml-4">&copy; 2025 Zispr, Inc.</span>
        </nav>
      </footer>
    </div>
  );
}
