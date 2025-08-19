
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
    <div className="flex min-h-svh flex-col bg-background animate-fade-in">
      <header className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Bird className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-lg">Zispr</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="outline" className="bg-background/50 backdrop-blur-sm" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Inscreva-se</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1 flex flex-col justify-center">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                 <h1 className="flex flex-col items-center font-bold tracking-tighter font-headline min-h-[120px] sm:min-h-[150px] md:min-h-[180px]">
                  <span className="text-3xl sm:text-4xl md:text-5xl whitespace-nowrap">
                    {currentPhrase}
                    <span className="opacity-50 animate-pulse">|</span>
                  </span>
                  <span className="animated-zispr text-6xl sm:text-7xl md:text-8xl">
                    Zispr
                  </span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Descubra o que está acontecendo no mundo e conecte-se com pessoas de todos os lugares.
                </p>
              </div>
              <div className="space-x-4 pt-6">
                <Button asChild size="lg">
                  <Link href="/register">Comece Agora</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full p-4 text-center mt-auto flex flex-col items-center">
        <p className="text-xs text-muted-foreground">
          &copy; 2025 Zispr Inc. Todos os direitos reservados.
          <br />
          Desenvolvido por{' '}
          <a 
              href="https://www.instagram.com/ru.li.o/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline hover:text-primary"
          >
              Rulio
          </a>
        </p>
      </footer>
    </div>
  );
}
