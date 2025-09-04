
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session?.metadata?.userId;
      if (!userId) {
        console.error('Webhook Error: Missing userId in session metadata.');
        return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });
      }

      try {
        // Update the user's document in Firestore to mark them as verified/supporter
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          isVerified: true, // or a specific supporter tier
          supporterTier: 'VIP', // Example: you can get this from session metadata too
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        });
        console.log(`✅ User ${userId} successfully marked as supporter.`);
      } catch (dbError) {
        console.error('Firestore update error:', dbError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
      break;
    
    // Add other event types to handle here (e.g., subscription updates/cancellations)
    // case 'customer.subscription.deleted':
    //   // handle subscription cancellation
    //   break;

    default:
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
