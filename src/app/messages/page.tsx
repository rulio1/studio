
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MailPlus, Search, Settings } from 'lucide-react';
import Link from 'next/link';

const messages = [
    {
        id: 1,
        avatars: ['https://placehold.co/48x48.png', 'https://placehold.co/48x48.png'],
        name: 'stefany, kamy/s',
        handle: '@debzoz',
        lastMessage: "You sent @debzoz's post",
        date: '5/20/25',
        unread: 2,
    },
    {
        id: 2,
        avatars: ['https://placehold.co/48x48.png'],
        name: 'kamy/s',
        handle: '@SouzaKamyly',
        lastMessage: "You sent @orph33us's post",
        date: '2/14/25',
    },
    {
        id: 3,
        avatars: ['https://placehold.co/48x48.png'],
        name: 'stefany',
        handle: '@StefanySorza',
        lastMessage: 'You: x.com/andrezignos/st...',
        date: '1/27/25',
    },
     {
        id: 4,
        avatars: ['https://placehold.co/48x48.png'],
        name: 'Camila Souza de Souza',
        handle: '@camillass...',
        lastMessage: "You sent @pivetemaromba's post",
        date: '2/16/24',
    }
];

export default function MessagesPage() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
           <Avatar className="h-8 w-8">
            <AvatarImage src="https://placehold.co/40x40.png" alt="admin" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div className="flex-1">
             <h1 className="text-xl font-bold text-center">Messages</h1>
          </div>
          <Settings className="h-6 w-6" />
        </div>
      </header>

      <div className="p-4 border-b">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search Direct Messages" className="w-full rounded-full bg-muted pl-10" />
        </div>
      </div>

      <ul className="divide-y divide-border">
          {messages.map((message) => (
              <li key={message.id} className="p-4 flex gap-4 hover:bg-muted/50 cursor-pointer">
                  <div className="relative">
                      <Avatar className="h-12 w-12">
                          <AvatarImage src={message.avatars[0]} alt={message.name} />
                          <AvatarFallback>{message.name[0]}</AvatarFallback>
                      </Avatar>
                      {message.unread && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                              {message.unread}
                          </span>
                      )}
                  </div>
                  <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                          <p className="font-bold truncate">{message.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{message.handle}</p>
                          <p className="text-sm text-muted-foreground">· {message.date}</p>
                      </div>
                      <p className="text-muted-foreground">{message.lastMessage}</p>
                  </div>
              </li>
          ))}
      </ul>
      
    </>
  );
}
