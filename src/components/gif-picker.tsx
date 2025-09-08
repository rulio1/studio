
'use client';

import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { useDebounce } from 'use-debounce';
import Image from 'next/image';
import { Loader2, Search } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface Gif {
    id: string;
    title: string;
    images: {
        fixed_width: {
            url: string;
            width: string;
            height: string;
        }
    }
}

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
}

export default function GifPicker({ onSelect }: GifPickerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [gifs, setGifs] = useState<Gif[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGifs = async () => {
            setIsLoading(true);
            const endpoint = debouncedSearchTerm 
                ? `/api/giphy?q=${debouncedSearchTerm}`
                : '/api/giphy';
            
            try {
                const response = await fetch(endpoint);
                const data = await response.json();
                setGifs(data.data);
            } catch (error) {
                console.error("Failed to fetch gifs", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGifs();
    }, [debouncedSearchTerm]);

    return (
        <div className="flex flex-col h-96 bg-background rounded-lg">
            <div className="p-2 border-b">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar GIFs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 rounded-full"
                    />
                </div>
            </div>
            <ScrollArea className="flex-1 p-2">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-1">
                        {gifs.map((gif) => (
                            <div 
                                key={gif.id} 
                                className="cursor-pointer"
                                onClick={() => onSelect(gif.images.fixed_width.url)}
                            >
                                <Image
                                    src={gif.images.fixed_width.url}
                                    alt={gif.title}
                                    width={parseInt(gif.images.fixed_width.width)}
                                    height={parseInt(gif.images.fixed_width.height)}
                                    unoptimized
                                    className="rounded"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
