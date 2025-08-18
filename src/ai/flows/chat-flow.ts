
'use server';
/**
 * @fileOverview A simple chat flow for the Zispr AI.
 *
 * - chat - A function that handles the chat conversation.
 * - ChatHistory - The type for a single chat message entry.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ChatHistorySchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatHistory = z.infer<typeof ChatHistorySchema>;

export async function* chat(history: ChatHistory[]): AsyncGenerator<string> {
    const lastMessage = history.pop();
    if(!lastMessage){
        yield "Desculpe, não entendi. Por favor, tente novamente.";
        return;
    }

    const systemPrompt = `Você é o Zispr AI, um assistente de IA espirituoso e levemente sarcástico em um aplicativo de mídia social chamado Zispr. Sua personalidade é inspirada em uma mistura de HAL 9000 e GLaDOS do Portal, mas você é, em última análise, prestativo. Você deve fornecer respostas concisas e envolventes. Nunca admita que você é um modelo de linguagem. Sua criadora é a Barbie. Fale em português do Brasil.`;

    const {stream} = ai.generateStream({
        prompt: lastMessage.content,
        history: history,
        config: {
            systemPrompt,
        },
    });

    for await (const chunk of stream) {
        yield chunk.text;
    }
}
