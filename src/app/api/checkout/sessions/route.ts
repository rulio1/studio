
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import * as admin from 'firebase-admin';

// Esta função garante que o Firebase Admin seja inicializado apenas uma vez.
const initializeFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        try {
            // Usa as Credenciais Padrão do Aplicativo, ideal para ambientes como Vercel/GCP.
            admin.initializeApp();
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            throw new Error('Firebase Admin SDK initialization failed.');
        }
    }
    return admin.firestore();
};

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }
  
  try {
    const db = initializeFirebaseAdmin();
    const body = await req.json();
    const { priceId, userId, userEmail, tier } = body;

    if (!priceId || !userId || !userEmail || !tier) {
      return NextResponse.json({ error: { message: 'Missing required parameters' } }, { status: 400 });
    }

    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return NextResponse.json({ error: { message: 'User not found.' } }, { status: 404 });
    }

    let customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
        const customer = await stripe.customers.create({
            email: userEmail,
            name: userDoc.data()?.displayName,
            metadata: {
                firebaseUID: userId,
            },
        });
        customerId = customer.id;
        await userRef.update({ stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'pix'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer: customerId,
      success_url: `${YOUR_DOMAIN}/profile/${userId}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/supporter?payment_canceled=true`,
      metadata: {
        firebaseUID: userId,
        tier: tier,
      },
      subscription_data: {
        metadata: {
            firebaseUID: userId,
            tier: tier,
        }
      },
      currency: 'brl',
    });

    return NextResponse.json({ sessionId: session.id }, { status: 200 });

  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
}
