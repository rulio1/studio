
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';

const newsItems = [
    {
        title: "Brazil's Independence Day: Lula's Unity Parade Faces Bolsonaro Protests",
        time: "5 hours ago",
        category: "News",
        posts: "7,031 posts",
        avatars: [
            'https://i.ibb.co/2SKdC0F/avatar-1.png',
            'https://i.ibb.co/3s0p4tC/avatar-2.png',
            'https://i.ibb.co/kX3bVfK/avatar-3.png',
        ]
    },
    {
        title: "Hornet's Fierce Debut: Hollow Knight: Silksong Conquers Fans After Six-Year Wait",
        time: "1 day ago",
        category: "Entertainment",
        posts: "45.2K posts",
        avatars: [
            'https://i.ibb.co/2SKdC0F/avatar-1.png',
            'https://i.ibb.co/3s0p4tC/avatar-2.png',
            'https://i.ibb.co/kX3bVfK/avatar-3.png',
        ]
    },
    {
        title: "Greg Cipes Alleges Warner Bros. Firing Over Parkinson's Diagnosis",
        time: "4 hours ago",
        category: "Entertainment",
        posts: "16K posts",
        avatars: [
            'https://i.ibb.co/2SKdC0F/avatar-1.png',
            'https://i.ibb.co/3s0p4tC/avatar-2.png',
            'https://i.ibb.co/kX3bVfK/avatar-3.png',
        ]
    }
]

const NewsItem = ({ title, time, category, posts, avatars }: typeof newsItems[0]) => (
    <div className="hover:bg-muted/50 p-3 rounded-lg cursor-pointer">
        <h3 className="font-bold leading-tight">{title}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <div className="flex -space-x-2 overflow-hidden">
                {avatars.map((src, i) => (
                    <Avatar key={i} className="h-4 w-4 border-2 border-background">
                        <AvatarImage src={src} />
                        <AvatarFallback>Z</AvatarFallback>
                    </Avatar>
                ))}
            </div>
            <span>{time} &middot; {category} &middot; {posts}</span>
        </div>
    </div>
)

export default function NewsCard() {
    const [isVisible, setIsVisible] = useState(true);
    const { t } = useTranslation();

    if (!isVisible) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('newsCard.title')}</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsVisible(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                {newsItems.map((item) => (
                    <NewsItem key={item.title} {...item} />
                ))}
            </CardContent>
        </Card>
    );
}
