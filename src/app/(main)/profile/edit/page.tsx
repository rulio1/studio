
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import Image from 'next/image';
import ImageCropper, { ImageCropperData } from '@/components/image-cropper';
import { fileToDataUri, dataURItoFile } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';


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
    
    const [newAvatarDataUri, setNewAvatarDataUri] = useState<string | null>(null);
    const [newBannerDataUri, setNewBannerDataUri] = useState<string | null>(null);

    const [cropperData, setCropperData] = useState<ImageCropperData | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const initialData: UserProfileData = {
                            displayName: userData.displayName || '',
                            handle: userData.handle || '',
                            bio: userData.bio || '',
                            location: userData.location || '',
                            avatar: userData.avatar || '',
                            banner: userData.banner || '',
                        };
                        setProfileData(initialData);
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


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) { // 4MB limit
            toast({
                title: 'Imagem muito grande',
                description: 'Por favor, selecione uma imagem menor que 4MB.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const dataUri = await fileToDataUri(file);
            setCropperData({
                image: dataUri,
                type: type,
            });
        } catch (error) {
            toast({ title: "Erro ao ler arquivo", description: "Não foi possível carregar a imagem.", variant: "destructive" });
        }
        e.target.value = '';
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileData({ ...profileData, [e.target.id]: e.target.value });
    };
    
    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        
        try {
            const userRef = doc(db, 'users', user.uid);
            let avatarUrl = profileData.avatar;
            let bannerUrl = profileData.banner;
            
            const uploadImage = async (dataUri: string, bucketPath: 'avatars' | 'banners'): Promise<string> => {
                // Upload logic will be re-implemented with a new storage solution
                toast({title: "Upload de Imagem", description: "A funcionalidade de upload será reimplementada em breve."});
                return '';
            };

            if (newAvatarDataUri) {
                avatarUrl = await uploadImage(newAvatarDataUri, 'avatars');
            }
            
            if (newBannerDataUri) {
                bannerUrl = await uploadImage(newBannerDataUri, 'banners');
            }

            const firestoreUpdateData: any = {
                displayName: profileData.displayName,
                handle: profileData.handle.startsWith('@') ? profileData.handle : `@${profileData.handle}`,
                bio: profileData.bio,
                location: profileData.location,
            };

            if(avatarUrl) firestoreUpdateData.avatar = avatarUrl;
            if(bannerUrl) firestoreUpdateData.banner = bannerUrl;
            
            await updateDoc(userRef, firestoreUpdateData);
    
            toast({
                title: 'Perfil Salvo!',
                description: 'Suas alterações foram salvas com sucesso.',
            });
            
            router.push(`/profile/${user.uid}`);
    
        } catch (error: any) {
            console.error('Erro ao salvar perfil: ', error);
            toast({
                title: 'Falha ao Salvar',
                description: error.message || 'Não foi possível salvar as alterações do seu perfil.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCropComplete = (croppedImageUri: string) => {
        if (cropperData?.type === 'avatar') {
            setNewAvatarDataUri(croppedImageUri);
            setProfileData(prev => ({...prev, avatar: croppedImageUri}));
        } else if (cropperData?.type === 'banner') {
            setNewBannerDataUri(croppedImageUri);
             setProfileData(prev => ({...prev, banner: croppedImageUri}));
        }
        setCropperData(null);
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

  return (
    <>
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()} disabled={isSaving}>
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
             <Image src={profileData.banner || 'https://placehold.co/600x200.png'} alt="Banner" layout="fill" objectFit="cover" />
             <Button 
                variant="ghost" 
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity w-full h-full p-0"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isSaving}>
                <Upload className="h-8 w-8 text-white" />
            </Button>
            <Input 
                type="file" 
                ref={bannerInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif"
                onChange={(e) => handleFileChange(e, 'banner')}
                disabled={isSaving}
            />
        </div>
        <div className="px-4">
            <div className="-mt-16 relative w-32">
                <Avatar className="h-32 w-32 border-4 border-background">
                     <AvatarImage src={profileData.avatar} alt={profileData.displayName} />
                     <AvatarFallback className="text-4xl">{profileData.displayName?.[0]}</AvatarFallback>
                </Avatar>
                
                <Button 
                    variant="ghost" 
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full h-full w-full p-0"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isSaving}>
                    <Upload className="h-8 w-8 text-white" />
                </Button>

                <Input 
                    type="file" 
                    ref={avatarInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/gif"
                    onChange={(e) => handleFileChange(e, 'avatar')}
                    disabled={isSaving}
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
    {cropperData && (
        <ImageCropper
            data={cropperData}
            onComplete={handleCropComplete}
            onCancel={() => setCropperData(null)}
        />
    )}
    </>
  );
}
