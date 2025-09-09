import { NextResponse } from 'next/server';

// Rota de API para buscar notícias do serviço do IBGE.
// Esta fonte é mais estável e fornece imagens de um domínio consistente.
export async function GET(request: Request) {
    try {
        // Busca as notícias mais recentes do IBGE
        const url = `https://servicodados.ibge.gov.br/api/v3/noticias/?tipo=release`;
        
        const newsResponse = await fetch(url, {
            next: { revalidate: 3600 } // Revalida a cada hora
        });

        if (!newsResponse.ok) {
            const errorBody = await newsResponse.json();
            console.error('IBGE API Error:', errorBody);
            return NextResponse.json({ error: 'Failed to fetch news from provider' }, { status: newsResponse.status });
        }

        const newsData = await newsResponse.json();

        // Transforma os dados do IBGE para um formato mais genérico que o frontend possa usar
        const formattedArticles = newsData.items.map((item: any) => {
             let imageUrl = null;
            try {
                if (item.imagens) {
                    const imageInfo = JSON.parse(item.imagens);
                    imageUrl = `https://agenciadenoticias.ibge.gov.br/${imageInfo.image_fulltext}`;
                }
            } catch (e) {
                console.error("Error parsing image JSON from IBGE API", e);
            }

            // Converte a data do formato "DD/MM/YYYY HH:mm:ss" para o formato ISO 8601
            const dateParts = item.data_publicacao.split(' ')[0].split('/');
            const timeParts = item.data_publicacao.split(' ')[1].split(':');
            const isoDate = new Date(
                Number(dateParts[2]), 
                Number(dateParts[1]) - 1, 
                Number(dateParts[0]), 
                Number(timeParts[0]), 
                Number(timeParts[1]), 
                Number(timeParts[2])
            ).toISOString();

            return {
                title: item.titulo,
                description: item.introducao,
                url: item.link,
                image: imageUrl,
                publishedAt: isoDate,
                source: {
                    name: 'IBGE Agência de Notícias',
                    url: 'https://agenciadenoticias.ibge.gov.br/'
                }
            };
        });


        return NextResponse.json({ articles: formattedArticles });

    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
