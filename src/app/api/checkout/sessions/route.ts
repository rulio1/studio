
import { stripe } from '@/lib/stripe/server';
import { NextRequest, NextResponse } from 'next/server';

const plans = {
    pro: {
        priceId: 'price_1Pg9t2Rp9YDOkH5QyQc5gP2Z',
        name: 'Zispr Pro',
        description: 'Plano Pro para criadores de conteúdo.',
    },
    business: {
        priceId: 'price_1Pg9uNRp9YDOkH5Qm8o2K4Vq',
        name: 'Zispr Business',
        description: 'Plano Business para empresas.',
    },
}

export async function POST(req: NextRequest) {
    const { plan, userId } = await req.json();

    if (!userId) {
        return new NextResponse(JSON.stringify({ error: 'Usuário não autenticado.' }), { status: 401 });
    }
    
    if (!plan || !(plan in plans)) {
        return new NextResponse(JSON.stringify({ error: 'Plano inválido.' }), { status: 400 });
    }
    
    const selectedPlan = plans[plan as keyof typeof plans];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: selectedPlan.priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${baseUrl}/home?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/pricing`,
            client_reference_id: userId,
             subscription_data: {
                metadata: {
                    userId: userId,
                    plan: plan,
                }
            }
        });

        return new NextResponse(JSON.stringify({ sessionId: session.id }), { status: 200 });

    } catch (err) {
        const error = err as Error;
        console.error(error.message);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
