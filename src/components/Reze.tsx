
'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkle, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { askReze } from '@/ai/flows/reze-flow';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

type Message = {
    role: 'user' | 'model';
    content: string;
};

export function Reze() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        // Initial greeting from Reze
        const getInitialGreeting = async () => {
            setLoading(true);
            try {
                const response = await askReze({
                    history: [],
                    question: "Introduce yourself.",
                });
                 const modelMessage: Message = { role: 'model', content: response };
                 setMessages([modelMessage]);
            } catch (error) {
                console.error('Reze AI error on init:', error);
                const errorMessage: Message = { role: 'model', content: "Hi! I'm Reze, your support assistant. I seem to be having a little trouble connecting right now, but I'll do my best to help." };
                setMessages([errorMessage]);
            } finally {
                setLoading(false);
            }
        };
        
        if (messages.length === 0) {
          getInitialGreeting();
        }

    }, [messages.length]);


    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setLoading(true);

        try {
            const response = await askReze({
                history: messages,
                question: currentInput,
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
        <Card className="w-full max-w-sm shadow-2xl shadow-accent/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Sparkle className="h-6 w-6 text-accent" />
                    <span className='text-xl'>Talk to Reze</span>
                </CardTitle>
                <CardDescription>Your AI assistant</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
                 <ScrollArea ref={scrollAreaRef} className="h-56 p-4">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={cn('flex items-end gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'model' && <Sparkle className="h-5 w-5 text-accent flex-shrink-0" />}
                                <div className={cn('max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap', msg.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-muted')}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-end gap-2 justify-start">
                                <Sparkle className="h-5 w-5 text-accent flex-shrink-0" />
                                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm text-muted-foreground">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <Separator />
            <CardFooter className="p-2">
                <div className="flex w-full items-center space-x-2">
                    <Input 
                        placeholder="Ask me anything..." 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                        className="focus-visible:ring-accent"
                    />
                    <Button 
                        onClick={handleSend} 
                        disabled={loading || !input.trim()} 
                        size="icon"
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
