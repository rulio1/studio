
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Adicione o seu Access Token do Mercado Pago no seu arquivo .env.local
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("MERCADOPAGO_ACCESS_TOKEN is not defined in environment variables.");
}

const client = new MercadoPagoConfig({ accessToken });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, price, userId } = body;

    if (!title || !price || !userId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: `${userId}-${title.replace(/\s+/g, '-')}`,
            title: `Apoio Zispr - ${title}`,
            quantity: 1,
            unit_price: price,
            currency_id: 'BRL',
          },
        ],
        payer: {
            external_reference: userId,
        },
        back_urls: {
            success: `${process.env.NEXT_PUBLIC_BASE_URL}/home`,
            failure: `${process.env.NEXT_PUBLIC_BASE_URL}/supporter`,
            pending: `${process.env.NEXT_PUBLIC_BASE_URL}/supporter`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`
      },
    });

    return NextResponse.json({ id: result.id, init_point: result.init_point });

  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
