
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React from 'react';

interface UserProfileData {
    displayName: string;
    bio: string;
    location: string;
}

export default function EditProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [profileData, setProfileData] = useState<UserProfileData>({
        displayName: '',
        bio: '',
        location: '',
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setProfileData({
                        displayName: userData.displayName || '',
                        bio: userData.bio || '',
                        location: userData.location || '',
                    });
                    setAvatarPreview(userData.avatar || null);
                    setBannerPreview(userData.banner || null);
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileData({ ...profileData, [e.target.id]: e.target.value });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = event.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (type === 'avatar') {
                setAvatarFile(file);
                setAvatarPreview(reader.result as string);
            } else {
                setBannerFile(file);
                setBannerPreview(reader.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const updateData: { [key: string]: any } = { ...profileData };

            if (bannerFile) {
                const bannerStorageRef = ref(storage, `banners/${user.uid}/${Date.now()}_${bannerFile.name}`);
                await uploadBytes(bannerStorageRef, bannerFile);
                updateData.banner = await getDownloadURL(bannerStorageRef);
            }

            if (avatarFile) {
                const avatarStorageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
                await uploadBytes(avatarStorageRef, avatarFile);
                updateData.avatar = await getDownloadURL(avatarStorageRef);
            }
            
            await updateDoc(doc(db, 'users', user.uid), updateData);

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
            <Button variant="default" className="rounded-full font-bold px-4 bg-foreground text-background hover:bg-foreground/80" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
            </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative h-48 bg-muted">
            <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
            {bannerPreview && <Image
                src={bannerPreview}
                alt="Banner"
                layout="fill"
                objectFit="cover"
                data-ai-hint="concert crowd"
            />}
            <div className="absolute top-0 left-0 w-full h-full bg-black/30 flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className='text-white rounded-full bg-black/50 hover:bg-black/70' onClick={() => bannerInputRef.current?.click()}><Camera className="h-5 w-5" /></Button>
            </div>
        </div>
        <div className="px-4">
            <div className="-mt-16 relative w-32">
                <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                <Avatar className="h-32 w-32 border-4 border-background">
                    {avatarPreview && <AvatarImage src={avatarPreview} data-ai-hint="pop star" alt={profileData.displayName} />}
                    <AvatarFallback className="text-4xl">{profileData.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity" onClick={() => avatarInputRef.current?.click()}>
                    <Camera className="h-6 w-6 text-white" />
                </div>
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
