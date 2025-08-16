
'use server';
/**
 * @fileOverview An AI flow to generate images from a text prompt.
 * 
 * - generateImageFromPrompt - A function that generates an image based on a text prompt.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateImageSchema = z.string();

export async function generateImageFromPrompt(prompt: string): Promise<string> {
    const generateImageFlow = ai.defineFlow(
      {
        name: 'generateImageFlow',
        inputSchema: GenerateImageSchema,
        outputSchema: z.string(),
      },
      async (prompt) => {
        const {media} = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt: `Uma imagem cinematográfica de alta qualidade de: ${prompt}`,
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });
        
        if (!media) {
            throw new Error("A IA não conseguiu gerar uma imagem. Tente um prompt diferente.");
        }

        return media.url; // Returns a data URI string (e.g., "data:image/png;base64,...")
      }
    );
  
    return generateImageFlow(prompt);
  }
