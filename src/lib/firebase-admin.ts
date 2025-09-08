
// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// Esta função garante que o Firebase Admin SDK seja inicializado apenas uma vez.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // Este método usa as Credenciais Padrão do Aplicativo (Application Default Credentials),
            // que é o método preferido para ambientes de produção como o Vercel.
            // Ele buscará automaticamente as credenciais das variáveis de ambiente
            // configuradas pela integração Vercel-Firebase ou `GOOGLE_APPLICATION_CREDENTIALS`.
            admin.initializeApp();
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            // Lançar o erro pode ajudar a depurar problemas durante a implantação
            throw new Error('Falha na inicialização do Firebase Admin SDK.');
        }
    }
    return {
        auth: admin.auth(),
        db: admin.firestore(),
    };
};

export { initializeFirebaseAdmin };
