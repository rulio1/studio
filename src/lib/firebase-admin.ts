'use server';

import * as admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // Este método é o preferido para ambientes de produção como Vercel/Firebase Hosting,
            // onde as credenciais são fornecidas como variáveis de ambiente.
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
                }),
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            throw new Error('Firebase Admin SDK initialization failed.');
        }
    }
    return {
        db: admin.firestore(),
        auth: admin.auth(),
    };
};

// Exporta o db e auth inicializados para uso em todo o backend.
const { db, auth } = initializeFirebaseAdmin();

export { initializeFirebaseAdmin, db, auth };
