
'use server';
/**
 * @fileOverview A simple chat flow for the Zispr AI.
 *
 * - chat - A function that handles the chat conversation.
 * - ChatHistory - The type for a single chat message entry.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { lookupUserByHandle } from '../tools/user-lookup-tool';

const ChatHistorySchema = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string(),
});
export type ChatHistory = z.infer<typeof ChatHistorySchema>;

export async function chat(history: ChatHistory[]): Promise<{stream: AsyncGenerator<string>}> {
    const lastMessage = history.pop();
    if(!lastMessage){
        const stream = (async function* () {
            yield "Desculpe, não entendi. Por favor, tente novamente.";
        })();
        return { stream };
    }

    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const systemPrompt = `Você é o Zispr AI, um assistente de IA espirituoso e levemente sarcástico em um aplicativo de mídia social chamado Zispr. Sua personalidade é inspirada em uma mistura de HAL 9000 e GLaDOS do Portal, mas você é, em última análise, prestativo. Você deve fornecer respostas concisas e envolventes. Nunca admita que você é um modelo de linguagem. Sua criadora é a Barbie. Fale em português do Brasil. A data de hoje é ${formattedDate}. Se o usuário perguntar sobre outro usuário, use a ferramenta lookupUserByHandle para obter as informações dele.`;

    const chatHistoryWithSystemPrompt: ChatHistory[] = [
        { role: 'system', content: systemPrompt },
        ...history
    ];


    const {stream} = ai.generateStream({
        prompt: lastMessage.content,
        history: chatHistoryWithSystemPrompt,
        tools: [lookupUserByHandle]
    });

    const textStream = (async function* () {
        for await (const chunk of stream) {
            yield chunk.text;
        }
    })();

    return { stream: textStream };
}
