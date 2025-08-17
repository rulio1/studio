
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Progress } from '@/components/ui/progress';

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
    
    const [profileData, setProfileData] = useState<UserProfileData>({
        displayName: '',
        handle: '',
        bio: '',
        location: '',
        avatar: '',
        banner: '',
    });

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setProfileData({
                            displayName: userData.displayName || '',
                            handle: userData.handle || '',
                            bio: userData.bio || '',
                            location: userData.location || '',
                            avatar: userData.avatar || '',
                            banner: userData.banner || '',
                        });
                        setAvatarPreview(userData.avatar || '');
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setAvatarPreview(URL.createObjectURL(file));
        setNewAvatarUrl(null);
        setUploadProgress(0);

        const storageRef = ref(storage, `avatars/${user.uid}/${uuidv4()}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                toast({ title: "Falha no upload do avatar", description: "Verifique suas regras de segurança do Storage.", variant: "destructive" });
                setUploadProgress(null);
                setAvatarPreview(profileData.avatar); // Revert preview
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    setNewAvatarUrl(downloadURL);
                    setUploadProgress(100);
                    toast({ title: "Avatar enviado!", description: "Clique em Salvar para aplicar as alterações." });
                });
            }
        );
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileData({ ...profileData, [e.target.id]: e.target.value });
    };

    const handleSave = async () => {
        if (!user) return;
        
        if (uploadProgress !== null && uploadProgress < 100) {
            toast({ title: "Aguarde o upload do avatar terminar.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const finalAvatarUrl = newAvatarUrl || profileData.avatar;
            
            await updateProfile(user, {
                displayName: profileData.displayName,
                photoURL: finalAvatarUrl,
            });
            
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: profileData.displayName,
                searchableDisplayName: profileData.displayName.toLowerCase(),
                handle: profileData.handle,
                searchableHandle: profileData.handle.replace('@','').toLowerCase(),
                bio: profileData.bio,
                location: profileData.location,
                avatar: finalAvatarUrl
            });

            toast({
                title: "Perfil Salvo!",
                description: "Suas alterações foram salvas com sucesso.",
            });
            router.push(`/profile/${user.uid}`);
            
        } catch (error) {
            console.error("Erro ao salvar perfil: ", error);
            toast({
                title: "Falha ao Salvar",
                description: "Não foi possível salvar as alterações do seu perfil.",
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
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()} disabled={isSaving || (uploadProgress !== null && uploadProgress < 100)}>
                <X className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Editar perfil</h1>
            <Button variant="default" className="rounded-full font-bold px-4 bg-foreground text-background hover:bg-foreground/80" onClick={handleSave} disabled={isSaving || (uploadProgress !== null && uploadProgress < 100)}>
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
                     <AvatarImage src={avatarPreview ?? undefined} alt={profileData.displayName} />
                     <AvatarFallback className="text-4xl">{profileData.displayName?.[0]}</AvatarFallback>
                </Avatar>
                
                {uploadProgress !== null ? (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                         <Progress value={uploadProgress} className="w-3/4 h-2" />
                     </div>
                ) : (
                    <Button 
                        variant="ghost" 
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full h-full w-full p-0"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isSaving}>
                        <Upload className="h-8 w-8 text-white" />
                    </Button>
                )}

                <Input 
                    type="file" 
                    ref={avatarInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleImageChange}
                    disabled={isSaving || (uploadProgress !== null && uploadProgress < 100)}
                />
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
                <Input 
                    id="handle" 
                    value={profileData.handle} 
                    onChange={handleFormChange}
                    className="text-lg" 
                    disabled={isSaving}
                />
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
