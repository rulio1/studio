'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import Image from 'next/image';
import ImageCropper, { ImageCropperData } from '@/components/image-cropper';
import { fileToDataUri, dataURItoFile } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useUserStore } from '@/store/user-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { ZisprUser } from '@/types/zispr';

interface UserProfileData {
    displayName: string;
    handle: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    banner: string;
}

export default function EditProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useTranslation();
    const { user, zisprUser, isLoading: isUserLoading } = useUserStore();
    
    const [isSaving, setIsSaving] = useState(false);
    
    const [profileData, setProfileData] = useState<UserProfileData>({
        displayName: '',
        handle: '',
        bio: '',
        location: '',
        website: '',
        avatar: '',
        banner: '',
    });
    
    const [newAvatarDataUri, setNewAvatarDataUri] = useState<string | null>(null);
    const [newBannerDataUri, setNewBannerDataUri] = useState<string | null>(null);

    const [cropperData, setCropperData] = useState<ImageCropperData | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (zisprUser) {
            setProfileData({
                displayName: zisprUser.displayName || '',
                handle: zisprUser.handle || '',
                bio: zisprUser.bio || '',
                location: zisprUser.location || '',
                website: zisprUser.website || '',
                avatar: zisprUser.avatar || '',
                banner: zisprUser.banner || '',
            });
        }
    }, [zisprUser]);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast({
                title: t('profile.edit.toasts.imageSize.title'),
                description: t('profile.edit.toasts.imageSize.description'),
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
            toast({ title: t('profile.edit.toasts.fileReadError.title'), description: t('profile.edit.toasts.fileReadError.description'), variant: "destructive" });
        }
        e.target.value = '';
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileData({ ...profileData, [e.target.id]: e.target.value });
    };
    
    const handleSave = async () => {
        if (!user || !zisprUser) return;
        setIsSaving(true);
    
        try {
            const handleWithAt = profileData.handle.startsWith('@') ? profileData.handle : `@${profileData.handle}`;
    
            if (handleWithAt !== zisprUser.handle) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("handle", "==", handleWithAt));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    toast({
                        title: "Nome de usuário já existe",
                        description: "Este @handle já está em uso. Por favor, escolha outro.",
                        variant: "destructive",
                    });
                    setIsSaving(false);
                    return; 
                }
            }
    
            let avatarUrl = zisprUser.avatar;
            if (newAvatarDataUri) {
                const storageRef = ref(storage, `users/${user.uid}/avatar/${uuidv4()}`);
                const uploadTask = await uploadString(storageRef, newAvatarDataUri, 'data_url');
                avatarUrl = await getDownloadURL(uploadTask.ref);
            }
    
            let bannerUrl = zisprUser.banner;
            if (newBannerDataUri) {
                const storageRef = ref(storage, `users/${user.uid}/banner/${uuidv4()}`);
                const uploadTask = await uploadString(storageRef, newBannerDataUri, 'data_url');
                bannerUrl = await getDownloadURL(uploadTask.ref);
            }
    
            const firestoreUpdateData = {
                displayName: profileData.displayName,
                searchableDisplayName: profileData.displayName.toLowerCase(),
                handle: handleWithAt,
                searchableHandle: handleWithAt.replace('@', '').toLowerCase(),
                bio: profileData.bio,
                location: profileData.location,
                website: profileData.website,
                avatar: avatarUrl,
                banner: bannerUrl,
            };
    
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, firestoreUpdateData);
    
            toast({
                title: t('profile.edit.toasts.saveSuccess.title'),
                description: t('profile.edit.toasts.saveSuccess.description'),
            });
    
            router.push(`/profile/${user.uid}`);
    
        } catch (error: any) {
            console.error('Erro ao salvar perfil: ', error);
            toast({
                title: t('profile.edit.toasts.saveError.title'),
                description: error.message || t('profile.edit.toasts.saveError.description'),
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

    if (isUserLoading) {
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
            <h1 className="font-bold text-lg">{t('profile.edit.title')}</h1>
            <Button variant="default" className="rounded-full font-bold px-4 bg-foreground text-background hover:bg-foreground/80" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('profile.edit.saveButton')}
            </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="relative h-48 bg-muted">
             <Image src={profileData.banner || 'https://placehold.co/600x200.png'} alt="Banner" fill className="object-cover" />
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
                <Avatar className="h-32 w-32 border-4 border-background bg-muted">
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
                <Label htmlFor="displayName">{t('profile.edit.fields.name')}</Label>
                <Input 
                    id="displayName" 
                    value={profileData.displayName} 
                    onChange={handleFormChange}
                    className="text-lg" 
                    disabled={isSaving}
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="handle">{t('profile.edit.fields.username')}</Label>
                <Input 
                    id="handle" 
                    value={profileData.handle} 
                    onChange={handleFormChange}
                    className="text-lg" 
                    disabled={isSaving}
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="bio">{t('profile.edit.fields.bio')}</Label>
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
                <Label htmlFor="location">{t('profile.edit.fields.location')}</Label>
                <Input 
                    id="location" 
                    value={profileData.location}
                    onChange={handleFormChange}
                     className="text-lg"
                     disabled={isSaving}
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="website">{t('profile.edit.fields.website')}</Label>
                <Input 
                    id="website" 
                    value={profileData.website}
                    onChange={handleFormChange}
                     className="text-lg"
                     disabled={isSaving}
                     placeholder={t('profile.edit.fields.websitePlaceholder')}
                />
            </div>
        </div>
      </ScrollArea>
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
