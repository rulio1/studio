
import { stripe } from '@/lib/stripe';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin SDK directly inside the API route
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
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
    return admin.firestore();
};

export async function POST(req: NextRequest) {
    const { userId } = await req.json();

    if (!userId) {
        return new NextResponse(JSON.stringify({ error: 'Usuário não autenticado.' }), { status: 401 });
    }

    try {
        const db = initializeFirebaseAdmin();
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
             return new NextResponse(JSON.stringify({ error: 'Usuário não encontrado.' }), { status: 404 });
        }

        const userData = userDoc.data();
        const stripeCustomerId = userData?.stripeCustomerId;

        if (!stripeCustomerId) {
            return new NextResponse(JSON.stringify({ error: 'ID de cliente do Stripe não encontrado.' }), { status: 400 });
        }
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${baseUrl}/settings/account`,
        });

        return new NextResponse(JSON.stringify({ url: portalSession.url }), { status: 200 });

    } catch (err) {
        const error = err as Error;
        console.error('Portal session error:', error.message);
        return new NextResponse(JSON.stringify({ error: 'Não foi possível criar a sessão do portal do cliente.' }), { status: 500 });
    }
}
