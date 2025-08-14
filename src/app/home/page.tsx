
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Bell, Bookmark, Clapperboard, Hash, Home, Mail, MessageCircle, Search, Settings, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r p-4 flex flex-col justify-between">
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-headline">Chirp</h2>
          </div>
          <nav className="flex flex-col gap-4">
            <Link href="#" className="flex items-center gap-3 text-lg font-semibold">
              <Home className="h-6 w-6" />
              <span>Home</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 text-lg">
              <Hash className="h-6 w-6" />
              <span>Explore</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 text-lg">
              <Bell className="h-6 w-6" />
              <span>Notifications</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 text-lg">
              <Mail className="h-6 w-6" />
              <span>Messages</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 text-lg">
              <Bookmark className="h-6 w-6" />
              <span>Bookmarks</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 text-lg">
              <Clapperboard className="h-6 w-6" />
              <span>Reels</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 text-lg">
              <User className="h-6 w-6" />
              <span>Profile</span>
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://placehold.co/40x40.png" alt="admin" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold">Admin</p>
            <p className="text-sm text-muted-foreground">@admin</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 border-r p-6">
        <header className="mb-6">
          <h1 className="text-xl font-bold">Home</h1>
        </header>
        <div className="mb-6">
          <div className="flex gap-4">
            <Avatar>
              <AvatarImage src="https://placehold.co/48x48.png" alt="admin" />
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <div className="w-full">
              <Input placeholder="What is happening?!" className="mb-2 h-12 text-lg border-none focus-visible:ring-0" />
              <div className="flex justify-end">
                <Button>Post</Button>
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="flow-root">
          <ul className="-my-6 divide-y divide-border">
            <li className="py-6">
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
                  <div className="mt-4 flex gap-8 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      <span>23</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v8"/></svg>
                      <span>11</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      <span>61</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </main>

      <aside className="w-80 p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input placeholder="Search" className="pl-10" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Trends for you</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Trending in Your Area</p>
              <p className="font-bold">#NextJS</p>
              <p className="text-sm text-muted-foreground">1.2M posts</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Technology · Trending</p>
              <p className="font-bold">#AI</p>
              <p className="text-sm text-muted-foreground">5.8M posts</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business · Trending</p>
              <p className="font-bold">#React</p>
              <p className="text-sm text-muted-foreground">987k posts</p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
