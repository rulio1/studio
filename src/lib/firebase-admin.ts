
'use server';

import * as admin from 'firebase-admin';

// Esta função garante que o Firebase Admin SDK seja inicializado apenas uma vez.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // O SDK do Firebase Admin procurará automaticamente as variáveis de ambiente
            // FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY
            // quando `initializeApp` é chamado sem argumentos em um ambiente de servidor.
            admin.initializeApp({
                storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
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
