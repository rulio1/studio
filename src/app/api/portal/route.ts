import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }
  
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data()?.stripeCustomerId) {
      return NextResponse.json({ message: 'Stripe customer not found for this user.' }, { status: 404 });
    }

    const customerId = userDoc.data()?.stripeCustomerId;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${YOUR_DOMAIN}/settings/account`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: 'An error occurred creating the portal session.' }, { status: 500 });
  }
}
