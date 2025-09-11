'use server';

import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

const storage = getStorage(app);

export async function uploadImageAndGetURL(imageDataUri: string, userId: string): Promise<string> {
    if (!imageDataUri.startsWith('data:image')) {
        throw new Error('Invalid data URI');
    }

    const fileType = imageDataUri.split(';')[0].split('/')[1];
    const fileName = `${userId}/${uuidv4()}.${fileType}`;
    const storageRef = ref(storage, fileName);

    try {
        const snapshot = await uploadString(storageRef, imageDataUri, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image: ", error);
        throw new Error("Failed to upload image.");
    }
}
