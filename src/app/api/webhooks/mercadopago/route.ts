
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Apenas para log, para que você possa ver os eventos chegando
    console.log('Mercado Pago Webhook Received:', body);

    if (body.type === 'payment') {
      const payment = body.data;
      // TODO: Obter os detalhes do pagamento para verificar o status
      // const paymentDetails = await mercadopago.payment.findById(payment.id);
      
      // if (paymentDetails.body.status === 'approved') {
      //   const userId = paymentDetails.body.external_reference;
      //   const tier = paymentDetails.body.description; // Precisa ser ajustado com base no que é enviado
        
      //   if (userId) {
      //     const userRef = doc(db, 'users', userId);
          
      //     // Atualize o perfil do usuário com base no 'tier'
      //     // Exemplo:
      //     await updateDoc(userRef, {
      //       isVerified: true,
      //       supporterTier: tier
      //     });

      //     console.log(`User ${userId} updated to supporter tier: ${tier}`);
      //   }
      // }
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('Error handling Mercado Pago webhook:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
