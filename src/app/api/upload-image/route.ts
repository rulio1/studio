
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'Nenhuma imagem fornecida.' }, { status: 400 });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      console.error("IMGBB_API_KEY não está definida nas variáveis de ambiente.");
      return NextResponse.json({ error: 'O servidor não está configurado para upload de imagens.' }, { status: 500 });
    }

    // O ImgBB espera que a imagem seja enviada como form-data.
    // A imagem em base64 precisa ser extraída e enviada corretamente.
    const base64Data = image.split(',')[1];
    const formData = new FormData();
    formData.append('image', base64Data);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Erro no upload para o ImgBB:', errorBody);
        return NextResponse.json({ error: 'Falha no upload da imagem para o serviço externo.' }, { status: response.status });
    }

    const result = await response.json();

    if (result.data && result.data.url) {
      return NextResponse.json({ imageUrl: result.data.url });
    } else {
      return NextResponse.json({ error: 'Falha ao obter URL da imagem após o upload.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro interno na API de upload:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
