
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
          prompt: `You are a creative social media content creator. Write an engaging, short post for a platform called "Chirp" based on the following topic. The post should be concise, under 280 characters, and can include emojis.
          
          Topic: "${prompt}"`,
        });
        return text;
      }
    );
  
    return generatePostFlow(prompt);
  }

    