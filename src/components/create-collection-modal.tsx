
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { Input } from './ui/input';
import { useTranslation } from '@/hooks/use-translation';

interface Collection {
    id: string;
    name: string;
    postIds: string[];
}

interface CreateCollectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUser: FirebaseUser;
}

export default function CreateCollectionModal({ open, onOpenChange, currentUser }: CreateCollectionModalProps) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({ title: t('collections.createModal.validation.emptyName'), variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const userRef = doc(db, 'users', currentUser.uid);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "Usuário não existe!";

                const collections = (userDoc.data().collections || []) as Collection[];
                
                if (collections.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
                    throw new Error(t('collections.createModal.validation.duplicateName'));
                }

                const newCollection: Collection = {
                    id: uuidv4(),
                    name: name.trim(),
                    postIds: []
                };

                collections.push(newCollection);
                transaction.update(userRef, { collections });
            });
            
            toast({
                title: t('collections.createModal.success.title'),
                description: t('collections.createModal.success.description', { name: name.trim() }),
            });
            setName('');
            onOpenChange(false);

        } catch (error: any) {
            console.error("Erro ao criar coleção:", error);
            toast({ title: "Erro", description: error.message || "Não foi possível criar a coleção.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('collections.createModal.title')}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder={t('collections.createModal.placeholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSaving}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSaving}>{t('profile.dialogs.cancel')}</Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={isSaving || !name.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('collections.createModal.createButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
