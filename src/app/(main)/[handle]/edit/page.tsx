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
import { useTranslation } from '@/hooks/use-translation';
import { useUserStore } from '@/store/user-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ZisprUser } from '@/types/zispr';
import { fileToDataUri } from '@/lib/utils';
import ImageCropper, { ImageCropperData } from '@/components/image-cropper';

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

    const [avatarDataUri, setAvatarDataUri] = useState<string | null>(null);
    const [bannerDataUri, setBannerDataUri] = useState<string | null>(null);

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

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileData({ ...profileData, [e.target.id]: e.target.value });
    };

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
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
            setCropperData({ image: dataUri, type });
        } catch (error) {
            toast({
                title: t('profile.edit.toasts.fileReadError.title'),
                description: t('profile.edit.toasts.fileReadError.description'),
                variant: 'destructive',
            });
        }
    };
    
    const onCropComplete = (croppedImageUri: string) => {
        if (cropperData?.type === 'avatar') {
            setProfileData(prev => ({...prev, avatar: croppedImageUri}));
            setAvatarDataUri(croppedImageUri);
        } else if (cropperData?.type === 'banner') {
            setProfileData(prev => ({...prev, banner: croppedImageUri}));
            setBannerDataUri(croppedImageUri);
        }
        setCropperData(null);
    };

    const uploadImage = async (dataUri: string): Promise<string | null> => {
        try {
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUri }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Falha no upload da imagem.');
            }

            const result = await response.json();
            return result.imageUrl;
        } catch (error: any) {
            toast({
                title: "Erro no Upload",
                description: error.message,
                variant: "destructive",
            });
            return null;
        }
    };

    const handleSave = async () => {
        if (!user || !zisprUser) return;
        setIsSaving(true);
    
        try {
            // Handle username check
            const handleWithAt = profileData.handle.startsWith('@') ? profileData.handle : `@${profileData.handle}`;
            if (handleWithAt !== zisprUser.handle) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("handle", "==", handleWithAt));
                if (!(await getDocs(q)).empty) {
                    toast({ title: "Nome de usuário já existe", variant: "destructive" });
                    setIsSaving(false);
                    return; 
                }
            }
            
            let avatarUrl = profileData.avatar;
            if (avatarDataUri) {
                const uploadedUrl = await uploadImage(avatarDataUri);
                if (!uploadedUrl) {
                    setIsSaving(false);
                    return;
                }
                avatarUrl = uploadedUrl;
            }

            let bannerUrl = profileData.banner;
            if (bannerDataUri) {
                const uploadedUrl = await uploadImage(bannerDataUri);
                if (!uploadedUrl) {
                    setIsSaving(false);
                    return;
                }
                bannerUrl = uploadedUrl;
            }

            const firestoreUpdateData = {
                displayName: profileData.displayName,
                handle: handleWithAt,
                bio: profileData.bio,
                location: profileData.location,
                website: profileData.website,
                avatar: avatarUrl,
                banner: bannerUrl,
            };
    
            await updateDoc(doc(db, 'users', user.uid), firestoreUpdateData);
    
            toast({ title: t('profile.edit.toasts.saveSuccess.title') });
            router.push(`/${handleWithAt.substring(1)}`);
    
        } catch (error: any) {
            console.error('Erro ao salvar perfil: ', error);
            toast({ title: t('profile.edit.toasts.saveError.title'), variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isUserLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

  return (
    <>
    {cropperData && (
        <ImageCropper 
            data={cropperData}
            onComplete={onCropComplete}
            onCancel={() => setCropperData(null)}
        />
    )}
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
        <div className="relative h-48 bg-muted group">
             <Image src={profileData.banner || 'https://placehold.co/600x200.png'} alt="Banner" fill className="object-cover" />
             <input type="file" ref={bannerInputRef} onChange={(e) => handleImageFileChange(e, 'banner')} className="hidden" accept="image/*" />
             <Button variant="ghost" size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-black/50 hover:bg-black/70 text-white" onClick={() => bannerInputRef.current?.click()}>
                <Upload className="h-5 w-5" />
            </Button>
        </div>
        <div className="px-4">
            <div className="-mt-16 relative w-32 group">
                <Avatar className="h-32 w-32 border-4 border-background bg-muted">
                     <AvatarImage src={profileData.avatar} alt={profileData.displayName} />
                     <AvatarFallback className="text-4xl">{profileData.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <input type="file" ref={avatarInputRef} onChange={(e) => handleImageFileChange(e, 'avatar')} className="hidden" accept="image/*" />
                <Button variant="ghost" size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-black/50 hover:bg-black/70 text-white" onClick={() => avatarInputRef.current?.click()}>
                    <Upload className="h-5 w-5" />
                </Button>
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
    </>
  );
}
