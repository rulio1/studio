
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Bell, Briefcase, Home, Mail, MapPin, MoreHorizontal, Search, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


const recommendedJobs = [
    {
        title: 'Senior Frontend Engineer',
        company: 'Stripe',
        location: 'Remote',
        avatar: 'https://placehold.co/48x48.png',
        avatarHint: 'Stripe logo'
    },
    {
        title: 'Full Stack Developer',
        company: 'Vercel',
        location: 'San Francisco, CA',
        avatar: 'https://placehold.co/48x48.png',
        avatarHint: 'Vercel logo'
    },
     {
        title: 'Product Designer',
        company: 'Figma',
        location: 'New York, NY',
        avatar: 'https://placehold.co/48x48.png',
        avatarHint: 'Figma logo'
    }
];

export default function JobsPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2 gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Jobs</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                            <Settings className="h-5 w-5" />
                        </Button>
                         <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Search jobs" className="col-span-2 sm:col-span-1" />
                    <Input placeholder="Location" className="col-span-2 sm:col-span-1" />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Jobs recommended for you</CardTitle>
                        <CardDescription>Based on your profile and activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="divide-y divide-border">
                            {recommendedJobs.map((job, index) => (
                                <li key={index} className="py-4 flex items-start gap-4">
                                     <Avatar className="h-12 w-12 rounded-lg mt-1">
                                        <AvatarImage src={job.avatar} data-ai-hint={job.avatarHint} alt={job.company} />
                                        <AvatarFallback>{job.company[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-bold text-primary">{job.title}</p>
                                        <p className="text-sm font-semibold">{job.company}</p>
                                        <p className="text-sm text-muted-foreground">{job.location}</p>
                                    </div>
                                    <Button variant="outline">Apply</Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                 <div className="text-center">
                    <Button variant="link">Show all recommendations</Button>
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
                    <Link href="/jobs" className="flex-1 flex justify-center items-center text-foreground">
                        <Briefcase className="h-7 w-7" />
                    </Link>
                    <Link href="/notifications" className="flex-1 flex justify-center items-center text-muted-foreground">
                    <Bell className="h-7 w-7" />
                    </Link>
                    <Link href="/messages" className="flex-1 flex justify-center items-center text-muted-foreground">
                    <Mail className="h-7 w-7" />
                    </Link>
                </nav>
            </footer>
        </div>
    );
}
