import { Bird } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background animate-fade-in">
      <header className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Bird className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-lg">Chirp</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Sign Up</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1 flex flex-col justify-center">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none font-headline">
                  Join the Conversation on Chirp
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Discover what's happening in the world and connect with people from all over the globe.
                </p>
              </div>
              <div className="space-x-4 pt-6">
                <Button asChild size="lg">
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex items-center justify-center p-4 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Chirp Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
