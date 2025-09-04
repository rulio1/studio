'use client';

import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X, MessageCircle, Repeat, Heart, BarChart2, Upload, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface PostForViewer {
    id: string;
    image?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
}

interface ImageViewerProps {
  post: PostForViewer | null;
  onOpenChange: (open: boolean) => void;
}

export default function ImageViewer({ post, onOpenChange }: ImageViewerProps) {
  const handleClose = () => onOpenChange(false);
  const src = post?.image;

  return (
    <AnimatePresence>
      {post && src && (
        <Dialog open={!!post} onOpenChange={onOpenChange}>
          <DialogPortal>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <DialogOverlay className="bg-black/80" />
            </motion.div>
            <DialogContent
              className="bg-transparent border-0 p-0 h-full w-full max-w-full flex flex-col items-center justify-center outline-none"
              hideCloseButton={true}
            >
              <DialogHeader className="sr-only">
                  <DialogTitle>Visualização de Imagem</DialogTitle>
              </DialogHeader>
              
               <motion.div 
                    className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center z-50"
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="text-white hover:bg-white/20 hover:text-white rounded-full h-10 w-10"
                    >
                        <X className="h-6 w-6" />
                        <span className="sr-only">Fechar</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { /* Lógica para Mais opções */ }}
                        className="text-white hover:bg-white/20 hover:text-white rounded-full h-10 w-10"
                    >
                        <MoreHorizontal className="h-6 w-6" />
                         <span className="sr-only">Mais opções</span>
                    </Button>
                </motion.div>


              <motion.div
                className="relative w-full h-full flex items-center justify-center"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.8}
                onDragEnd={(event, info) => {
                  if (Math.abs(info.offset.y) > 150) {
                    handleClose();
                  }
                }}
              >
                <motion.div
                  className="relative w-full max-w-4xl h-auto"
                   initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <Image
                    src={src}
                    alt="Visualização de imagem em tela cheia"
                    width={1024}
                    height={1024}
                    className="object-contain w-full h-auto max-h-[80vh] rounded-lg"
                    draggable={false}
                  />
                </motion.div>
              </motion.div>
              
                <motion.div 
                    className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                   <div className="flex justify-around text-white/80 max-w-sm mx-auto">
                        <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white">
                            <MessageCircle className="h-5 w-5" />
                            <span>{post.comments}</span>
                        </Button>
                        <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white">
                            <Repeat className="h-5 w-5" />
                             <span>{post.retweets.length}</span>
                        </Button>
                        <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white">
                            <Heart className="h-5 w-5" />
                             <span>{post.likes.length}</span>
                        </Button>
                         <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white">
                            <BarChart2 className="h-5 w-5" />
                             <span>{post.views}</span>
                        </Button>
                        <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white">
                            <Upload className="h-5 w-5" />
                        </Button>
                    </div>
                </motion.div>

            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
