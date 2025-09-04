
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type TierName = "Apoiador Básico" | "Apoiador VIP" | "Apoiador Patrocinador";

const tierToBadge: Record<TierName, 'bronze' | 'silver' | 'gold'> = {
    "Apoiador Básico": "bronze",
    "Apoiador VIP": "silver",
    "Apoiador Patrocinador": "gold",
};

const tierBenefits: Record<TierName, string> = {
    "Apoiador Básico": "<li>Selo de verificação Bronze no seu perfil.</li>",
    "Apoiador VIP": "<li>Selo de verificação Prata no seu perfil.</li><li>Opções avançadas de tema.</li><li>Acesso a novas features em primeira mão.</li>",
    "Apoiador Patrocinador": "<li>Selo de verificação Ouro no seu perfil.</li><li>Experiência sem anúncios.</li><li>Acesso ao Clube de Patrocinadores.</li><li>E muito mais!</li>",
}

async function sendWelcomeEmail(userEmail: string, userName: string, tierTitle: TierName) {
    const benefitsHtml = tierBenefits[tierTitle] || '';
    try {
        await resend.emails.send({
            from: 'Zispr <zispr@zispr.com>',
            to: userEmail,
            subject: 'Obrigado por se tornar um Apoiador do Zispr!',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Olá, ${userName}!</h2>
                    <p>Em nome de toda a equipe, muito obrigado por se tornar um <strong>${tierTitle}</strong>! Seu apoio é fundamental para o crescimento e a manutenção do Zispr como uma plataforma independente.</p>
                    <p>Você desbloqueou os seguintes benefícios:</p>
                    <ul>
                        ${benefitsHtml}
                    </ul>
                    <p>Seu selo já está ativo no seu perfil. Explore, conecte-se e aproveite sua experiência aprimorada!</p>
                    <p>Com gratidão,<br>Equipe Zispr</p>
                </div>
            `,
        });
        console.log(`✅ Welcome email sent to ${userEmail}`);
    } catch (error) {
        console.error("Resend API error:", error);
    }
}


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
            const userRef = doc(db, 'users', firebaseUID);
            const badgeTier = tierToBadge[tier as TierName] || 'bronze';

            await updateDoc(userRef, {
                isVerified: true,
                supporterTier: tier,
                badgeTier: badgeTier,
                stripeCustomerId: customerId,
                stripeSubscriptionId: session.subscription,
                stripePriceId: session.line_items?.data[0].price?.id,
                stripeCurrentPeriodEnd: new Date(session.expires_at * 1000), // Assuming expires_at is available
                lastPaymentDate: serverTimestamp(),
            });

            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();
            if (userData && userData.email) {
                await sendWelcomeEmail(userData.email, userData.displayName, tier as TierName);
            }

            console.log(`✅ User ${firebaseUID} successfully marked as supporter with ${badgeTier} badge.`);
        } catch (dbError) {
            console.error('Firestore update error:', dbError);
            // Return 200 to prevent Stripe from retrying a failed DB operation.
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

            if (subscription.status !== 'active') {
                 await updateDoc(userRef, {
                    isVerified: false,
                    supporterTier: null,
                    badgeTier: null,
                    stripeSubscriptionId: null,
                    stripePriceId: null,
                });
                console.log(`✅ Subscription for user ${userDoc.id} has been deactivated.`);
            }
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });
}

