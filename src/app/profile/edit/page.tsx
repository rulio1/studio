
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ChevronDown, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
    const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <h1 className="font-bold text-lg">Edit profile</h1>
            <Button variant="default" className="rounded-full font-bold px-4">Save</Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative h-40">
          <Image
            src="https://placehold.co/600x200.png"
            alt="Banner"
            layout="fill"
            objectFit="cover"
            data-ai-hint="concert crowd"
          />
          <div className="absolute top-0 left-0 w-full h-full bg-black/30" />
        </div>
        <div className="px-4">
            <div className="-mt-12 relative w-24">
                <Avatar className="h-24 w-24 border-4 border-background">
                    <AvatarImage src="https://placehold.co/128x128.png" data-ai-hint="pop star" alt="Barbie" />
                    <AvatarFallback>B</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                </div>
            </div>
        </div>

        <div className="px-4 mt-4 space-y-6">
            <div className="grid gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue="Barbie 🎀" className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" defaultValue="ayo" className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" defaultValue="Brasil" className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
            </div>
             <div className="flex items-center justify-between">
                <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" placeholder="Add your website" className="border-0 rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto" />
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
             <div className="flex items-center justify-between">
                <div>
                    <Label>Birth date</Label>
                    <p className="text-primary">May 14, 1998</p>
                </div>
                 <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
        </div>

        <div className="mt-6 border-t">
            <div className="px-4">
                 <div className="flex items-center justify-between py-4 border-b">
                    <p className="font-semibold">Edit professional profile</p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                 <div className="flex items-center justify-between py-4 border-b">
                    <p className="font-semibold">Edit expanded bio</p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                 <div className="flex items-center justify-between py-4">
                    <p className="font-semibold">Tips</p>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Off</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}
