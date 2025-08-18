import { Bird } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <Bird className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-headline">Zispr</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
