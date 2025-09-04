
import { NextRequest, NextResponse } from 'next/server';
import { GoCardlessClient, GoCardlessEnvironments, Webhook, GoCardlessWebhook } from 'gocardless-nodejs';
import * as admin from 'firebase-admin';

// This function ensures that the Firebase Admin SDK is initialized only once.
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

const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET as string;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('webhook-signature') as string;
    
    try {
        const webhook = new GoCardlessWebhook.Webhook(body, webhookSecret);
        const events = webhook.parse();
        
        for (const event of events) {
            if (event.resource_type === 'billing_requests' && event.action === 'fulfilled') {
                const billingRequest = event.links.billing_request;
                if (!billingRequest) continue;

                // Fetch the full billing request to get metadata
                const client = new GoCardlessClient({
                    accessToken: process.env.GOCARDLESS_ACCESS_TOKEN!,
                    environment: (process.env.GOCARDLESS_ENVIRONMENT === 'sandbox' 
                        ? GoCardlessEnvironments.Sandbox 
                        : GoCardlessEnvironments.Live),
                });
                
                const fullBillingRequest = await client.billingRequests.find(billingRequest);
                
                const { firebaseUID, tier } = fullBillingRequest.metadata as {firebaseUID: string, tier: TierName};
                const customerId = fullBillingRequest.links.customer;
                
                if (!firebaseUID || !tier || !customerId) {
                    console.error('Webhook Error: Missing metadata in billing request.', fullBillingRequest);
                    continue;
                }
                
                const userRef = db.collection('users').doc(firebaseUID);
                const badgeTier = tierToBadge[tier] || 'bronze';

                await userRef.update({
                    isVerified: true,
                    supporterTier: tier,
                    badgeTier: badgeTier,
                    gocardlessCustomerId: customerId,
                    lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`✅ User ${firebaseUID} successfully marked as supporter with ${badgeTier} badge via GoCardless.`);
            }
        }

    } catch (err: any) {
        if (err instanceof GoCardlessWebhook.InvalidSignatureError) {
             console.error(`❌ GoCardless Webhook Error: Invalid signature`);
             return NextResponse.json({ error: 'Invalid signature' }, { status: 498 });
        }
        console.error(`❌ GoCardless Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
