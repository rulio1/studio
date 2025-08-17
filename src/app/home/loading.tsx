
import PostSkeleton from '@/components/post-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Bird } from 'lucide-react';

export default function HomeLoading() {
    return (
        <div className="flex flex-col h-screen bg-background relative animate-fade-in">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Bird className="h-6 w-6" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
             </header>
             <main className="flex-1 overflow-y-auto">
                 <ul className="divide-y divide-border">
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                </ul>
             </main>
        </div>
      );
}
