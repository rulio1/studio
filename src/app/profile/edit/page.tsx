
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';

interface ChirpUser {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    banner: string;
    bio: string;
    location: string;
}

export default function EditProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [avatarImage, setAvatarImage] = useState<string | null>(null);

    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as ChirpUser;
                    setChirpUser(userData);
                    setBannerImage(userData.banner);
                    setAvatarImage(userData.avatar);
                }
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = event.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (type === 'avatar') {
                setAvatarImage(reader.result as string);
            } else {
                setBannerImage(reader.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!user || !chirpUser) return;
        setIsSaving(true);
        try {
            let bannerUrl = chirpUser.banner;
            let avatarUrl = chirpUser.avatar;

            const userRef = doc(db, 'users', user.uid);

            if (bannerImage && bannerImage !== chirpUser.banner) {
                const bannerStorageRef = ref(storage, `banners/${user.uid}`);
                const snapshot = await uploadString(bannerStorageRef, bannerImage, 'data_url');
                bannerUrl = await getDownloadURL(snapshot.ref);
            }

            if (avatarImage && avatarImage !== chirpUser.avatar) {
                const avatarStorageRef = ref(storage, `avatars/${user.uid}`);
                const snapshot = await uploadString(avatarStorageRef, avatarImage, 'data_url');
                avatarUrl = await getDownloadURL(snapshot.ref);
            }
            
            await updateDoc(userRef, {
                displayName: chirpUser.displayName,
                bio: chirpUser.bio,
                location: chirpUser.location,
                banner: bannerUrl,
                avatar: avatarUrl,
            });

            toast({
                title: "Profile Saved",
                description: "Your changes have been successfully saved.",
            });
            router.push(`/profile/${user.uid}`);

        } catch (error) {
            console.error("Error saving profile: ", error);
            toast({
                title: "Save Failed",
                description: "Could not save your profile changes. Please try again.",
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading || !chirpUser) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Button variant="ghost" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
            <h1 className="font-bold text-lg">Edit profile</h1>
            <Button variant="default" className="rounded-full font-bold px-4" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
            </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative h-40 bg-muted">
            <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
            {bannerImage && <Image
                src={bannerImage}
                alt="Banner"
                layout="fill"
                objectFit="cover"
                data-ai-hint="concert crowd"
            />}
            <div className="absolute top-0 left-0 w-full h-full bg-black/30 flex items-center justify-center">
                <Button variant="ghost" size="icon" className='text-white' onClick={() => bannerInputRef.current?.click()}><Camera className="h-6 w-6" /></Button>
            </div>
        </div>
        <div className="px-4">
            <div className="-mt-12 relative w-24">
                <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                <Avatar className="h-24 w-24 border-4 border-background">
                    {avatarImage && <AvatarImage src={avatarImage} data-ai-hint="pop star" alt={chirpUser.displayName} />}
                    <AvatarFallback>{chirpUser.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <Camera className="h-6 w-6 text-white" />
                </div>
            </div>
        </div>

        <div className="px-4 mt-4 space-y-6">
            <div className="grid gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input 
                    id="name" 
                    value={chirpUser.displayName} 
                    onChange={(e) => setChirpUser({...chirpUser, displayName: e.target.value})}
                    className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                    id="bio" 
                    value={chirpUser.bio} 
                    onChange={(e) => setChirpUser({...chirpUser, bio: e.target.value})}
                    className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input 
                    id="location" 
                    value={chirpUser.location}
                    onChange={(e) => setChirpUser({...chirpUser, location: e.target.value})} 
                    className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                />
            </div>
        </div>

      </main>
    </div>
  );
}
