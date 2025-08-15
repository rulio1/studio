
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Search, Settings } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


const initialTrends = [
    { rank: 1, category: "Sports", topic: "Flamengo", posts: "140K" },
    { rank: 2, category: "Sports", topic: "Bruno Henrique", posts: "26.2K" },
    { rank: 3, category: "Sports", topic: "Allan", posts: "24.6K" },
    { rank: 4, category: "Sports", topic: "Cebolinha", posts: "3,689" },
    { rank: 5, category: "Trending in Brazil", topic: "taylor", posts: "1.21M" },
    { rank: 6, category: "Sports", topic: "Filipe Luís", posts: "8,030" },
];

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const trends = useMemo(() => {
    if (!searchTerm) return initialTrends;
    return initialTrends.filter(trend => 
      trend.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trend.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://placehold.co/40x40.png" alt="admin" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search" 
              className="w-full rounded-full bg-muted pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Settings className="h-6 w-6" />
        </div>
        <Tabs defaultValue="trending" className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b px-4 gap-4 overflow-x-auto">
              <TabsTrigger value="for-you" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">For You</TabsTrigger>
              <TabsTrigger value="trending" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">Trending</TabsTrigger>
              <TabsTrigger value="news" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">News</TabsTrigger>
              <TabsTrigger value="sports" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">Sports</TabsTrigger>
              <TabsTrigger value="entertainment" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">Entertainment</TabsTrigger>
            </TabsList>
        </Tabs>
      </header>

      <Tabs defaultValue="trending" className="w-full">
        <TabsContent value="trending" className="mt-0">
            <ul className="divide-y divide-border">
              {trends.map((trend) => (
                  <li key={trend.rank} className="p-4 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start justify-between">
                          <div>
                              <p className="text-sm text-muted-foreground">{trend.rank} · {trend.category}</p>
                              <p className="font-bold">{trend.topic}</p>
                              <p className="text-sm text-muted-foreground">{trend.posts} posts</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                          </Button>
                      </div>
                  </li>
              ))}
            </ul>
            {trends.length === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                  <p>No results for &quot;{searchTerm}&quot;</p>
                  <p className="text-sm mt-2">Try searching for something else.</p>
              </div>
            )}
        </TabsContent>
      </Tabs>
    </>
  );
}
