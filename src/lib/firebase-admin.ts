
import * as admin from 'firebase-admin';

// This function ensures that the Firebase Admin SDK is initialized only once.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // Check if the environment variables are set
            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
                // This will be caught by the outer catch block
                throw new Error('Firebase Admin SDK environment variables are not set.');
            }
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: (process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n'),
                }),
                storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            // Throwing the error can help debug issues during deployment
            throw new Error('Firebase Admin SDK initialization failed.');
        }
    }
    return {
        auth: admin.auth(),
        db: admin.firestore(),
        storage: admin.storage(),
    };
};

export { initializeFirebaseAdmin };
