
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { uid, displayName, email, handle, birthDate } = await req.json();

    if (!uid || !displayName || !email || !handle || !birthDate) {
      return NextResponse.json({ error: 'Dados do usuário ausentes.' }, { status: 400 });
    }
    
    // 1. Conectar ao Supabase para dados relacionais (perfil do usuário)
    const supabase = getSupabase();
    const { error: supabaseError } = await supabase.from('users').insert([{ 
        uid, 
        displayName, 
        handle,
        email,
        birthDate: new Date(birthDate),
        // Default values
        avatar: `https://placehold.co/128x128.png`,
        banner: `https://placehold.co/600x200.png`,
        bio: `Novo usuário do Zispr!`,
        location: '',
        website: '',
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
    }]);

    if (supabaseError) {
      console.error('Supabase user profile creation error:', supabaseError);
      return NextResponse.json({ error: 'Falha ao criar perfil de usuário no Supabase.', details: supabaseError.message }, { status: 500 });
    }
    
    // 2. Conectar ao MongoDB para dados de conteúdo (inicialização)
    const client = await clientPromise;
    const db = client.db();
    
    // Opcional: Criar uma coleção de posts para o usuário se não existir.
    // Esta etapa é mais para garantir que a estrutura esteja pronta.
    // A coleção será efetivamente usada quando o usuário criar seu primeiro post.
    const userCollectionExists = await db.listCollections({ name: `posts_${uid}` }).hasNext();
    if (!userCollectionExists) {
        await db.createCollection(`posts_${uid}`);
    }

    return NextResponse.json({ message: 'Usuário criado com sucesso em todos os sistemas.' }, { status: 201 });

  } catch (error) {
    console.error('Create user API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Um erro desconhecido ocorreu';
    return NextResponse.json({ error: 'Erro interno do servidor ao criar usuário.', details: errorMessage }, { status: 500 });
  }
}
