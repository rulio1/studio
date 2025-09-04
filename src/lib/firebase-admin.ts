
'use server';

import * as admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // As credenciais são lidas automaticamente das variáveis de ambiente
            // no Vercel/Firebase Hosting. Não é mais necessário o credential.cert().
            admin.initializeApp();
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            throw new Error('Firebase Admin SDK initialization failed.');
        }
    }
    // Retorna as instâncias do db e auth do admin
    return {
        db: admin.firestore(),
        auth: admin.auth(),
    };
};

// Exporta o db diretamente para uso nos webhooks
const { db } = initializeFirebaseAdmin();

export { initializeFirebaseAdmin, db };
