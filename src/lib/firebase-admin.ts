import * as admin from 'firebase-admin';

// Check if the required environment variables are set.
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  // This check provides a clearer error message during development if the .env.local file is missing credentials.
  // In production (Vercel), these variables must be set in the project's environment variables settings.
  if (process.env.NODE_ENV === 'development') {
    console.error("Firebase Admin credentials not set. Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are in your .env.local file.");
  }
}

// This function ensures that Firebase Admin is initialized only once.
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key needs to have its escaped newlines replaced with actual newlines.
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error);
    // Re-throw the error to make sure build/runtime fails clearly if initialization is impossible.
    throw new Error('Firebase Admin SDK initialization failed.');
  }
};

const firebaseAdmin = initializeFirebaseAdmin();

export const db = admin.firestore();
export const auth = admin.auth();
