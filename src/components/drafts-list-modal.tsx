
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import Image from 'next/image';
import { formatTimeAgo } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Post {
    id: string;
    content: string;
    image?: string;
    lastSavedAt?: any;
    replySettings?: 'everyone' | 'following' | 'mentioned';
}

interface DraftsListModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUser: FirebaseUser;
    onSelectDraft: (draft: Post) => void;
}

export default function DraftsListModal({ open, onOpenChange, currentUser, onSelectDraft }: DraftsListModalProps) {
    const [drafts, setDrafts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !currentUser) {
            setDrafts([]);
            return;
        }

        setIsLoading(true);
        // Adjusted query to remove server-side ordering to avoid needing a composite index.
        const q = query(
            collection(db, "posts"),
            where("authorId", "==", currentUser.uid),
            where("status", "==", "draft")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const draftsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            
            // Sort drafts on the client-side
            draftsData.sort((a, b) => {
                const timeA = a.lastSavedAt?.toMillis() || 0;
                const timeB = b.lastSavedAt?.toMillis() || 0;
                return timeB - timeA;
            });

            setDrafts(draftsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar rascunhos:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [open, currentUser]);

    const handleDelete = async () => {
        if (!draftToDelete) return;
        await deleteDoc(doc(db, "posts", draftToDelete));
        setDraftToDelete(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Rascunhos</DialogTitle>
                    </DialogHeader>
                    <div className="h-[400px] overflow-y-auto pr-2 -mr-2">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : drafts.length === 0 ? (
                            <div className="flex justify-center items-center h-full text-muted-foreground">
                                <p>Você não tem rascunhos salvos.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {drafts.map(draft => (
                                    <div key={draft.id} className="group flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer" onClick={() => onSelectDraft(draft)}>
                                        <div className="flex-1">
                                            <p className="line-clamp-2 text-sm">
                                                {draft.content || <span className="italic text-muted-foreground">Rascunho sem texto</span>}
                                            </p>
                                            {draft.image && (
                                                <div className="mt-2">
                                                    <Image src={draft.image} alt="Imagem do rascunho" width={60} height={60} className="rounded-md object-cover" />
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Salvo {draft.lastSavedAt ? formatTimeAgo(draft.lastSavedAt.toDate()) : 'recentemente'}
                                            </p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => { e.stopPropagation(); setDraftToDelete(draft.id); }}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!draftToDelete} onOpenChange={(isOpen) => !isOpen && setDraftToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Rascunho?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente este rascunho.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDraftToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
