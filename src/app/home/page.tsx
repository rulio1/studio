
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bell, Home, Mail, MessageCircle, PlayCircle, Search, Settings, User, Repeat, Heart, BarChart2, Upload, Bird } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b">
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://placehold.co/40x40.png" alt="admin" />
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex justify-center">
            <Bird className="h-6 w-6" />
        </div>
        <Settings className="h-6 w-6" />
      </header>

      <main className="flex-1 overflow-y-auto">
        <Tabs defaultValue="for-you" className="w-full">
          <div className="border-b">
            <TabsList className="w-full justify-around rounded-none bg-transparent">
              <TabsTrigger value="for-you" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">For you</TabsTrigger>
              <TabsTrigger value="following" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Following</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="for-you">
            <div className="flow-root">
                <ul className="divide-y divide-border">
                    <li className="p-4">
                        <div className="flex gap-4">
                            <Avatar>
                            <AvatarImage src="https://placehold.co/48x48.png" alt="@jane" />
                            <AvatarFallback>JD</AvatarFallback>
                            </Avatar>
                            <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold">Jane Doe</p>
                                <p className="text-sm text-muted-foreground">@jane · 2h</p>
                            </div>
                            <p className="mb-2">Just discovered this amazing new coffee shop! ☕️ The atmosphere is so cozy and the latte art is on point. Highly recommend!</p>
                            <Image src="https://placehold.co/500x300.png" data-ai-hint="coffee shop" width={500} height={300} alt="Coffee shop" className="rounded-2xl border" />
                            <div className="mt-4 flex justify-between text-muted-foreground pr-4">
                                <div className="flex items-center gap-1">
                                <MessageCircle className="h-5 w-5" />
                                <span>23</span>
                                </div>
                                <div className="flex items-center gap-1">
                                <Repeat className="h-5 w-5" />
                                <span>11</span>
                                </div>
                                <div className="flex items-center gap-1">
                                <Heart className="h-5 w-5" />
                                <span>61</span>
                                </div>
                                 <div className="flex items-center gap-1">
                                <BarChart2 className="h-5 w-5" />
                                <span>1.2k</span>
                                </div>
                                <div className="flex items-center gap-1">
                                <Upload className="h-5 w-5" />
                                </div>
                            </div>
                            </div>
                        </div>
                    </li>
                     <li className="p-4">
                        <div className="flex gap-4">
                            <Avatar>
                            <AvatarImage src="https://placehold.co/48x48.png" alt="@john" />
                            <AvatarFallback>JD</AvatarFallback>
                            </Avatar>
                            <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold">John Smith</p>
                                <p className="text-sm text-muted-foreground">@john · 4h</p>
                            </div>
                            <p className="mb-2">Just built a new app with Next.js and Firebase! What a great stack!</p>
                            <div className="mt-4 flex justify-between text-muted-foreground pr-4">
                                <div className="flex items-center gap-1">
                                <MessageCircle className="h-5 w-5" />
                                <span>10</span>
                                </div>
                                <div className="flex items-center gap-1">
                                <Repeat className="h-5 w-5" />
                                <span>5</span>
                                </div>
                                <div className="flex items-center gap-1">
                                <Heart className="h-5 w-5" />
                                <span>32</span>
                                </div>
                                 <div className="flex items-center gap-1">
                                <BarChart2 className="h-5 w-5" />
                                <span>800</span>
                                </div>
                                <div className="flex items-center gap-1">
                                <Upload className="h-5 w-5" />
                                </div>
                            </div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
          </TabsContent>
          <TabsContent value="following">
            <div className="p-4 text-center text-muted-foreground">
                <p>Posts from people you follow will appear here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t">
        <nav className="flex justify-around items-center h-14">
            <Link href="#" className="flex-1 flex justify-center items-center text-foreground">
              <Home className="h-7 w-7" />
            </Link>
            <Link href="#" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Search className="h-7 w-7" />
            </Link>
            <Link href="#" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Bell className="h-7 w-7" />
            </Link>
            <Link href="#" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Mail className="h-7 w-7" />
            </Link>
        </nav>
      </footer>
    </div>
  );
}
