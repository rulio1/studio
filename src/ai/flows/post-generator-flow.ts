
'use server';
/**
 * @fileOverview An AI flow to generate social media posts.
 *
 * - generatePost - A function that generates post content based on a prompt.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GeneratePostSchema = z.string();

export async function generatePost(prompt: string): Promise<string> {
    const generatePostFlow = ai.defineFlow(
      {
        name: 'generatePostFlow',
        inputSchema: GeneratePostSchema,
        outputSchema: z.string(),
      },
      async (prompt) => {
        const {text} = await ai.generate({
          prompt: `Você é um criador de conteúdo de mídia social criativo. Escreva um post curto e envolvente para uma plataforma chamada "Zispr" com base no seguinte tópico. O post deve ser conciso, com menos de 280 caracteres, e pode incluir emojis. O idioma deve ser português do Brasil.
          
          Tópico: "${prompt}"`,
        });
        return text;
      }
    );
  
    return generatePostFlow(prompt);
  }
