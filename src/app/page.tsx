
'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopLanding from '@/components/landing/desktop-landing';
import MobileLanding from '@/components/landing/mobile-landing';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Bird } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Se o usuário estiver logado, redirecione para a home
        router.replace('/home');
      } else {
        // Se não houver usuário, pare de carregar e mostre a landing page
        setIsLoadingAuth(false);
      }
    });

    // Desinscrever-se no cleanup
    return () => unsubscribe();
  }, [router]);

  if (isLoadingAuth || !isClient) {
    return (
        <div className="flex flex-col items-center justify-center min-h-svh p-4 bg-background">
            <Bird className="h-16 w-16 animate-pulse text-primary" />
        </div>
    );
  }

  return isMobile ? <MobileLanding /> : <DesktopLanding />;
}
