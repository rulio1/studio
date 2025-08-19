

import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Settings, Search } from 'lucide-react';

const UserSkeleton = () => (
    <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className='space-y-2'>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-48" />
            </div>
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
    </div>
);

export default function SearchLoading() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
            <Skeleton className='h-10 w-10 rounded-full' />
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Skeleton className="w-full h-10 rounded-full bg-muted pl-10" />
            </div>
            <Skeleton className='h-6 w-6' />
        </div>
      </header>
      <div className='w-full'>
          <div className="w-full justify-around rounded-none bg-transparent border-b flex p-1">
              <Skeleton className="h-10 flex-1 mx-2"/>
              <Skeleton className="h-10 flex-1 mx-2"/>
              <Skeleton className="h-10 flex-1 mx-2"/>
          </div>
          <div className="divide-y divide-border">
              <UserSkeleton />
              <UserSkeleton />
              <UserSkeleton />
              <UserSkeleton />
          </div>
      </div>
    </>
  );
}
