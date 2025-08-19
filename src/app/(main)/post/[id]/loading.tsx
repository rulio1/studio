

import PostSkeleton from '@/components/post-skeleton';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MessageCircle, Heart, Repeat, BarChart2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function PostLoading() {
    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" disabled>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Post</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 mb-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                    <Skeleton className="h-4 w-48 mt-4" />
                    <Separator className="my-4" />
                    <div className="flex justify-around text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Repeat className="h-5 w-5" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Heart className="h-5 w-5" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2">
                           <BarChart2 className="h-5 w-5" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                    </div>
                </div>
                <div className="p-4 m-4 border rounded-2xl bg-background/80 backdrop-blur-lg">
                     <div className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="w-full space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <div className="flex justify-end">
                                <Skeleton className="h-10 w-24" />
                            </div>
                        </div>
                    </div>
                </div>
                <ul className="divide-y divide-border">
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                </ul>
            </main>
        </div>
    );
}
