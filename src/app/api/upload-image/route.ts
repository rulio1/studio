// src/app/api/upload-image/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body; // image is expected to be a base64 string

    if (!image) {
      return NextResponse.json({ error: 'Nenhuma imagem fornecida.' }, { status: 400 });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      console.error("A chave da API do ImgBB não está configurada.");
      return NextResponse.json({ error: 'O serviço de upload de imagens não está configurado no servidor.' }, { status: 500 });
    }

    // A imagem vem como 'data:image/jpeg;base64,....', precisamos remover o prefixo.
    const base64Data = image.split(',')[1];

    const formData = new FormData();
    formData.append('image', base64Data);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro na API do ImgBB:", errorData);
        return NextResponse.json({ error: 'Falha ao fazer upload da imagem para o serviço externo.' }, { status: response.status });
    }
    
    const result = await response.json();

    if (result.success) {
      return NextResponse.json({ imageUrl: result.data.url });
    } else {
      return NextResponse.json({ error: 'Falha ao processar a imagem após o upload.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro interno no endpoint de upload:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
