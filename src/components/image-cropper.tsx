'use client';

import { useState, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from './ui/slider';
import { getCroppedImg } from '@/lib/crop-image';
import { useTranslation } from '@/hooks/use-translation';

export interface ImageCropperData {
  image: string;
  type: 'avatar' | 'banner';
}

interface ImageCropperProps {
  data: ImageCropperData;
  onComplete: (croppedImageUri: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ data, onComplete, onCancel }: ImageCropperProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !data.image) return;
    try {
      const croppedImage = await getCroppedImg(data.image, croppedAreaPixels);
      onComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  const isAvatar = data.type === 'avatar';
  const aspectRatio = isAvatar ? 1 / 1 : 16 / 9;

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{t('profile.edit.cropper.title')}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-96 bg-background">
          <Cropper
            image={data.image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={isAvatar ? 'round' : 'rect'}
            showGrid={false}
          />
        </div>
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
                <span className="text-sm">{t('profile.edit.cropper.zoom')}</span>
                <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoom(value[0])}
                />
            </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onCancel}>{t('profile.edit.cropper.cancel')}</Button>
          <Button onClick={handleSave}>{t('profile.edit.cropper.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
