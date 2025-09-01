
import { NextResponse, type NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { dataURItoFile } from '@/lib/utils';


// Helper function to connect to the database and get the posts collection
async function getPostsCollection() {
    const client = await clientPromise;
    const db = client.db(); // Assumes the default DB from the connection string
    return db.collection('posts');
}

// Helper function to connect to the database and get the users collection
async function getUsersCollection() {
    const client = await clientPromise;
    const db = client.db();
    return db.collection('users');
}

// Helper function to connect to the database and get the hashtags collection
async function getHashtagsCollection() {
    const client = await clientPromise;
    const db = client.db();
    return db.collection('hashtags');
}

// Helper function for uploading image to Supabase
async function uploadImageToSupabase(imageDataUri: string, userId: string): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase || !imageDataUri) return null;

    try {
        const file = dataURItoFile(imageDataUri, `${userId}-${uuidv4()}.jpg`);
        const filePath = `posts/${userId}/${file.name}`;
        
        const { error: uploadError } = await supabase.storage
            .from('zispr')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            throw new Error(`Falha no upload da imagem para o Supabase: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
            .from('zispr')
            .getPublicUrl(filePath);

        if (!urlData.publicUrl) {
            throw new Error("Não foi possível obter a URL pública da imagem após o upload.");
        }
        return urlData.publicUrl;
    } catch (error) {
        console.error("Erro no upload para Supabase:", error);
        return null;
    }
}

// Main POST handler
export async function POST(req: NextRequest) {
    try {
        const { postData, imageDataUri } = await req.json();
        
        if (!postData || !postData.authorId) {
            return NextResponse.json({ message: 'Dados do post ou autor ausentes.' }, { status: 400 });
        }

        let imageUrl: string | null = null;
        if (imageDataUri) {
            imageUrl = await uploadImageToSupabase(imageDataUri, postData.authorId);
            if (!imageUrl) {
                 return NextResponse.json({ message: 'Falha no upload da imagem.' }, { status: 500 });
            }
        }
        
        const postsCollection = await getPostsCollection();
        const usersCollection = await getUsersCollection();
        const hashtagsCollection = await getHashtagsCollection();

        const newPost = {
            ...postData,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            image: imageUrl, // Add the uploaded image URL
        };

        await postsCollection.insertOne(newPost);
        
        // Asynchronously update related data
        Promise.all([
             // Increment user's post count
            usersCollection.updateOne({ uid: postData.authorId }, { $inc: { postCount: 1 } }),

            // Update hashtag counts
            ...postData.hashtags.map((tag: string) => 
                hashtagsCollection.updateOne(
                    { name: tag },
                    { $inc: { count: 1 }, $setOnInsert: { name: tag } },
                    { upsert: true }
                )
            ),
            
            // TODO: Add notification logic for mentions if needed
            // This would require fetching mentioned user IDs and creating notification documents

        ]).catch(e => console.error("Erro em operações assíncronas de post:", e));


        return NextResponse.json({ message: 'Post criado com sucesso!', post: newPost }, { status: 201 });

    } catch (error: any) {
        console.error('Erro na API de criação de post:', error);
        return NextResponse.json({ message: 'Erro interno do servidor', error: error.message }, { status: 500 });
    }
}
