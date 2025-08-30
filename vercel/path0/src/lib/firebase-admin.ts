import * as admin from 'firebase-admin';

// This function ensures that the Firebase Admin SDK is initialized only once.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
                }),
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
    };
};

export { initializeFirebaseAdmin };
