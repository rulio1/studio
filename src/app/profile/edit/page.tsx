
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useDebounce } from 'use-debounce';

interface UserProfileData {
    displayName: string;
    handle: string;
    bio: string;
    location: string;
    avatar: string;
    banner: string;
}

export default function EditProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [originalHandle, setOriginalHandle] = useState('');
    
    const [profileData, setProfileData] = useState<UserProfileData>({
        displayName: '',
        handle: '',
        bio: '',
        location: '',
        avatar: '',
        banner: '',
    });

    const [debouncedHandle] = useDebounce(profileData.handle, 500);
    const [isCheckingHandle, setIsCheckingHandle] = useState(false);
    const [isHandleAvailable, setIsHandleAvailable] = useState(true);
    const [handleStatusMessage, setHandleStatusMessage] = useState('');


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const handle = userData.handle.startsWith('@') ? userData.handle.substring(1) : userData.handle;
                        setProfileData({
                            displayName: userData.displayName || '',
                            handle: handle,
                            bio: userData.bio || '',
                            location: userData.location || '',
                            avatar: userData.avatar || '',
                            banner: userData.banner || '',
                        });
                        setOriginalHandle(handle);
                    } else {
                        toast({ title: "Usuário não encontrado.", variant: "destructive" });
                        router.push('/login');
                    }
                } catch (error) {
                     toast({ title: "Erro ao carregar perfil.", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);

    const checkHandleAvailability = useCallback(async (handle: string) => {
        if (handle === originalHandle) {
            setHandleStatusMessage('');
            setIsHandleAvailable(true);
            return;
        }
        if (handle.length < 3) {
            setHandleStatusMessage('O nome de usuário deve ter pelo menos 3 caracteres.');
            setIsHandleAvailable(false);
            return;
        }

        setIsCheckingHandle(true);
        setHandleStatusMessage('Verificando...');
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("searchableHandle", "==", handle.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setHandleStatusMessage('Nome de usuário disponível!');
                setIsHandleAvailable(true);
            } else {
                setHandleStatusMessage('Este nome de usuário já está em uso.');
                setIsHandleAvailable(false);
            }
        } catch (error) {
            setHandleStatusMessage('Erro ao verificar o nome de usuário.');
            setIsHandleAvailable(false);
        } finally {
            setIsCheckingHandle(false);
        }
    }, [originalHandle]);

     useEffect(() => {
        if (debouncedHandle) {
            checkHandleAvailability(debouncedHandle);
        }
    }, [debouncedHandle, checkHandleAvailability]);


    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let value = e.target.value;
        if (e.target.id === 'handle') {
             value = value.replace(/[^a-z0-9_]/gi, '').toLowerCase();
        }
        setProfileData({ ...profileData, [e.target.id]: value });
    };

    const handleSave = async () => {
        if (!user || !isHandleAvailable) {
            toast({
                title: "Não é possível salvar",
                description: "O nome de usuário escolhido não está disponível.",
                variant: "destructive"
            });
            return;
        }
        setIsSaving(true);
        
        try {
            const newHandle = profileData.handle;
            const handleChanged = newHandle !== originalHandle;
            
            const updateData: { [key: string]: any } = { 
                displayName: profileData.displayName,
                bio: profileData.bio,
                location: profileData.location,
            };

            if (handleChanged) {
                updateData.handle = `@${newHandle}`;
                updateData.searchableHandle = newHandle.toLowerCase();
            }

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, updateData);

            toast({
                title: "Perfil Salvo",
                description: "Suas alterações foram salvas com sucesso.",
            });
            router.push(`/profile/${user.uid}`);

        } catch (error) {
            console.error("Erro ao salvar perfil: ", error);
            toast({
                title: "Falha ao Salvar",
                description: "Não foi possível salvar as alterações do seu perfil. Por favor, tente novamente.",
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Button variant="ghost" onClick={() => router.back()} disabled={isSaving}>
                <X className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Editar perfil</h1>
            <Button variant="default" className="rounded-full font-bold px-4 bg-foreground text-background hover:bg-foreground/80" onClick={handleSave} disabled={isSaving || isCheckingHandle || !isHandleAvailable}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
            </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative h-48 bg-muted" />
        <div className="px-4">
            <div className="-mt-16 relative w-32">
                <Avatar className="h-32 w-32 border-4 border-background">
                    {profileData.avatar ? <AvatarImage src={profileData.avatar} alt={profileData.displayName} />: <AvatarFallback className="text-4xl">{profileData.displayName?.[0]}</AvatarFallback>}
                </Avatar>
            </div>
        </div>

        <div className="p-4 mt-4 space-y-8">
            <div className="grid gap-1.5">
                <Label htmlFor="displayName">Nome</Label>
                <Input 
                    id="displayName" 
                    value={profileData.displayName} 
                    onChange={handleFormChange}
                    className="text-lg" 
                    disabled={isSaving}
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="handle">Nome de usuário</Label>
                 <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span className="pl-3 text-muted-foreground">@</span>
                    <Input 
                        id="handle" 
                        value={profileData.handle} 
                        onChange={handleFormChange}
                        className="text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        disabled={isSaving}
                    />
                </div>
                {handleStatusMessage && (
                    <p className={`text-sm mt-1 ${isCheckingHandle ? 'text-muted-foreground' : isHandleAvailable ? 'text-green-500' : 'text-red-500'}`}>
                        {handleStatusMessage}
                    </p>
                )}
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                    id="bio" 
                    value={profileData.bio} 
                    onChange={handleFormChange}
                    rows={3}
                    className="text-lg"
                    disabled={isSaving}
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="location">Localização</Label>
                <Input 
                    id="location" 
                    value={profileData.location}
                    onChange={handleFormChange}
                     className="text-lg"
                     disabled={isSaving}
                />
            </div>
        </div>
      </main>
    </div>
  );
}
