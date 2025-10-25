
'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { askReze } from '@/ai/flows/reze-flow';
import { ScrollArea } from './ui/scroll-area';

type Message = {
    role: 'user' | 'model';
    content: string;
};

export function Reze() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await askReze({
                history: messages,
                question: input,
            });
            const modelMessage: Message = { role: 'model', content: response };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error('Reze AI error:', error);
            const errorMessage: Message = { role: 'model', content: "Sorry, I'm having trouble connecting. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className={cn("fixed bottom-6 right-6 z-50 transition-transform duration-300", isOpen ? 'scale-0' : 'scale-100')}>
                <Button onClick={() => setIsOpen(true)} size="icon" className="w-14 h-14 rounded-full shadow-lg">
                    <Bot className="h-7 w-7" />
                </Button>
            </div>

            <div className={cn("fixed bottom-6 right-6 z-50 transition-transform duration-300", !isOpen ? 'scale-0' : 'scale-100')}>
                <Card className="w-80 h-[28rem] flex flex-col shadow-2xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-6 w-6 text-primary" />
                            Reze Support
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                         <ScrollArea ref={scrollAreaRef} className="h-full p-6">
                            <div className="space-y-4">
                                {messages.map((msg, index) => (
                                    <div key={index} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                        <div className={cn('max-w-[80%] rounded-lg px-3 py-2 text-sm', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">Reze is thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <div className="flex w-full items-center space-x-2">
                            <Input 
                                placeholder="Ask Reze..." 
                                value={input} 
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={loading}
                            />
                            <Button onClick={handleSend} disabled={loading}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}
