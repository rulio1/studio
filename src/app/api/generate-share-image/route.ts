
import { NextRequest, NextResponse } from 'next/server';
import { generatePostImage } from '@/services/image-generation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { author, handle, content, createdAt, avatar, isVerified, badgeTier } = body;

    if (!author || !handle || !content || !createdAt || !avatar) {
      return NextResponse.json({ error: 'Missing required post data' }, { status: 400 });
    }

    // Fetch avatar as data URI
    const avatarResponse = await fetch(avatar);
    const avatarBuffer = await avatarResponse.arrayBuffer();
    const avatarBase64 = Buffer.from(avatarBuffer).toString('base64');
    const avatarMimeType = avatarResponse.headers.get('content-type') || 'image/png';
    const avatarDataUri = `data:${avatarMimeType};base64,${avatarBase64}`;


    const dataUrl = await generatePostImage({
      ...body,
      avatar: avatarDataUri, // Pass the data URI instead of the URL
    });
    
    return NextResponse.json({ dataUrl });

  } catch (error) {
    console.error('Error generating share image:', error);
    return NextResponse.json({ error: 'Failed to generate share image' }, { status: 500 });
  }
}
