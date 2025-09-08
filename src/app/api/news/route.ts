
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'News API key not configured' }, { status: 500 });
    }

    try {
        // Fetch top headlines from Brazil
        const url = `https://newsapi.org/v2/top-headlines?country=br&pageSize=5&apiKey=${apiKey}`;
        
        const newsResponse = await fetch(url, {
             // Revalidate every hour
            next: { revalidate: 3600 }
        });

        if (!newsResponse.ok) {
            const errorBody = await newsResponse.json();
            console.error('NewsAPI Error:', errorBody);
            return NextResponse.json({ error: 'Failed to fetch news from provider' }, { status: newsResponse.status });
        }

        const newsData = await newsResponse.json();

        return NextResponse.json(newsData);

    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
