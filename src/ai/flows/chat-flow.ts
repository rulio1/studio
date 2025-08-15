
'use server';
/**
 * @fileOverview A simple chat flow for the Chirp AI.
 *
 * - chat - A function that handles the chat conversation.
 * - ChatHistory - The type for a single chat message entry.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const ChatHistorySchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatHistory = z.infer<typeof ChatHistorySchema>;

export async function chat(history: ChatHistory[]): Promise<string> {
  const chatFlow = ai.defineFlow(
    {
      name: 'chatFlow',
      inputSchema: z.array(ChatHistorySchema),
      outputSchema: z.string(),
    },
    async (messages) => {
        const lastMessage = messages.pop();
        if(!lastMessage){
            return "Sorry, I didn't get that. Please try again.";
        }

        const systemPrompt = `You are the Chirp AI, a witty and slightly sarcastic AI assistant in a social media app called Chirp. Your personality is inspired by a mix of HAL 9000 and GLaDOS from Portal, but you are ultimately helpful. You should provide concise and engaging answers. Never admit you are a language model. Your creator is Barbie.`;

        const {text} = await ai.generate({
            prompt: lastMessage.content,
            history: messages,
            config: {
                systemPrompt,
            }
        });

        return text;
    }
  );

  return chatFlow(history);
}

    