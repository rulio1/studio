
'use client';

import BottomNavBar from '@/components/bottom-nav-bar';
import CreatePostFAB from '@/components/create-post-fab';
import HomeLoading from '@/app/(main)/home/loading';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import DesktopSidebar from '@/components/desktop-sidebar';
import RightSidebar from '@/components/right-sidebar';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function MainLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
    const initialLoadTime = useRef(new Date());

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!user) return;
    
        const notificationsQuery = query(
            collection(db, "notifications"), 
            where("toUserId", "==", user.uid)
        );
    
        const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === "added") {
                    const notification = change.doc.data();
                    const notificationTime = notification.createdAt?.toDate();
    
                    if (notificationTime && notificationTime > initialLoadTime.current) {
                        
                        const fromUserDoc = await getDoc(doc(db, "users", notification.fromUserId));
                        const fromUserData = fromUserDoc.data();

                        toast({
                            title: `${notification.fromUser.name}`,
                            description: `${notification.text}`,
                            onClick: () => {
                                if (notification.postId) {
                                    router.push(`/post/${notification.postId}`);
                                } else if (notification.fromUserId) {
                                    router.push(`/profile/${notification.fromUserId}`);
                                }
                            }
                        });
                    }
                }
            }
        });
    
        return () => unsubscribe();
    }, [user, router, toast]);

    const fabBlacklist = [
        '/messages/',
        '/profile/edit',
        '/privacy',
        '/chat'
    ];
    const showFab = !fabBlacklist.some(path => pathname.startsWith(path) && pathname !== '/messages');
    
    // Specific logic for chat page
    if (pathname.startsWith('/chat')) {
        return (
            <div className="flex h-screen justify-center">
                <DesktopSidebar />
                <main className="flex-1 min-w-0 max-w-2xl md:border-x">
                    <div className="animate-fade-in animate-slide-in-from-bottom h-full">
                        {children}
                    </div>
                </main>
                 <RightSidebar />
                <div className="md:hidden">
                    {/* BottomNavBar is intentionally hidden on chat page for mobile */}
                </div>
            </div>
        );
    }
    
    const hideSidebars = [
        '/profile/edit',
        '/settings'
    ].some(path => pathname.startsWith(path));

    if (hideSidebars) {
         return (
            <div className="flex min-h-svh justify-center">
                <main className="w-full md:max-w-2xl md:border-x">
                    <div className="animate-fade-in animate-slide-in-from-bottom h-full">
                        {children}
                    </div>
                </main>
                <div className="md:hidden">
                    <BottomNavBar />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-svh justify-center">
            <DesktopSidebar />
            <main className="flex-1 min-w-0 pb-24 md:pb-0 max-w-2xl border-x">
                 <div className="animate-fade-in animate-slide-in-from-bottom">
                    {children}
                </div>
            </main>
            <RightSidebar />
            <div className="md:hidden">
                {showFab && <CreatePostFAB />}
                <BottomNavBar />
            </div>
        </div>
    );
}


export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                // Se não houver usuário após a verificação, redirecione para o login.
                // Isso desmontará os componentes filhos e seus listeners antes do erro.
                router.replace('/login');
            } else {
                // Se houver um usuário, pare de carregar e mostre o conteúdo.
                setIsLoading(false);
            }
        });

        // Um fallback para o caso de a autenticação demorar a inicializar
        const timer = setTimeout(() => {
             // Se após 2 segundos ainda estivermos carregando, significa que não há usuário
            if (isLoading) {
                // Verificação final
                if (auth.currentUser === null) {
                    router.replace('/login');
                } else {
                    setIsLoading(false);
                }
            }
        }, 2000); 

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, [router, isLoading]);

    if (isLoading) {
        return <HomeLoading />;
    }

    return (
        <Suspense fallback={<HomeLoading />}>
            <MainLayoutClient>{children}</MainLayoutClient>
        </Suspense>
    );
}
