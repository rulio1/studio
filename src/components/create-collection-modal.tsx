
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
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({ title: "Nome da coleção não pode ser vazio.", variant: "destructive" });
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
                    throw new Error("Uma coleção com este nome já existe.");
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
                title: "Coleção Criada!",
                description: `A coleção "${name.trim()}" foi criada com sucesso.`,
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
                    <DialogTitle>Criar Nova Coleção</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder="Nome da sua coleção"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSaving}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSaving}>Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={isSaving || !name.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
