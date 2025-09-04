
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import * as admin from 'firebase-admin';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';


// Função para inicializar o Firebase Admin SDK se ainda não foi inicializado
const ensureFirebaseAdminInitialized = () => {
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            throw new Error('Firebase Admin SDK initialization failed.');
        }
    }
    return {
        db: admin.firestore(),
    };
};

type TierName = "Apoiador Básico" | "Apoiador VIP" | "Apoiador Patrocinador";

const tierToBadge: Record<TierName, 'bronze' | 'silver' | 'gold'> = {
    "Apoiador Básico": "bronze",
    "Apoiador VIP": "silver",
    "Apoiador Patrocinador": "gold",
};

export async function POST(req: NextRequest) {
    const { db } = ensureFirebaseAdminInitialized();
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
            const userRef = doc(db, 'users', firebaseUID);
            const badgeTier = tierToBadge[tier as TierName] || 'bronze';

            await updateDoc(userRef, {
                isVerified: true,
                supporterTier: tier,
                badgeTier: badgeTier,
                stripeCustomerId: customerId,
                stripeSubscriptionId: session.subscription,
                stripePriceId: session.line_items?.data[0].price?.id,
                stripeCurrentPeriodEnd: session.subscription ? new Date((await stripe.subscriptions.retrieve(session.subscription as string)).current_period_end * 1000) : null,
                lastPaymentDate: serverTimestamp(),
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

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("stripeCustomerId", "==", customerId), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(db, 'users', userDoc.id);

            if (subscription.status !== 'active' || subscription.cancel_at_period_end) {
                 await updateDoc(userRef, {
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
