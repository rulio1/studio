
// A funcionalidade de webhook do Mercado Pago foi desativada temporariamente.
// Este arquivo será usado para a integração com o sistema de pagamento no futuro.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ status: 'ok' });
}
