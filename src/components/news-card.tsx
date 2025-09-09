
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { X, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    image: string | null;
    publishedAt: string;
    source: {
        name: string;
    };
}

const NewsItem = ({ title, url, source, image, publishedAt }: NewsArticle) => {
    const timeAgo = (dateString: string) => {
        try {
            const date = new Date(dateString.replace(' ', 'T') + 'Z'); // Adjust for IBGE format
            const now = new Date();
            const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (seconds < 0) return 'agora'; // Handle future dates if any mismatch

            let interval = seconds / 31536000;
            if (interval > 1) return `${Math.floor(interval)}a`;
            interval = seconds / 2592000;
            if (interval > 1) return `${Math.floor(interval)}m`;
            interval = seconds / 604800;
            if (interval > 1) return `${Math.floor(interval)}sem`;
            interval = seconds / 86400;
            if (interval > 1) return `${Math.floor(interval)}d`;
            interval = seconds / 3600;
            if (interval > 1) return `${Math.floor(interval)}h`;
            interval = seconds / 60;
            if (interval > 1) return `${Math.floor(interval)}min`;
            return `${Math.floor(seconds)}s`;
        } catch (e) {
            return '';
        }
    };

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block hover:bg-muted/50 p-3 rounded-lg cursor-pointer">
            <div className="flex justify-between gap-4">
                <div>
                    <p className="text-xs text-muted-foreground">{source.name} · {timeAgo(publishedAt)}</p>
                    <h3 className="font-bold leading-tight text-sm">{title}</h3>
                </div>
                {image && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                         <Image src={image} alt={title} layout="fill" objectFit="cover" />
                    </div>
                )}
            </div>
        </a>
    )
};


const NewsItemSkeleton = () => (
    <div className="p-3">
        <div className="flex justify-between gap-4">
            <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
        </div>
    </div>
)

export default function NewsCard() {
    const [isVisible, setIsVisible] = useState(true);
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/news');
                if (!response.ok) {
                    throw new Error('Failed to fetch news');
                }
                const data = await response.json();
                setNews(data.articles);
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, []);

    if (!isVisible) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('newsCard.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                {isLoading ? (
                    <>
                        <NewsItemSkeleton />
                        <NewsItemSkeleton />
                        <NewsItemSkeleton />
                    </>
                ) : (
                    news.slice(0, 5).map((item, index) => (
                        <NewsItem key={index} {...item} />
                    ))
                )}
            </CardContent>
        </Card>
    );
}
