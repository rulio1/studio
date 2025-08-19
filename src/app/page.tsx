
import { Bird } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background animate-fade-in">
      <header className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Bird className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-lg">Zispr</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Inscreva-se</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1 flex flex-col justify-center">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="flex flex-col items-center font-bold tracking-tighter font-headline">
                  <span className="text-3xl sm:text-4xl md:text-5xl whitespace-nowrap">
                    Participe da Conversa no
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
      <footer className="w-full border-t p-4 pb-8 text-center md:pb-4">
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
            </a>.
        </p>
      </footer>
    </div>
  );
}
