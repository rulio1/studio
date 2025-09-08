
import { NextResponse } from 'next/server';

// Rota de API para buscar notícias de uma fonte externa.
// Esta implementação usa uma chave de API que pode expirar ou ter limites de uso.
// Para uma solução de produção, considere usar um serviço de notícias pago e robusto
// e armazenar a chave de API de forma segura como um segredo de ambiente.

export async function GET(request: Request) {
    // A chave da API está hardcoded para fins de demonstração.
    // Em um ambiente de produção, use variáveis de ambiente.
    const apiKey = '8a2c60b477d69f565fc7a37b90c330b3';

    try {
        // Busca as principais notícias do Brasil.
        const url = `https://gnews.io/api/v4/top-headlines?country=br&max=10&token=${apiKey}`;
        
        const newsResponse = await fetch(url, {
            next: { revalidate: 3600 } // Revalida a cada hora
        });

        if (!newsResponse.ok) {
            const errorBody = await newsResponse.json();
            console.error('GNews API Error:', errorBody);
            // Retorna uma resposta de erro clara se a API externa falhar.
            return NextResponse.json({ error: 'Failed to fetch news from provider' }, { status: newsResponse.status });
        }

        const newsData = await newsResponse.json();

        return NextResponse.json(newsData);

    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
