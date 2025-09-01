
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const extractHashtags = (content: string): string[] => {
    const regex = /#(\w+)/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
};

export async function POST(req: NextRequest) {
  try {
    const postData = await req.json();
    const { authorId, content } = postData;

    if (!authorId || content === undefined) {
      return NextResponse.json({ error: 'Dados do post ausentes (ID do autor ou conteúdo).' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("zispr");
    
    const hashtags = extractHashtags(content);

    // O authorId já é a string do UID do Firebase, que é o _id na coleção de usuários
    const newPost = {
        ...postData,
        authorId: authorId, 
        hashtags: hashtags,
        createdAt: new Date(),
        editedAt: null,
        comments: 0,
        retweets: [],
        likes: [],
        views: 0,
        isPinned: false,
    };
    
    const result = await db.collection("posts").insertOne(newPost);

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
    
    return NextResponse.json({ success: true, postId: result.insertedId }, { status: 201 });

  } catch (error: any) {
    console.error("Erro ao criar post no MongoDB:", error);
    return NextResponse.json({ error: 'Falha ao criar post no banco de dados.', details: error.message }, { status: 500 });
  }
}
