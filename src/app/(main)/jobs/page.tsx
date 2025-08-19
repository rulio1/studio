

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Briefcase, MoreHorizontal, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    avatar: string;
    avatarHint: string;
}

const JobSkeleton = () => (
    <div className="py-4 flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-lg mt-1" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-10 w-24" />
    </div>
)

export default function JobsPage() {
    const router = useRouter();
    const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoading(true);
            try {
                const jobsQuery = query(collection(db, 'jobs'), limit(5));
                const jobsSnapshot = await getDocs(jobsQuery);
                const jobsData = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
                setRecommendedJobs(jobsData);
            } catch (error) {
                console.error("Erro ao buscar vagas: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobs();
    }, []);

    return (
        <>
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2 gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Vagas</h1>
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

            <div className="p-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Buscar vagas" className="col-span-2 sm:col-span-1" />
                    <Input placeholder="Localização" className="col-span-2 sm:col-span-1" />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Vagas recomendadas para você</CardTitle>
                        <CardDescription>Com base no seu perfil e atividade</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="divide-y divide-border">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => <li key={i}><JobSkeleton/></li>)
                            ) : (
                                recommendedJobs.map((job) => (
                                    <li key={job.id} className="py-4 flex items-start gap-4">
                                         <Avatar className="h-12 w-12 rounded-lg mt-1">
                                            <AvatarImage src={job.avatar} data-ai-hint={job.avatarHint} alt={job.company} />
                                            <AvatarFallback>{job.company[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-bold text-primary">{job.title}</p>
                                            <p className="text-sm font-semibold">{job.company}</p>
                                            <p className="text-sm text-muted-foreground">{job.location}</p>
                                        </div>
                                        <Button variant="outline">Aplicar</Button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </CardContent>
                </Card>

                 <div className="text-center">
                    <Button variant="link">Mostrar todas as recomendações</Button>
                 </div>

            </div>
        </>
    );
}
