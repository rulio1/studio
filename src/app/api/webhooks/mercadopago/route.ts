
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN as string });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === 'payment') {
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: data.id });
        
        if (paymentInfo && paymentInfo.status === 'approved') {
            const userId = paymentInfo.external_reference;
            const tier = paymentInfo.additional_info?.items?.[0]?.title;

            if (!userId) {
                console.error('Webhook Error: Missing userId in payment external_reference.');
                return NextResponse.json({ error: 'Missing userId in external_reference' }, { status: 400 });
            }

            try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    isVerified: true, 
                    supporterTier: tier || 'Unknown',
                    lastPaymentDate: serverTimestamp(),
                });
                console.log(`✅ User ${userId} successfully marked as supporter.`);
            } catch (dbError) {
                console.error('Firestore update error:', dbError);
                // Mesmo que o DB falhe, respondemos 200 para o MP não continuar tentando.
                // O erro será logado para análise manual.
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
