
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Ad } from '@/lib/ads';
import { ArrowRight, Megaphone } from 'lucide-react';

interface PromotedPostProps {
  ad: Ad;
}

export default function PromotedPost({ ad }: PromotedPostProps) {
  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    // In a real app, you would track this click event.
    console.log(`Ad clicked: ${ad.id}`);
  };

  return (
    <li className="p-4" onClick={() => window.open(ad.ctaUrl, '_blank')}>
       <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 pl-12">
            <Megaphone className="h-4 w-4 text-yellow-500" />
            <span>Promovido por {ad.company}</span>
        </div>
      <Card className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer">
        <CardContent className="p-0">
          <div className="aspect-video relative w-full">
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              layout="fill"
              objectFit="cover"
              data-ai-hint={ad.imageHint}
            />
          </div>
          <div className="p-4">
            <h3 className="font-bold text-lg">{ad.title}</h3>
            <p className="text-muted-foreground text-sm mt-1">{ad.description}</p>
            <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={handleCtaClick}>
              <Button variant="outline" className="w-full mt-4 rounded-full">
                {ad.ctaText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
