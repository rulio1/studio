
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    image: string;
    publishedAt: string;
    source: {
        name: string;
        url: string;
    };
}

const NewsArticleCard = ({ article }: { article: NewsArticle }) => (
    <Card className="overflow-hidden">
        {article.image && (
            <div className="relative h-48 w-full">
                <Image
                    src={article.image}
                    alt={article.title}
                    layout="fill"
                    objectFit="cover"
                    className="bg-muted"
                />
            </div>
        )}
        <CardHeader>
            <CardTitle>{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground line-clamp-3">{article.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{article.source.name} · {format(new Date(article.publishedAt), "d MMM, yyyy", { locale: ptBR })}</span>
             <Button variant="ghost" size="sm" asChild>
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Ler mais <ExternalLink className="ml-2 h-4 w-4" />
                </a>
            </Button>
        </CardFooter>
    </Card>
);

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

export default function NewsPage() {
    const router = useRouter();
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/news');
                if (!response.ok) {
                    throw new Error('Failed to fetch news');
                }
                const data = await response.json();
                setArticles(data.articles);
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, []);

    return (
        <div className="flex flex-col bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Notícias</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <NewsPageSkeleton />
                ) : (
                    <div className="p-4 space-y-4">
                        {articles.map((article, index) => (
                            <NewsArticleCard key={index} article={article} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
