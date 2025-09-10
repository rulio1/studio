
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/user-store';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { Loader2, Library, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent as EditDialogContent, DialogHeader as EditDialogHeader, DialogTitle as EditDialogTitle, DialogFooter as EditDialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Collection {
    id: string;
    name: string;
    postIds: string[];
}

export default function CollectionsSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser, zisprUser } = useUserStore();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                const userCollections = (userData.collections || []).sort((a: Collection, b: Collection) => {
                    if (a.id === 'all_saved') return -1;
                    if (b.id === 'all_saved') return 1;
                    return a.name.localeCompare(b.name);
                });
                setCollections(userCollections);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleDeleteCollection = async (collectionId: string) => {
        if (!currentUser || collectionId === 'all_saved') {
            toast({ title: "Não é possível excluir a coleção padrão.", variant: "destructive" });
            return;
        }

        const userRef = doc(db, 'users', currentUser.uid);
        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "Usuário não existe!";

                const currentCollections = (userDoc.data().collections || []) as Collection[];
                const updatedCollections = currentCollections.filter(c => c.id !== collectionId);
                transaction.update(userRef, { collections: updatedCollections });
            });
            toast({ title: "Coleção excluída com sucesso." });
        } catch (error) {
            console.error("Error deleting collection:", error);
            toast({ title: "Erro ao excluir coleção.", variant: "destructive" });
        }
    };

    const openEditDialog = (collection: Collection) => {
        if (collection.id === 'all_saved') return;
        setEditingCollection(collection);
        setNewCollectionName(collection.name);
    };
    
    const handleRenameCollection = async () => {
        if (!currentUser || !editingCollection || !newCollectionName.trim()) return;

        setIsSaving(true);
        const userRef = doc(db, 'users', currentUser.uid);
        try {
             await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "Usuário não existe!";

                const currentCollections = (userDoc.data().collections || []) as Collection[];
                const collectionIndex = currentCollections.findIndex(c => c.id === editingCollection.id);
                
                if (collectionIndex === -1) throw "Coleção não encontrada.";

                currentCollections[collectionIndex].name = newCollectionName.trim();
                transaction.update(userRef, { collections: currentCollections });
            });
            toast({ title: "Coleção renomeada com sucesso." });
            setEditingCollection(null);
            setNewCollectionName('');
        } catch (error) {
            console.error("Error renaming collection:", error);
            toast({ title: "Erro ao renomear coleção.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <>
            <main className="flex-1 overflow-y-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Gerenciar Coleções</CardTitle>
                        <CardDescription>
                            Edite ou exclua suas coleções de posts salvos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : collections.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">
                                <Library className="mx-auto h-12 w-12 mb-4" />
                                <h3 className="font-bold text-lg text-foreground">Nenhuma coleção encontrada</h3>
                                <p className="text-sm">Quando você criar coleções, elas aparecerão aqui.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {collections.map(collection => (
                                    <div key={collection.id} className="flex items-center justify-between p-4 group">
                                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push(`/collections/${collection.id}`)}>
                                            <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                                <Library className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-bold group-hover:underline">{collection.name}</p>
                                                <p className="text-sm text-muted-foreground">{collection.postIds?.length || 0} posts</p>
                                            </div>
                                        </div>
                                        {collection.id !== 'all_saved' && (
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-5 w-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => openEditDialog(collection)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Renomear
                                                        </DropdownMenuItem>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Excluir
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Excluir &quot;{collection.name}&quot;?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Isso não excluirá os posts salvos. Eles permanecerão disponíveis em &quot;Todos os posts salvos&quot;. Essa ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteCollection(collection.id)} className="bg-destructive hover:bg-destructive/90">
                                                            Excluir
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Dialog open={!!editingCollection} onOpenChange={(open) => !open && setEditingCollection(null)}>
                <EditDialogContent>
                    <EditDialogHeader>
                        <EditDialogTitle>Renomear Coleção</EditDialogTitle>
                    </EditDialogHeader>
                    <div className="py-4">
                         <Input 
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            placeholder="Novo nome da coleção"
                            disabled={isSaving}
                        />
                    </div>
                    <EditDialogFooter>
                        <Button variant="outline" onClick={() => setEditingCollection(null)} disabled={isSaving}>Cancelar</Button>
                        <Button onClick={handleRenameCollection} disabled={isSaving || !newCollectionName.trim() || newCollectionName.trim() === editingCollection?.name}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </EditDialogFooter>
                </EditDialogContent>
            </Dialog>
        </>
    );
}
