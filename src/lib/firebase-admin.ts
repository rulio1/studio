import * as admin from 'firebase-admin';

// This function ensures that the Firebase Admin SDK is initialized only once.
const initializeFirebaseAdmin = () => {
    // Check if the app is already initialized to prevent errors
    if (admin.apps.length === 0) {
        // Validate that all required environment variables are present
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            const missingVars = [
                !projectId && "FIREBASE_PROJECT_ID",
                !clientEmail && "FIREBASE_CLIENT_EMAIL",
                !privateKey && "FIREBASE_PRIVATE_KEY"
            ].filter(Boolean).join(", ");
            
            console.error(`Firebase admin initialization error: Missing environment variables: ${missingVars}`);
            // In a real app, you might want to throw an error or handle this differently
            // For now, we return null to indicate failure.
            return null;
        }

        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    // The private key from Vercel's env vars might have escaped newlines
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            return null; // Return null on failure
        }
    }
    
    // Return the initialized services
    return {
        auth: admin.auth(),
        db: admin.firestore(),
    };
};

export { initializeFirebaseAdmin };
