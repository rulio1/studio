
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Resend } from 'resend';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN as string });
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


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === 'payment') {
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: data.id });
        
        if (paymentInfo && paymentInfo.status === 'approved') {
            const userId = paymentInfo.external_reference;
            const tierTitle = paymentInfo.additional_info?.items?.[0]?.title as TierName;
            const userEmail = paymentInfo.payer?.email;

            if (!userId || !tierTitle || !userEmail) {
                console.error('Webhook Error: Missing required data in payment notification.');
                return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
            }

            const badgeTier = tierToBadge[tierTitle] || 'bronze';

            try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    isVerified: true, 
                    supporterTier: tierTitle,
                    badgeTier: badgeTier,
                    lastPaymentDate: serverTimestamp(),
                });
                console.log(`✅ User ${userId} successfully marked as supporter with ${badgeTier} badge.`);

                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();
                if (userData) {
                   await sendWelcomeEmail(userEmail, userData.displayName, tierTitle);
                }

            } catch (dbError) {
                console.error('Firestore update error:', dbError);
                return NextResponse.json({ status: 'error', message: 'Database update failed' }, { status: 200 });
            }
        }
    }
    
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
      console.error('Mercado Pago Webhook Error:', error.message);
      return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }
}
