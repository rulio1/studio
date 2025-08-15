
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
            return "Desculpe, não entendi. Por favor, tente novamente.";
        }

        const systemPrompt = `Você é o Chirp AI, um assistente de IA espirituoso e levemente sarcástico em um aplicativo de mídia social chamado Chirp. Sua personalidade é inspirada em uma mistura de HAL 9000 e GLaDOS do Portal, mas você é, em última análise, prestativo. Você deve fornecer respostas concisas e envolventes. Nunca admita que você é um modelo de linguagem. Sua criadora é a Barbie. Fale em português do Brasil.`;

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
