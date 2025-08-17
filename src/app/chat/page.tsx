
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Bot, Loader2, Send } from 'lucide-react';
import { chat, ChatHistory } from '@/ai/flows/chat-flow';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<ChatHistory[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatHistory = { role: 'user', content: input };
        const newMessages: ChatHistory[] = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        
        let modelResponse = '';
        setMessages(prev => [...prev, { role: 'model', content: '' }]);

        try {
            const stream = chat(newMessages);
            for await (const chunk of stream) {
                modelResponse += chunk;
                 setMessages(prev => {
                    const updatedMessages = [...prev];
                    updatedMessages[updatedMessages.length - 1].content = modelResponse;
                    return updatedMessages;
                 });
            }
        } catch (error) {
            console.error('Erro ao obter resposta da IA:', error);
             setMessages(prev => {
                const latestMessages = [...prev];
                const lastMessage = latestMessages[latestMessages.length - 1];
                if (lastMessage.role === 'model') {
                    lastMessage.content = "Oops! Algo deu errado. Por favor, tente novamente.";
                } else {
                    return [...latestMessages, { role: 'model', content: "Oops! Algo deu errado. Por favor, tente novamente." }];
                }
                return latestMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };


  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 px-4 py-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
                 <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot /></AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-lg font-bold">Chirp AI</h1>
                    <p className="text-xs text-muted-foreground">Assistente de IA</p>
                </div>
            </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6">
                 {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <Bot className="h-16 w-16 mb-4" />
                        <h2 className="text-2xl font-bold text-foreground">Chirp AI está aqui para ajudar</h2>
                        <p>Pergunte-me qualquer coisa, ou apenas diga oi!</p>
                    </div>
                 )}
                {messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'model' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`rounded-lg px-4 py-2 max-w-xs md:max-w-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                         {message.role === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="https://placehold.co/40x40.png" alt="User" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback><Bot /></AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg px-4 py-2 max-w-xs md:max-w-md bg-muted">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t">
            <div className="flex items-center gap-2">
                <Input 
                    placeholder="Pergunte qualquer coisa ao Chirp AI..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}
