
'use client';

import { useState } from 'react';
import { Plus, Feather, ImageIcon, X } from 'lucide-react';
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
            <div className="fixed bottom-24 right-4 z-50 flex flex-col items-center gap-4">
                {/* Secondary Buttons Container */}
                <div
                    className={`flex flex-col items-center gap-4 transition-all duration-300 ease-in-out ${
                        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    {/* Post with GIF/Image Button */}
                     <div className={`transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-4'}`}>
                        <Button
                            onClick={() => openModal('gif')}
                            aria-label="Post GIF or Image"
                            className="h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground"
                        >
                            <ImageIcon className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Create Post Button */}
                     <div className={`transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-4'}`}>
                        <Button
                            onClick={() => openModal('post')}
                            aria-label="Create Post"
                            className="h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground"
                        >
                            <Feather className="h-6 w-6" />
                        </Button>
                    </div>
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
