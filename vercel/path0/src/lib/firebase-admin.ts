import * as admin from 'firebase-admin';

// This function ensures that the Firebase Admin SDK is initialized only once.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // This method uses Application Default Credentials,
            // which is the preferred method for production environments like Vercel.
            // It will automatically look for the credentials from the environment variables
            // set up by the Vercel-Firebase integration or `GOOGLE_APPLICATION_CREDENTIALS`.
            admin.initializeApp();
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
