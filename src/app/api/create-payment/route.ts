
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Ensure the Stripe secret key is set in environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { priceId, userId, userEmail } = await req.json();

    if (!priceId || !userId || !userEmail) {
      return NextResponse.json({ error: 'Missing required parameters: priceId, userId, userEmail' }, { status: 400 });
    }

    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/profile/${userId}?payment_success=true`,
      cancel_url: `${YOUR_DOMAIN}/supporter?payment_canceled=true`,
      // Pass metadata to identify the user on webhook events
      metadata: {
        userId: userId,
      },
      customer_email: userEmail,
    });

    if (session.url) {
      return NextResponse.json({ url: session.url }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
