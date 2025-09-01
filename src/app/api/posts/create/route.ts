
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    if (!authorId || !content) {
      return NextResponse.json({ error: 'Dados do post ausentes.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("zispr");
    
    const hashtags = extractHashtags(content);

    const newPost = {
        ...postData,
        authorId: new ObjectId(authorId), // Converte para ObjectId
        hashtags: hashtags,
        createdAt: new Date(),
        comments: 0,
        retweets: [],
        likes: [],
        views: 0,
    };
    
    // Remove o id do authorId original, pois já o convertemos
    delete newPost.authorId; 
    newPost.authorId = new ObjectId(postData.authorId);


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
    return NextResponse.json({ error: 'Falha ao criar post no banco de dados.' }, { status: 500 });
  }
}
