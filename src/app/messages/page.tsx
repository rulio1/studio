
'use client';

import { Bell, Home, Mail, Search, Settings } from 'lucide-react';
import Link from 'next/link';

export default function MessagesPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-xl font-bold">Messages</h1>
          <Settings className="h-6 w-6" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 text-center text-muted-foreground">
            <p>You have no new messages.</p>
        </div>
      </main>

      <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t">
        <nav className="flex justify-around items-center h-14">
            <Link href="/home" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Home className="h-7 w-7" />
            </Link>
            <Link href="/search" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Search className="h-7 w-7" />
            </Link>
            <Link href="/notifications" className="flex-1 flex justify-center items-center text-muted-foreground">
              <Bell className="h-7 w-7" />
            </Link>
            <Link href="/messages" className="flex-1 flex justify-center items-center text-foreground">
              <Mail className="h-7 w-7" />
            </Link>
        </nav>
      </footer>
    </div>
  );
}
