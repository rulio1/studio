
// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// Esta função garante que o Firebase Admin SDK seja inicializado apenas uma vez.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // Este método usa as Credenciais Padrão do Aplicativo (Application Default Credentials),
            // que é o método preferido para ambientes de produção. Ele buscará automaticamente
            // as credenciais e configurações do projeto do ambiente.
            admin.initializeApp();
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            // Lançar o erro pode ajudar a depurar problemas durante a implantação
            throw new Error('Falha na inicialização do Firebase Admin SDK.');
        }
    }
    return admin;
};

const adminApp = initializeFirebaseAdmin();
export const adminAuth = adminApp.auth();
export const adminDb = adminApp.firestore();
export const adminStorage = adminApp.storage();
