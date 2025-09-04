
import { NextResponse } from 'next/server';
import { GoCardlessClient, GoCardlessEnvironments } from 'gocardless-nodejs';
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

const client = new GoCardlessClient({
    accessToken: process.env.GOCARDLESS_ACCESS_TOKEN!,
    environment: (process.env.GOCARDLESS_ENVIRONMENT === 'sandbox' 
        ? GoCardlessEnvironments.Sandbox 
        : GoCardlessEnvironments.Live),
});

export async function POST(req: Request) {
    if (req.method !== 'POST') {
        return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
    }

    try {
        const body = await req.json();
        const { amount, currency, tier, userId, userEmail } = body;

        if (!amount || !currency || !tier || !userId || !userEmail) {
            return NextResponse.json({ error: { message: 'Missing required parameters' } }, { status: 400 });
        }
        
        const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: { message: 'User not found.' } }, { status: 404 });
        }
        const userData = userDoc.data();

        const billingRequest = await client.billingRequests.create({
            payment_request: {
                description: `Zispr - ${tier}`,
                amount: amount,
                currency: currency,
                app_fee: Math.floor(amount * 0.01), // 1% app fee, for example
            },
            mandate_request: {
                scheme: 'bacs', // Example for UK, adjust as needed for BR
            },
            metadata: {
                firebaseUID: userId,
                tier: tier,
            },
            redirect_uri: `${YOUR_DOMAIN}/profile/${userId}?payment_success=true&gocardless=true`,
            customer: {
                given_name: userData?.displayName.split(' ')[0],
                family_name: userData?.displayName.split(' ').slice(1).join(' '),
                email: userEmail,
            }
        });

        const { id, authorisation_url } = billingRequest;

        if (!authorisation_url) {
            throw new Error("GoCardless authorization URL not created.");
        }

        return NextResponse.json({ redirectUrl: authorisation_url }, { status: 200 });

    } catch (error: any) {
        console.error('GoCardless session creation error:', error);
        return NextResponse.json({ error: { message: error.message || 'An internal server error occurred.' } }, { status: 500 });
    }
}
