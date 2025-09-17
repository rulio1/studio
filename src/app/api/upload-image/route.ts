
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image: base64Image } = body;
        
        if (!base64Image) {
            return NextResponse.json({ error: 'Nenhuma imagem fornecida.' }, { status: 400 });
        }

        const apiKey = process.env.IMGBB_API_KEY;

        if (!apiKey) {
             return NextResponse.json({ error: 'O serviço de upload de imagens não está configurado no servidor.' }, { status: 500 });
        }

        const formData = new FormData();
        // Remove a parte "data:image/png;base64," para enviar apenas os dados da imagem
        const pureBase64 = base64Image.substring(base64Image.indexOf(',') + 1);
        formData.append('image', pureBase64);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error('Falha no upload para o ImgBB:', result);
            return NextResponse.json({ error: 'Falha ao fazer upload da imagem para o serviço externo.' }, { status: 500 });
        }

        return NextResponse.json({ imageUrl: result.data.url });

    } catch (error) {
        console.error('Erro na rota de upload:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
