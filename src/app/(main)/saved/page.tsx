
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bookmark, Library, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import CreateCollectionModal from '@/components/create-collection-modal';
import { useTranslation } from '@/hooks/use-translation';

interface ZisprUser {
    handle?: string;
    collections?: { id: string, name: string, postIds: string[] }[];
}

export default function SavedPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
                const userData = doc.data() as ZisprUser;
                // Ensure default collection exists
                if (!userData.collections?.some(c => c.id === 'all_saved')) {
                    userData.collections = [...(userData.collections || []), { id: 'all_saved', name: t('collections.allSaved'), postIds: [] }];
                }
                 // Sort collections: "Todos os posts salvos" first, then alphabetically
                userData.collections?.sort((a, b) => {
                    if (a.id === 'all_saved') return -1;
                    if (b.id === 'all_saved') return 1;
                    return a.name.localeCompare(b.name);
                });
                setZisprUser(userData);
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });
        return () => unsubscribeUser();
    }, [user, router, t]);


    return (
        <>
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                     <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold">{t('sidebar.saved')}</h1>
                            <p className="text-sm text-muted-foreground">{zisprUser?.handle}</p>
                        </div>
                    </div>
                     <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(true)}>
                        <PlusCircle className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                     <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (zisprUser?.collections && zisprUser.collections.length > 0) ? (
                    <div className='grid grid-cols-2 gap-4'>
                        {zisprUser.collections.map(collection => {
                             const collectionName = collection.id === 'all_saved' ? t('collections.allSaved') : collection.name;
                             return (
                                 <Card 
                                    key={collection.id}
                                    className="hover:bg-muted/50 cursor-pointer group"
                                    onClick={() => router.push(`/collections/${collection.id}`)}
                                 >
                                    <CardContent className="p-0 aspect-square flex flex-col justify-between">
                                        <div className="p-4">
                                            <p className="font-bold text-lg line-clamp-3">{collectionName}</p>
                                        </div>
                                        <div className="p-4 text-sm text-muted-foreground">
                                            {collection.postIds?.length || 0} {t('collections.postsCount')}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                     <div className="text-center p-8 mt-16">
                        <Bookmark className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h2 className="mt-4 text-2xl font-bold">{t('collections.emptyState.title')}</h2>
                        <p className="mt-2 text-muted-foreground">{t('collections.emptyState.description')}</p>
                         <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('collections.emptyState.button')}
                        </Button>
                    </div>
                )}
            </main>
        </div>
        {user && (
            <CreateCollectionModal 
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                currentUser={user}
            />
        )}
        </>
    );
}

