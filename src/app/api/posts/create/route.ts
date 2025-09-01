
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId, BSON } from 'mongodb';

const extractHashtags = (content: string): string[] => {
    const regex = /#(\w+)/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
};

export async function POST(req: NextRequest) {
  try {
    const postData = await req.json();
    // O postData agora inclui: author, handle, avatar, avatarFallback, content, etc.
    const { authorId, content } = postData;

    if (!authorId || content === undefined) { // Checa por content, mesmo que seja string vazia
      return NextResponse.json({ error: 'Dados do post ausentes (ID do autor ou conteúdo).' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("zispr");
    
    const hashtags = extractHashtags(content);

    const newPost = {
        ...postData,
        authorId: new ObjectId(authorId), // Converte para ObjectId
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
    if (error instanceof BSON.BSONError && error.message.includes("is not a valid ObjectId")) {
         return NextResponse.json({ error: 'O ID do autor fornecido é inválido.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao criar post no banco de dados.', details: error.message }, { status: 500 });
  }
}
