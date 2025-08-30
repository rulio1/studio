
import { stripe } from '@/lib/stripe';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { userId } = await req.json();

    if (!userId) {
        return new NextResponse(JSON.stringify({ error: 'Usuário não autenticado.' }), { status: 401 });
    }

    try {
        const { db } = initializeFirebaseAdmin();
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
