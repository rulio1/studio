
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
    
            const firestoreUpdateData = {
                displayName: profileData.displayName,
                searchableDisplayName: profileData.displayName.toLowerCase(),
                handle: handleWithAt,
                searchableHandle: handleWithAt.replace('@', '').toLowerCase(),
                bio: profileData.bio,
                location: profileData.location,
                website: profileData.website,
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
        </div>
        <div className="px-4">
            <div className="-mt-16 relative w-32">
                <Avatar className="h-32 w-32 border-4 border-background bg-muted">
                     <AvatarImage src={profileData.avatar} alt={profileData.displayName} />
                     <AvatarFallback className="text-4xl">{profileData.displayName?.[0]}</AvatarFallback>
                </Avatar>
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
