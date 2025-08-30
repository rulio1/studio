
'use server';

import { stripe } from '@/lib/stripe/server';
import * as admin from 'firebase-admin';
import { headers } from 'next/headers';

// Helper function to initialize Firebase Admin SDK safely
const ensureFirebaseAdminInitialized = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase Admin SDK Initialization Error in Action:', error);
      // We are not re-throwing here to avoid crashing the server on every check,
      // but subsequent db calls will fail if initialization doesn't succeed.
    }
  }
  return admin.firestore();
};


const plans = {
    pro: {
        priceId: 'SEU_ID_DO_PLANO_PRO_AQUI',
        name: 'Zispr Pro',
        description: 'Plano Pro para criadores de conteúdo.',
    },
    business: {
        priceId: 'SEU_ID_DO_PLANO_BUSINESS_AQUI',
        name: 'Zispr Business',
        description: 'Plano Business para empresas.',
    },
};

export async function createCheckoutSession(planId: string, userId: string) {
    if (!userId) {
        return { sessionId: null, error: 'Usuário não autenticado.' };
    }
    
    if (!planId || !(planId in plans)) {
        return { sessionId: null, error: 'Plano inválido.' };
    }
    
    const selectedPlan = plans[planId as keyof typeof plans];
    const origin = headers().get('origin');
    const baseUrl = origin || 'http://localhost:3000';

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: selectedPlan.priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${baseUrl}/home?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/pricing`,
            client_reference_id: userId,
             subscription_data: {
                metadata: {
                    userId: userId,
                    plan: planId,
                }
            }
        });

        return { sessionId: session.id, error: null };

    } catch (err) {
        const error = err as Error;
        console.error('Stripe Checkout Error:', error.message);
        return { sessionId: null, error: error.message };
    }
}


export async function createPortalSession(userId: string) {
    const db = ensureFirebaseAdminInitialized();
    if (!userId) {
        return { url: null, error: 'Usuário não autenticado.' };
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return { url: null, error: 'Usuário não encontrado.' };
        }

        const userData = userDoc.data();
        const stripeCustomerId = userData?.stripeCustomerId;

        if (!stripeCustomerId) {
            return { url: null, error: 'ID de cliente do Stripe não encontrado.' };
        }
        
        const origin = headers().get('origin');
        const baseUrl = origin || 'http://localhost:3000';
        
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${baseUrl}/settings/account`,
        });

        return { url: portalSession.url, error: null };

    } catch (err) {
        const error = err as Error;
        console.error('Portal session error:', error.message);
        return { url: null, error: 'Não foi possível criar a sessão do portal do cliente.' };
    }
}
