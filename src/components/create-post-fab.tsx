
'use client';

import { useState } from 'react';
import { Feather, MailPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreatePostModal from './create-post-modal';
import { usePathname } from 'next/navigation';
import NewMessageModal from './new-message-modal';
import { useUserStore } from '@/store/user-store';
import { useTranslation } from '@/hooks/use-translation';

export default function CreatePostFAB() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
    const pathname = usePathname();
    const { user } = useUserStore();
    const { t } = useTranslation();

    const openModal = () => {
        setIsModalOpen(true);
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
                        aria-label={t('createPostFab.newMessage')}
                        className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground"
                    >
                        <MailPlus className="h-7 w-7" />
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
            <div className="fixed bottom-24 right-4 z-50">
                <Button
                    onClick={openModal}
                    className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                    aria-label={t('createPostFab.createPost')}
                >
                   <Feather className="h-7 w-7" />
                </Button>
            </div>
            
            <CreatePostModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
            
        </>
    );
}
