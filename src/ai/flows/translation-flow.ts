
'use server';
/**
 * @fileOverview An AI flow to translate text.
 *
 * - translateText - A function that translates text to a target language.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TranslateInputSchema = z.object({
  text: z.string(),
  targetLanguage: z.string().describe("The language to translate the text into (e.g., 'English', 'Portuguese')."),
});

export async function translateText(text: string, targetLanguage: string): Promise<string> {
    const translateFlow = ai.defineFlow(
      {
        name: 'translateFlow',
        inputSchema: TranslateInputSchema,
        outputSchema: z.string(),
      },
      async ({ text, targetLanguage }) => {
        const {text: translatedText} = await ai.generate({
          prompt: `Translate the following text to ${targetLanguage}. Do not, under any circumstances, surround the translation with quotes. Just return the translated text directly.

Text to translate:
"""
${text}
"""`,
        });
        return translatedText;
      }
    );
  
    return translateFlow({ text, targetLanguage });
  }
