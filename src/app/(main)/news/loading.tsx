
'use client';

import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const NewsPageSkeleton = () => (
     <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
             <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-24" />
                </CardFooter>
            </Card>
        ))}
    </div>
)

export default function NewsLoading() {
    return (
        <div className="flex flex-col bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" disabled>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Notícias</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <NewsPageSkeleton />
            </main>
        </div>
    );
}
