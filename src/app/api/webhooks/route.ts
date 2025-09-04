
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import * as admin from 'firebase-admin';

// Esta função garante que o Firebase Admin seja inicializado apenas uma vez.
if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } catch (error: any) {
        console.error('Firebase admin initialization error', error.stack);
    }
}

const db = admin.firestore();

type TierName = "Apoiador Básico" | "Apoiador VIP" | "Apoiador Patrocinador";

const tierToBadge: Record<TierName, 'bronze' | 'silver' | 'gold'> = {
    "Apoiador Básico": "bronze",
    "Apoiador VIP": "silver",
    "Apoiador Patrocinador": "gold",
};

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = headers().get('Stripe-Signature') as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`❌ Error message: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { firebaseUID, tier } = session.metadata || {};
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        
        if (!firebaseUID || !tier || !customerId) {
            console.error('Webhook Error: Missing metadata in session.', session);
            return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 });
        }

        try {
            const userRef = db.collection('users').doc(firebaseUID);
            const badgeTier = tierToBadge[tier as TierName] || 'bronze';

            await userRef.update({
                isVerified: true,
                supporterTier: tier,
                badgeTier: badgeTier,
                stripeCustomerId: customerId,
                stripeSubscriptionId: session.subscription,
                stripePriceId: session.line_items?.data[0].price?.id,
                stripeCurrentPeriodEnd: session.subscription ? new Date((await stripe.subscriptions.retrieve(session.subscription as string)).current_period_end * 1000) : null,
                lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ User ${firebaseUID} successfully marked as supporter with ${badgeTier} badge.`);
        } catch (dbError) {
            console.error('Firestore update error:', dbError);
            return NextResponse.json({ status: 'error', message: 'Database update failed' }, { status: 200 });
        }
    }
    
     if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        const usersRef = db.collection("users");
        const q = usersRef.where("stripeCustomerId", "==", customerId).limit(1);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userRef = userDoc.ref;

            if (subscription.status !== 'active' || subscription.cancel_at_period_end) {
                 await userRef.update({
                    isVerified: false,
                    supporterTier: null,
                    badgeTier: null,
                });
                console.log(`✅ Subscription for user ${userDoc.id} has been deactivated.`);
            }
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
