

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Bell, MapPin, Calendar } from 'lucide-react';

export default function ProfileLoading() {
  return (
    <div className="animate-fade-in">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex items-center gap-4 px-4 py-2 border-b">
             <Button size="icon" variant="ghost" className="rounded-full" disabled>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className='space-y-2'>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-20" />
            </div>
        </header>
        <main className="flex-1">
        <Skeleton className="h-48 w-full" />
        <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="-mt-20">
                    <Skeleton className="h-32 w-32 rounded-full border-4 border-background" />
                </div>
                <div className='flex items-center gap-2 mt-4'>
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-24 rounded-full" />
                </div>
            </div>
            <div className="mt-4 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-full mt-2" />
                <Skeleton className="h-5 w-2/3" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><Skeleton className="h-4 w-24" /></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><Skeleton className="h-4 w-32" /></div>
            </div>
             <div className="flex gap-4 mt-4 text-sm">
                 <Skeleton className="h-5 w-24" />
                 <Skeleton className="h-5 w-24" />
            </div>
        </div>

        <div className="w-full mt-4 border-b">
            <div className='flex justify-around px-4'>
                <Skeleton className='h-10 w-1/4' />
                <Skeleton className='h-10 w-1/4' />
                <Skeleton className='h-10 w-1/4' />
                <Skeleton className='h-10 w-1/4' />
            </div>
        </div>
         <div className='p-8 text-center'>
            <p>Carregando posts...</p>
         </div>
      </main>
    </div>
  );
}
