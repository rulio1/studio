
'use client';

import { useState } from 'react';
import { Plus, Feather, ImageIcon, X, MailPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreatePostModal from './create-post-modal';
import { usePathname, useRouter } from 'next/navigation';
import NewMessageModal from './new-message-modal';
import { useAuth } from '@/hooks/use-auth';

export default function CreatePostFAB() {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'post' | 'image'>('post');
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const openModal = (mode: 'post' | 'image') => {
        setModalMode(mode);
        setIsModalOpen(true);
        setIsOpen(false);
    };

    const handleNewMessage = () => {
        setIsNewMessageModalOpen(true);
    };

    if (pathname === '/messages') {
        return (
            <>
                <div className="fixed bottom-24 right-4 z-50">
                    <Button
                        onClick={handleNewMessage}
                        aria-label="Nova Mensagem"
                        className="h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground"
                    >
                        <MailPlus className="h-8 w-8" />
                    </Button>
                </div>
                 {isNewMessageModalOpen && user && (
                    <NewMessageModal
                        open={isNewMessageModalOpen}
                        onOpenChange={setIsNewMessageModalOpen}
                        currentUser={user}
                    />
                )}
            </>
        )
    }

    return (
        <>
            <div className="fixed bottom-24 right-4 z-50 flex flex-col items-center gap-4">
                 <div
                    className={`flex flex-col items-center gap-4 transition-all duration-300 ease-in-out ${
                        isOpen ? 'opacity-100 -translate-y-4' : 'opacity-0 translate-y-0 pointer-events-none'
                    }`}
                >
                    <Button
                        onClick={() => openModal('image')}
                        aria-label="Post GIF or Image"
                        className="h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground"
                    >
                        <ImageIcon className="h-6 w-6" />
                    </Button>
                    <Button
                        onClick={() => openModal('post')}
                        aria-label="Create Post"
                        className="h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground"
                    >
                        <Feather className="h-6 w-6" />
                    </Button>
                </div>


                {/* Main FAB */}
                <Button
                    onClick={handleToggle}
                    className={`h-16 w-16 rounded-full shadow-lg transition-transform duration-300 ${isOpen ? 'bg-destructive hover:bg-destructive/90 rotate-45' : 'bg-primary hover:bg-primary/90'}`}
                    aria-expanded={isOpen}
                >
                   <Plus className="h-8 w-8" />
                </Button>
            </div>
            {isModalOpen && (
                <CreatePostModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    initialMode={modalMode}
                />
            )}
        </>
    );
}

    