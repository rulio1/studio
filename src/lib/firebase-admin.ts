
'use server';

import * as admin from 'firebase-admin';
import credentials from './gcp-credentials.json';

// Esta função garante que o Firebase Admin SDK seja inicializado apenas uma vez.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // Assegura que as credenciais são formatadas corretamente
            const serviceAccount = credentials as admin.ServiceAccount;

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error:', error.message);
            // Lança um erro mais específico para ajudar na depuração
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
