

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Mic, Search, Users, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

const liveSpaces = [
    {
        title: 'Bate-papo sobre Tech & Chill',
        hosts: [{ name: 'Alex', avatar: 'https://placehold.co/24x24.png' }, { name: 'Ben', avatar: 'https://placehold.co/24x24.png' }],
        listeners: 128,
        tags: ['Tecnologia', 'Desenvolvimento'],
        color: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    },
    {
        title: 'Perguntas e Respostas sobre Design Systems',
        hosts: [{ name: 'Casey', avatar: 'https://placehold.co/24x24.png' }],
        listeners: 45,
        tags: ['Design', 'UI/UX'],
        color: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    }
];

const upcomingSpaces = [
    { title: 'O Futuro da IA', time: 'Amanhã às 20:00', tags: ['IA', 'Tecnologia do Futuro'] },
    { title: 'Mastermind de Marketing', time: 'Sexta-feira às 10:00', tags: ['Marketing', 'Crescimento'] },
];

export default function SpacesPage() {
    const router = useRouter();
    return (
        <>
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                 <div className="flex items-center justify-between px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="relative flex-1 max-w-xs mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input placeholder="Buscar por Spaces" className="w-full rounded-full bg-muted pl-10 pr-4 py-2 text-sm" />
                    </div>
                     <Button variant="ghost" size="icon">
                        <Calendar className="h-5 w-5" />
                    </Button>
                </div>
            </header>
            <div className="p-4 space-y-8">
                 <div>
                    <h2 className="text-2xl font-bold mb-4">Acontecendo Agora</h2>
                    <div className="space-y-4">
                        {liveSpaces.map((space, index) => (
                             <Card key={index} className={`${space.color}`}>
                                <CardContent className="p-4">
                                    <p className="text-sm">AO VIVO</p>
                                    <h3 className="text-xl font-bold mt-2 text-foreground">{space.title}</h3>
                                     <div className="flex items-center gap-2 mt-4">
                                        <div className="flex -space-x-2">
                                            {space.hosts.map(host => (
                                                <Avatar key={host.name} className="h-6 w-6 border-2 border-background">
                                                    <AvatarImage src={host.avatar} />
                                                    <AvatarFallback>{host.name[0]}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                        <span className="text-sm text-foreground truncate">{space.hosts.map(h => h.name).join(', ')} estão apresentando</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                         <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span className="text-sm">{space.listeners} ouvintes</span>
                                        </div>
                                        <Button size="sm" variant="secondary" className="rounded-full">Ouvir ao vivo</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-4">Próximos Spaces</h2>
                    <div className="space-y-4">
                        {upcomingSpaces.map((space, index) => (
                             <Card key={index} className="bg-muted">
                                 <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{space.time}</p>
                                        <h3 className="font-bold text-foreground">{space.title}</h3>
                                        <div className="flex gap-2 mt-1">
                                            {space.tags.map(tag => (
                                                <span key={tag} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="rounded-full">
                                        <Bell className="h-4 w-4 mr-2" />
                                        Definir lembrete
                                    </Button>
                                 </CardContent>
                             </Card>
                        ))}
                    </div>
                </div>

                <div className="p-4 sticky bottom-0 left-0 right-0 bg-background">
                    <Button className="w-full rounded-full" size="lg">
                        <Mic className="h-5 w-5 mr-2" />
                        Inicie seu Space
                    </Button>
                </div>
            </div>
        </>
    )
}
