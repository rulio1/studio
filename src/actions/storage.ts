
'use server';

import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { app } from "@/lib/firebase";

const storage = getStorage(app);

export async function uploadImageAndGetURL(imageDataUri: string, userId: string): Promise<string> {
    if (!imageDataUri.startsWith('data:image')) {
        throw new Error('Invalid data URI');
    }

    try {
        const fileType = imageDataUri.split(';')[0].split('/')[1] || 'png';
        const fileName = `${userId}/${uuidv4()}.${fileType}`;
        const storageRef = ref(storage, fileName);

        // O 'uploadString' com 'data_url' é a forma correta de fazer upload de um data URI.
        const snapshot = await uploadString(storageRef, imageDataUri, 'data_url');
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;

    } catch (error) {
        console.error("Error uploading image: ", error);
        throw new Error("Failed to upload image.");
    }
}
