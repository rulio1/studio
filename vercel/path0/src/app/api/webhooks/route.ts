
import { stripe } from '@/lib/stripe';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

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

    const { db } = initializeFirebaseAdmin();

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

                // If subscription is still active (e.g. upgraded/downgraded), keep plan details.
                // If it's canceled, trialing, etc., revert to free.
                if (newStatus === 'active') {
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
