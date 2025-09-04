'use server';

import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

try {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    }
    db = admin.firestore();
    auth = admin.auth();
} catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
}

// @ts-ignore
export { db, auth };
