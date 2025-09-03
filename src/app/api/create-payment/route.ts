
// A funcionalidade de pagamento foi desativada temporariamente.
// Este arquivo será usado para a integração com o sistema de pagamento no futuro.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Funcionalidade desativada temporariamente.' }, { status: 503 });
}
