
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { uid, displayName, email, handle, birthDate } = await req.json();

    if (!uid || !displayName || !email || !handle || !birthDate) {
      return NextResponse.json({ error: 'Dados do usuário ausentes.' }, { status: 400 });
    }
    
    // Conectar ao Supabase para dados relacionais (perfil do usuário)
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
        searchableDisplayName: displayName.toLowerCase(),
        searchableHandle: handle.replace('@', '').toLowerCase(),
    }]);

    if (supabaseError) {
      console.error('Supabase user profile creation error:', supabaseError);
      return NextResponse.json({ error: 'Falha ao criar perfil de usuário no Supabase.', details: supabaseError.message }, { status: 500 });
    }
    
    // Conectar ao MongoDB para outros dados, se necessário (ex: analytics, logs)
    // No momento, apenas criamos o perfil no Supabase.
    // O MongoDB pode ser usado para coleções de posts, etc.

    return NextResponse.json({ message: 'Usuário criado com sucesso.' }, { status: 201 });
  } catch (error) {
    console.error('Create user API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Um erro desconhecido ocorreu';
    return NextResponse.json({ error: 'Erro interno do servidor.', details: errorMessage }, { status: 500 });
  }
}
