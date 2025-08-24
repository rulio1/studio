
'use client';

import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import Image from 'next/image';

interface ImageViewerProps {
  src: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function ImageViewer({ src, onOpenChange }: ImageViewerProps) {
  if (!src) return null;

  return (
    <Dialog open={!!src} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-black/80 backdrop-blur-sm border-0 p-2 h-screen w-screen max-w-full flex items-center justify-center"
        hideCloseButton={true}
      >
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 hover:text-white rounded-full"
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Fechar</span>
          </Button>
        </DialogClose>
        <div className="relative w-full h-full">
          <Image
            src={src}
            alt="Visualização de imagem em tela cheia"
            layout="fill"
            objectFit="contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
