
'use client';

import { useState } from 'react';
import { Plus, Feather, Film, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreatePostModal from './create-post-modal';

export default function CreatePostFAB() {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'post' | 'gif'>('post');

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const openModal = (mode: 'post' | 'gif') => {
        setModalMode(mode);
        setIsModalOpen(true);
        setIsOpen(false);
    };

    return (
        <>
            <div className="fixed bottom-20 right-4 z-50 flex flex-col items-center gap-4">
                 <div className={`relative flex flex-col items-center gap-4 transition-all duration-300 ${isOpen ? 'speed-dial-open' : ''}`}>
                    {/* GIF Button */}
                    <button
                        className="speed-dial-button opacity-0 transform-none"
                        onClick={() => openModal('gif')}
                        aria-label="Post GIF"
                    >
                        <div className="h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground">
                            <Film className="h-6 w-6" />
                        </div>
                    </button>
                     {/* Post Button */}
                     <button
                        className="speed-dial-button opacity-0 transform-none"
                        onClick={() => openModal('post')}
                        aria-label="Create Post"
                    >
                         <div className="h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground">
                            <Feather className="h-6 w-6" />
                        </div>
                    </button>
                </div>


                {/* Main FAB */}
                <Button
                    onClick={handleToggle}
                    className={`h-16 w-16 rounded-full shadow-lg transition-transform duration-300 ${isOpen ? 'bg-destructive hover:bg-destructive/90 main-fab-open' : 'bg-primary hover:bg-primary/90'}`}
                >
                   {isOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
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
