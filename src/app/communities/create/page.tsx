
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth, db, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, arrayUnion, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function CreateCommunityPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, [router]);

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

    const handleCreateCommunity = async () => {
        if (!user || !name.trim() || !topic.trim()) {
            toast({
                title: "Campos obrigatórios ausentes",
                description: "Por favor, preencha o nome e o tópico da comunidade.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);

        try {
            let bannerUrl = bannerPreview ? '' : 'https://placehold.co/600x200.png';
            let avatarUrl = avatarPreview ? '' : `https://placehold.co/128x128.png?text=${name.substring(0,2)}`;

            if (bannerFile) {
                const bannerRef = ref(storage, `communities/${user.uid}/${Date.now()}_${bannerFile.name}`);
                const snapshot = await uploadBytes(bannerRef, bannerFile);
                bannerUrl = await getDownloadURL(snapshot.ref);
            }

            if (avatarFile) {
                const avatarRef = ref(storage, `communities/${user.uid}/${Date.now()}_${avatarFile.name}`);
                const snapshot = await uploadBytes(avatarRef, avatarFile);
                avatarUrl = await getDownloadURL(snapshot.ref);
            }
            
            const batch = writeBatch(db);
            const communityRef = doc(collection(db, 'communities'));

            batch.set(communityRef, {
                name,
                topic,
                image: bannerUrl,
                avatar: avatarUrl,
                imageHint: 'community banner',
                avatarHint: 'community avatar',
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                memberCount: 1,
            });
            
            const userRef = doc(db, 'users', user.uid);
            batch.update(userRef, {
                communities: arrayUnion(communityRef.id)
            });

            await batch.commit();

            toast({
                title: "Comunidade Criada!",
                description: `A comunidade "${name}" foi criada com sucesso.`,
            });
            router.push(`/communities/${communityRef.id}`);
        } catch (error) {
            console.error("Erro ao criar comunidade:", error);
            toast({ title: "Erro", description: "Não foi possível criar a comunidade.", variant: "destructive"});
        } finally {
            setIsLoading(false);
        }
    };
    
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
            <Button variant="ghost" onClick={() => router.back()} disabled={isLoading}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Criar Comunidade</h1>
            <Button variant="default" className="rounded-full font-bold px-4 bg-foreground text-background hover:bg-foreground/80" onClick={handleCreateCommunity} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar
            </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative h-48 bg-muted">
            <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
            {bannerPreview && <Image
                src={bannerPreview}
                alt="Pré-visualização do Banner"
                layout="fill"
                objectFit="cover"
            />}
            <div className="absolute top-0 left-0 w-full h-full bg-black/30 flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className='text-white rounded-full bg-black/50 hover:bg-black/70' onClick={() => bannerInputRef.current?.click()}><Camera className="h-5 w-5" /></Button>
                 {bannerPreview && <Button variant="ghost" size="icon" className='text-white rounded-full bg-black/50 hover:bg-black/70' onClick={() => {setBannerPreview(null); setBannerFile(null);}}><X className="h-5 w-5" /></Button>}
            </div>
        </div>
        <div className="px-4">
            <div className="-mt-16 relative w-32">
                <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                <Avatar className="h-32 w-32 border-4 border-background">
                    {avatarPreview && <AvatarImage src={avatarPreview} alt="Pré-visualização do Avatar" />}
                    <AvatarFallback className="text-4xl">{name ? name.substring(0,2) : <ImageIcon />}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <Camera className="h-6 w-6 text-white" />
                </div>
            </div>
        </div>

        <div className="p-4 mt-4 space-y-8">
            <div className="grid gap-1.5">
                <Label htmlFor="name">Nome da Comunidade</Label>
                <Input 
                    id="name"
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg" 
                    placeholder="Ex: Amantes de Café"
                    disabled={isLoading}
                />
            </div>
             <div className="grid gap-1.5">
                <Label htmlFor="topic">Tópico</Label>
                <Textarea 
                    id="topic" 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)}
                    rows={3}
                    className="text-lg"
                    placeholder="Sobre o que é a sua comunidade?"
                    disabled={isLoading}
                />
            </div>
        </div>
      </main>
    </div>
  );
}
