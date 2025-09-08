
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const apiKey = 'OU7H5uYoduNwvfqMdFvBiFnCAv9WK5YD';
    
    let url;
    if (query) {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20&offset=0&rating=g&lang=pt`;
    } else {
        url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch from Giphy API');
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error fetching GIFs' }, { status: 500 });
    }
}
