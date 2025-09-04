
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicialize o cliente do Mercado Pago com seu Access Token
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN as string 
});

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { title, price, userId, userEmail } = await req.json();

    if (!title || !price || !userId || !userEmail) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const notification_url = `${YOUR_DOMAIN}/api/webhooks/mercadopago`;

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: userId,
            title: title,
            quantity: 1,
            unit_price: price,
            currency_id: 'BRL',
          },
        ],
        payer: {
            email: userEmail,
        },
        payment_methods: {
            enabled_payment_types: ['ticket', 'credit_card', 'debit_card', 'pix'],
            installments: 1,
        },
        back_urls: {
          success: `${YOUR_DOMAIN}/profile/${userId}?payment_success=true`,
          failure: `${YOUR_DOMAIN}/supporter?payment_canceled=true`,
          pending: `${YOUR_DOMAIN}/supporter?payment_pending=true`
        },
        notification_url: notification_url,
        external_reference: userId,
      },
    });

    return NextResponse.json({ id: result.id, init_point: result.init_point }, { status: 200 });

  } catch (error: any) {
    console.error('Mercado Pago preference creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
