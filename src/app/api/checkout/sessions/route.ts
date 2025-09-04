
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }
  
  try {
    const body = await req.json();
    const { priceId, userId, userEmail, tier } = body;

    if (!priceId || !userId || !userEmail || !tier) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Check if user already has a Stripe customer ID
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;

    // If not, create a new Stripe customer
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
                firebaseUID: userId,
            },
        });
        customerId = customer.id;
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
      }
    });

    return NextResponse.json({ sessionId: session.id }, { status: 200 });

  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
}
