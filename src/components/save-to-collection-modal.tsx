
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Loader2, Bookmark, PlusCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/hooks/use-translation';

interface Collection {
    id: string;
    name: string;
    postIds: string[];
}

interface ZisprUser {
    collections?: Collection[];
}

interface SaveToCollectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postId: string;
    currentUser: FirebaseUser;
}

export default function SaveToCollectionModal({ open, onOpenChange, postId, currentUser }: SaveToCollectionModalProps) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [zisprUser, setZisprUser] = useState<ZisprUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');


    useEffect(() => {
        if (!currentUser) return;
        setIsLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setZisprUser(doc.data() as ZisprUser);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleToggleSave = async (collectionId: string) => {
        setIsSaving(true);
        const userRef = doc(db, 'users', currentUser.uid);
        const collection = zisprUser?.collections?.find(c => c.id === collectionId);
        const isCurrentlySaved = collection?.postIds.includes(postId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "Usuário não existe!";

                const collections = (userDoc.data().collections || []) as Collection[];
                const collectionIndex = collections.findIndex(c => c.id === collectionId);

                if (collectionIndex === -1) throw "Coleção não encontrada!";

                const postIds = collections[collectionIndex].postIds || [];
                const isPostInCollection = postIds.includes(postId);

                if (isPostInCollection) {
                    collections[collectionIndex].postIds = postIds.filter(id => id !== postId);
                } else {
                    collections[collectionIndex].postIds.push(postId);
                }
                
                transaction.update(userRef, { collections });
            });
            
             toast({
                title: t('collections.toasts.saveSuccess.title'),
                description: isCurrentlySaved ? t('collections.toasts.saveSuccess.removed') : t('collections.toasts.saveSuccess.added'),
            });

        } catch (error) {
            console.error("Erro ao salvar post:", error);
            toast({ title: t('collections.toasts.saveError.title'), description: t('collections.toasts.saveError.description'), variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCreateAndAdd = async () => {
        if (!newCollectionName.trim()) return;
        setIsSaving(true);
        const userRef = doc(db, 'users', currentUser.uid);
        const newCollectionId = uuidv4();

         try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "Usuário não existe!";

                const collections = (userDoc.data().collections || []) as Collection[];
                
                const newCollection: Collection = {
                    id: newCollectionId,
                    name: newCollectionName,
                    postIds: [postId]
                };

                collections.push(newCollection);
                transaction.update(userRef, { collections });
            });
            
            toast({
                title: t('collections.createModal.success.title'),
                description: t('collections.createModal.success.descriptionWithSave', { name: newCollectionName }),
            });
            setIsCreateModalOpen(false);
            setNewCollectionName('');

        } catch (error) {
            console.error("Erro ao criar coleção:", error);
            toast({ title: "Erro", description: "Não foi possível criar a coleção.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }
    
    // Ensure "Todos os posts salvos" is always first and exists
    const sortedCollections = [...(zisprUser?.collections || [])];
    let allSaved = sortedCollections.find(c => c.id === 'all_saved');
    if (!allSaved) {
        allSaved = { id: 'all_saved', name: 'Todos os posts salvos', postIds: [] };
        sortedCollections.unshift(allSaved);
    } else {
        sortedCollections.sort((a, b) => {
            if (a.id === 'all_saved') return -1;
            if (b.id === 'all_saved') return 1;
            return a.name.localeCompare(b.name);
        });
    }


    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-lg rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{t('collections.saveModal.title')}</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                        {sortedCollections.map(collection => {
                             const isSavedInThisCollection = collection.postIds.includes(postId);
                             const collectionName = collection.id === 'all_saved' ? t('collections.allSaved') : collection.name;
                             return (
                                <button
                                    key={collection.id}
                                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted rounded-lg"
                                    onClick={() => handleToggleSave(collection.id)}
                                    disabled={isSaving}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                            <Bookmark className={`h-6 w-6 ${isSavedInThisCollection ? 'text-primary fill-current' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{collectionName}</p>
                                            <p className="text-sm text-muted-foreground">{collection.postIds?.length || 0} {t('collections.postsCount')}</p>
                                        </div>
                                    </div>
                                    {isSavedInThisCollection && <Check className="h-5 w-5 text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                )}
                 <DialogFooter className="mt-4">
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                           onOpenChange(false);
                           setTimeout(() => setIsCreateModalOpen(true), 150);
                        }}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('collections.saveModal.newCollectionButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
             <DialogContent>
                 <DialogHeader>
                    <DialogTitle>{t('collections.createAndSaveModal.title')}</DialogTitle>
                 </DialogHeader>
                 <input
                    placeholder={t('collections.createAndSaveModal.placeholder')}
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="w-full p-2 border rounded-md"
                 />
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('profile.dialogs.cancel')}</Button>
                    <Button onClick={handleCreateAndAdd} disabled={isSaving || !newCollectionName.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('collections.createAndSaveModal.saveButton')}
                    </Button>
                 </DialogFooter>
             </DialogContent>
        </Dialog>
        </>
    );
}
