
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const extractHashtags = (content: string) => {
    const regex = /#(\w+)/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
};

export async function POST(req: NextRequest) {
  try {
    const postData = await req.json();

    if (!postData.authorId || !postData.content) {
      return NextResponse.json({ error: 'Dados do post ausentes.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("zispr");
    
    const hashtags = extractHashtags(postData.content);

    const newPost = {
        authorId: postData.authorId,
        author: postData.author,
        handle: postData.handle,
        avatar: postData.avatar,
        avatarFallback: postData.avatarFallback,
        content: postData.content,
        image: postData.image || null,
        spotifyUrl: postData.spotifyUrl || null,
        location: postData.location || null,
        isVerified: postData.isVerified || false,
        quotedPostId: postData.quotedPostId || null,
        poll: postData.poll || null,
        replySettings: postData.replySettings || 'everyone',
        hashtags: hashtags,
        createdAt: new Date(),
        comments: 0,
        retweets: [],
        likes: [],
        views: 0,
    };

    const result = await db.collection("posts").insertOne(newPost);

    // Update hashtag counts
    if (hashtags.length > 0) {
        const hashtagCollection = db.collection("hashtags");
        const bulkOps = hashtags.map(tag => ({
            updateOne: {
                filter: { name: tag },
                update: { $inc: { count: 1 } },
                upsert: true
            }
        }));
        await hashtagCollection.bulkWrite(bulkOps);
    }
    
    // Here you would also handle notifications for mentions, but that requires more setup.
    // We'll skip it for now to keep it focused.

    return NextResponse.json({ success: true, postId: result.insertedId }, { status: 201 });

  } catch (error: any) {
    console.error("Erro ao criar post no MongoDB:", error);
    return NextResponse.json({ error: 'Falha ao criar post no banco de dados.' }, { status: 500 });
  }
}
