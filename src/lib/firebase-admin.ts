
import * as admin from 'firebase-admin';

// This function ensures that the Firebase Admin SDK is initialized only once.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (!projectId) {
                throw new Error('Firebase Admin SDK: FIREBASE_PROJECT_ID environment variable is not set.');
            }
            if (!clientEmail) {
                throw new Error('Firebase Admin SDK: FIREBASE_CLIENT_EMAIL environment variable is not set.');
            }
            if (!privateKey) {
                throw new Error('Firebase Admin SDK: FIREBASE_PRIVATE_KEY environment variable is not set.');
            }
            
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    // Replace literal \n with actual newlines
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
                storageBucket: `${projectId}.appspot.com`
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error:', error.message);
            // Throw a more specific error to help with debugging
            throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
        }
    }
    return {
        auth: admin.auth(),
        db: admin.firestore(),
        storage: admin.storage(),
    };
};

export { initializeFirebaseAdmin };
