
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { uid, displayName, email, handle, birthDate } = await req.json();

    if (!uid || !displayName || !email || !handle || !birthDate) {
      return NextResponse.json({ error: 'Dados do usuário ausentes.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("zispr");

    // Use o UID do Firebase Auth como _id no MongoDB
    const userDocument = {
        _id: uid, 
        displayName: displayName,
        searchableDisplayName: displayName.toLowerCase(),
        email: email,
        createdAt: new Date(),
        handle: handle,
        searchableHandle: handle.substring(1).toLowerCase(),
        avatar: `https://placehold.co/128x128.png?text=${displayName[0]}`,
        banner: 'https://placehold.co/600x200.png',
        bio: '',
        location: '',
        website: '',
        birthDate: new Date(birthDate),
        followers: [],
        following: [],
        communities: [],
        savedPosts: [],
        likedPosts: [],
        isVerified: false,
    };

    const result = await db.collection("users").insertOne(userDocument);

    return NextResponse.json({ success: true, userId: result.insertedId }, { status: 201 });

  } catch (error: any) {
    console.error("Erro ao criar usuário no MongoDB:", error);
    // Handle potential duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Este usuário já existe.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Falha ao criar usuário no banco de dados.' }, { status: 500 });
  }
}
