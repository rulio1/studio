
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSupabase } from '@/lib/supabase';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { authorId, content, image, pollOptions, quotedPostId, location, spotifyUrl, replySettings } = await req.json();

    if (!authorId || (!content && !image && !pollOptions && !quotedPostId)) {
      return NextResponse.json({ error: 'Faltam dados essenciais para o post.' }, { status: 400 });
    }

    // 1. Get User Data from Supabase
    const supabase = getSupabase();
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('uid, displayName, handle, avatar, isVerified')
        .eq('uid', authorId)
        .single();
    
    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário autor não encontrado.' }, { status: 404 });
    }
    
    // 2. Insert Post Content into MongoDB
    const client = await clientPromise;
    const db = client.db();
    const postsCollection = db.collection('posts');

    const postDocument = {
      author: {
        uid: userData.uid,
        displayName: userData.displayName,
        handle: userData.handle,
        avatar: userData.avatar,
        isVerified: userData.isVerified,
      },
      content,
      image,
      poll: pollOptions ? { options: pollOptions, votes: pollOptions.map(() => 0), voters: {} } : null,
      quotedPostId: quotedPostId ? new ObjectId(quotedPostId) : null,
      location,
      spotifyUrl,
      replySettings,
      createdAt: new Date(),
      likes: [],
      retweets: [],
      comments: [],
      views: 0,
    };

    const result = await postsCollection.insertOne(postDocument);

    // 3. Insert Post Metadata into Supabase
    const { error: postMetaError } = await supabase.from('posts').insert([
        {
            mongoId: result.insertedId.toHexString(), // Link to the MongoDB document
            authorId: authorId,
            hashtags: content.match(/#\w+/g) || [],
            mentions: content.match(/@\w+/g) || [],
        }
    ]);

    if (postMetaError) {
        // Here you might want to implement a rollback for the MongoDB insert.
        // For now, we'll log the error.
        console.error("Supabase post metadata insert error:", postMetaError);
        return NextResponse.json({ error: 'Falha ao salvar metadados do post.', details: postMetaError.message }, { status: 500 });
    }


    return NextResponse.json({ message: 'Post criado com sucesso.', postId: result.insertedId }, { status: 201 });

  } catch (error) {
    console.error('Create post API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Um erro desconhecido ocorreu';
    return NextResponse.json({ error: 'Erro interno do servidor ao criar post.', details: errorMessage }, { status: 500 });
  }
}
