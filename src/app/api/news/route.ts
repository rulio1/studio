
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // FIX: For development purposes, the API key is hardcoded here.
    // In a production environment, this should be a secret environment variable.
    const apiKey = '8a2c60b477d69f565fc7a37b90c330b3';

    try {
        const url = `https://gnews.io/api/v4/top-headlines?country=br&max=5&token=${apiKey}`;
        
        const newsResponse = await fetch(url, {
            next: { revalidate: 3600 } // Revalidate every hour
        });

        if (!newsResponse.ok) {
            const errorBody = await newsResponse.json();
            console.error('GNews API Error:', errorBody);
            return NextResponse.json({ error: 'Failed to fetch news from provider' }, { status: newsResponse.status });
        }

        const newsData = await newsResponse.json();

        return NextResponse.json(newsData);

    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
