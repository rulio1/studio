'use server';

import * as admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // Este método usa as Credenciais Padrão do Aplicativo (ADC)
            // que é o método preferido para ambientes de produção como a Vercel.
            // Ele buscará automaticamente as credenciais das variáveis de ambiente
            // configuradas pela integração Vercel-Firebase ou `GOOGLE_APPLICATION_CREDENTIALS`.
            admin.initializeApp();
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
