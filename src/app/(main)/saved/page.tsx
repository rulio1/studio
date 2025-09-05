
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where, limit, orderBy, updateDoc, arrayUnion, arrayRemove, deleteDoc, onSnapshot, documentId } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bookmark, Library } from 'lucide-react';
import PostSkeleton from '@/components/post-skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface ZisprUser {
    handle?: string;
    collections?: { id: string, name: string, postIds: string[] }[];
}

export default function SavedPage() {
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user) {
            setZisprUser(null);
            return;
        }
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });
        return () => unsubscribeUser();
    }, [user, router]);


    const allSavedPostsCount = zisprUser?.collections?.find(c => c.name === 'Todos os posts salvos')?.postIds.length ?? 0;

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">Salvos</h1>
                        <p className="text-sm text-muted-foreground">{zisprUser?.handle}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                     <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className='space-y-4'>
                        <h2 className="text-lg font-bold">Minhas Coleções</h2>
                         <Card 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => router.push('/collections/all')}
                         >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className='flex items-center gap-4'>
                                    <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                                        <Bookmark className="h-8 w-8 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Todos os posts salvos</p>
                                        <p className="text-sm text-muted-foreground">{allSavedPostsCount} posts</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                          <Card className="border-dashed hover:bg-muted/50 cursor-pointer">
                            <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                                <Library className="h-5 w-5" />
                                <span>Criar nova coleção</span>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}

