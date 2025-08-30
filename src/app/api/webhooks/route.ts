
import { stripe } from '@/lib/stripe/server';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// Helper function to initialize Firebase Admin SDK safely
const ensureFirebaseAdminInitialized = () => {
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
      console.error('Firebase Admin SDK Initialization Error in Webhook:', error.stack);
      // If it fails here, the subsequent Firestore calls will fail,
      // but we throw a clearer error to aid debugging during deployment.
      throw new Error('Firebase Admin SDK could not be initialized. Check server environment variables.');
    }
  }
  return admin.firestore();
};

export async function POST(req: NextRequest) {
    const sig = headers().get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig as string, endpointSecret);
    } catch (err: any) {
        console.error(`⚠️  Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const db = ensureFirebaseAdminInitialized();

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;

            const userId = session.client_reference_id;
            const customerId = session.customer as string;
            const subscriptionId = session.subscription as string;
            
            if (!userId) {
                console.error('Webhook Error: User ID not found in checkout session metadata.');
                break;
            }

            try {
                // Get plan from subscription
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const plan = subscription.items.data[0].price.lookup_key || subscription.items.data[0].price.id;

                const userRef = db.collection('users').doc(userId);
                await userRef.update({
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    subscriptionStatus: subscription.status,
                    subscriptionPlan: plan,
                    isVerified: true
                });
                console.log(`User ${userId} successfully subscribed to plan ${plan}.`);

            } catch (error) {
                console.error('Error updating user on checkout completion:', error);
            }
            break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            const subscription = event.data.object as Stripe.Subscription;
            const customerIdForUpdate = subscription.customer as string;
            
            try {
                const usersRef = db.collection('users');
                const q = usersRef.where('stripeCustomerId', '==', customerIdForUpdate).limit(1);
                const querySnapshot = await q.get();

                if (querySnapshot.empty) {
                    console.error('No user found with Stripe customer ID:', customerIdForUpdate);
                    break;
                }

                const userDoc = querySnapshot.docs[0];
                const newStatus = subscription.status;
                
                let plan = 'free';
                let isVerified = false;

                if (newStatus === 'active' || newStatus === 'trialing') {
                    plan = subscription.items.data[0].price.lookup_key || subscription.items.data[0].price.id;
                    isVerified = true;
                }
                
                await userDoc.ref.update({
                    subscriptionStatus: newStatus,
                    subscriptionPlan: plan,
                    isVerified: isVerified
                });

                console.log(`Subscription status for user ${userDoc.id} updated to ${newStatus}.`);

            } catch (error) {
                console.error('Error updating subscription status:', error);
            }
            break;
            
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
