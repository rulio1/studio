
'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopLanding from '@/components/landing/desktop-landing';
import MobileLanding from '@/components/landing/mobile-landing';
import { Skeleton } from '@/components/ui/skeleton';

export default function LandingPage() {
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
        <div className="flex flex-col items-center justify-center min-h-svh p-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-8 w-64 mt-4" />
            <Skeleton className="h-4 w-80 mt-2" />
        </div>
    );
  }

  return isMobile ? <MobileLanding /> : <DesktopLanding />;
}
