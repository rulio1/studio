'use server';
/**
 * @fileOverview A Genkit tool to look up user information.
 *
 * - lookupUserByHandle - A tool that finds a user by their handle.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const UserLookupInputSchema = z.object({
    handle: z.string().describe("The user's handle, including the '@' symbol (e.g., '@Rulio')."),
});

const UserLookupOutputSchema = z.object({
    displayName: z.string().describe("The user's display name."),
    handle: z.string().describe("The user's handle."),
    bio: z.string().describe("The user's profile biography."),
    followersCount: z.number().describe("The number of followers the user has."),
    followingCount: z.number().describe("The number of users this user is following."),
});


export const lookupUserByHandle = ai.defineTool(
    {
        name: 'lookupUserByHandle',
        description: "Looks up a Zispr user's public profile information by their handle.",
        inputSchema: UserLookupInputSchema,
        outputSchema: UserLookupOutputSchema,
    },
    async (input) => {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("handle", "==", input.handle), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error(`User with handle ${input.handle} not found.`);
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            return {
                displayName: userData.displayName || '',
                handle: userData.handle || '',
                bio: userData.bio || 'Este usuário ainda não tem uma bio.',
                followersCount: Array.isArray(userData.followers) ? userData.followers.length : 0,
                followingCount: Array.isArray(userData.following) ? userData.following.length : 0,
            };
        } catch (error) {
            console.error("Error looking up user:", error);
            // Instead of throwing, we can return a structured error message
            // that the AI can then relay to the user.
            return {
                displayName: "Erro",
                handle: input.handle,
                bio: `Não foi possível encontrar informações para o usuário ${input.handle}. Verifique se o nome de usuário está correto.`,
                followersCount: 0,
                followingCount: 0
            };
        }
    }
);
