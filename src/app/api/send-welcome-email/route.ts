
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'E-mail e nome são obrigatórios' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Zispr <zispr@zispr.com>',
      to: [email],
      subject: 'Bem-vindo(a) ao Zispr!',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h1 style="color: #007bff; text-align: center;">Bem-vindo(a) ao Zispr, ${name}!</h1>
                <p>Estamos muito felizes por ter você na nossa comunidade. Zispr é o lugar para se conectar, compartilhar e descobrir o que está acontecendo no mundo.</p>
                <p>O que você pode fazer agora?</p>
                <ul style="list-style-type: none; padding: 0;">
                    <li style="margin-bottom: 10px;">🐦 <strong>Explore o feed:</strong> Veja o que os outros estão falando.</li>
                    <li style="margin-bottom: 10px;">✍️ <strong>Faça seu primeiro post:</strong> Compartilhe suas ideias com o mundo.</li>
                    <li style="margin-bottom: 10px;">🎨 <strong>Personalize seu perfil:</strong> Adicione uma bio, uma foto de perfil e um banner para que os outros possam te encontrar.</li>
                </ul>
                <p style="text-align: center; margin-top: 20px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/home" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Comece a explorar</a>
                </p>
                <p style="font-size: 0.9em; color: #777; margin-top: 20px;">Se você não se cadastrou no Zispr, por favor, ignore este e-mail.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8em; color: #aaa; text-align: center;">© 2025 Zispr, Inc.</p>
            </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'E-mail enviado com sucesso!', data }, { status: 200 });

  } catch (error: any) {
    console.error('API send-welcome-email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
