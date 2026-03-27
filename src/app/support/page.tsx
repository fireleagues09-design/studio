
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, 
    doc, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    setDoc, 
    serverTimestamp, 
    updateDoc,
    limit,
    getDocs,
    getDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, XCircle, Loader2, BadgeInfo, MessageSquarePlus, MessageCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { useLoading } from '@/context/LoadingContext';
import { Badge } from '@/components/ui/badge';

type Message = {
    id: string;
    text: string;
    senderId: string;
    senderType: 'player' | 'admin';
    createdAt: any;
};

type ChatSession = {
    id: string;
    userId: string;
    userName: string;
    assignedAdmin: string | null;
    status: 'waiting' | 'open' | 'closed';
    lastMessageTime: any;
    createdAt: any;
};

export default function SupportPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showStartScreen, setShowStartScreen] = useState(true);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { hideLoader } = useLoading();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                try {
                    // Check for active or waiting sessions
                    const q = query(
                        collection(db, 'chats'), 
                        where('userId', '==', u.uid), 
                        where('status', 'in', ['waiting', 'open']), 
                        orderBy('createdAt', 'desc'), 
                        limit(1)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setCurrentChat({ id: snap.docs[0].id, ...snap.docs[0].data() } as ChatSession);
                        setShowStartScreen(false);
                    }
                } catch (err) {
                    console.error("Session check error:", err);
                }
            }
            setLoading(false);
            hideLoader();
        });
        return () => unsub();
    }, [hideLoader]);

    useEffect(() => {
        if (!currentChat) return;
        const unsubMsgs = onSnapshot(query(collection(db, `messages/${currentChat.id}/chat`), orderBy('createdAt', 'asc')), snap => {
            const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            // Small delay to ensure render is complete before scrolling
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }, (error) => {
            console.error("Messages listener error:", error);
        });

        const unsubChat = onSnapshot(doc(db, 'chats', currentChat.id), snap => {
            if (snap.exists()) {
                const data = snap.data() as ChatSession;
                setCurrentChat({ id: snap.id, ...data });
                if (data.status === 'closed') {
                    setShowStartScreen(true);
                    setCurrentChat(null);
                    setMessages([]);
                }
            }
        });

        return () => { unsubMsgs(); unsubChat(); };
    }, [currentChat?.id]);

    const startNewChat = async () => {
        if (!user) {
            toast({ title: "Authentication Required", description: "Please login to start a support chat.", variant: "destructive" });
            return;
        }
        
        setIsCreating(true);
        const chatId = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
        
        let userName = user.displayName || 'Player';
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                userName = userDoc.data().username || userName;
            }
        } catch (e) {
            console.warn("Could not fetch username for chat, using fallback.", e);
        }

        const chatData: ChatSession = {
            id: chatId,
            userId: user.uid,
            userName: userName,
            assignedAdmin: null,
            status: 'waiting',
            lastMessageTime: serverTimestamp(),
            createdAt: serverTimestamp(),
        };

        try {
            // Explicitly use userId in the document to match security rules
            await setDoc(doc(db, 'chats', chatId), chatData);
            setCurrentChat(chatData);
            setShowStartScreen(false);
        } catch (error: any) {
            console.error("Chat creation error:", error);
            toast({ 
                title: "Permission Denied", 
                description: "Could not start chat. Please ensure your profile is complete.", 
                variant: "destructive" 
            });
        } finally {
            setIsCreating(false);
        }
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !currentChat || !user) return;
        
        const txt = inputText.trim();
        setInputText('');
        
        try {
            await addDoc(collection(db, `messages/${currentChat.id}/chat`), {
                text: encryptMessage(txt),
                senderId: user.uid,
                senderType: 'player',
                createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'chats', currentChat.id), { 
                lastMessageTime: serverTimestamp() 
            });
        } catch (err) {
            console.error("Send message error:", err);
            toast({ title: "Error", description: "Message not sent. Session might be closed.", variant: "destructive" });
        }
    };

    if (loading) return (
        <div className="h-[calc(100vh-10rem)] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">Connecting to Secure Assist...</p>
        </div>
    );

    if (!user) return (
        <div className="container mx-auto px-4 py-12 text-center">
            <BadgeInfo className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold">Authentication Required</h2>
            <p className="text-muted-foreground mt-2">Please login to access live support.</p>
        </div>
    );

    if (showStartScreen) return (
        <div className="container mx-auto px-4 py-12 max-w-lg">
            <Card className="border-primary/20 shadow-xl overflow-hidden">
                <div className="bg-primary h-2 w-full" />
                <CardHeader className="text-center pb-8">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Live Support</CardTitle>
                    <CardDescription>Our team is available 24/7 to help you with tournament issues, payments, or account queries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                            <span className="text-sm">End-to-end encrypted messaging</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                            <BadgeInfo className="h-5 w-5 text-primary" />
                            <span className="text-sm">Average response time: 5 minutes</span>
                        </div>
                    </div>
                    <Button 
                        onClick={startNewChat} 
                        disabled={isCreating} 
                        className="w-full py-6 text-lg font-bold"
                    >
                        {isCreating ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting...</>
                        ) : (
                            <><MessageSquarePlus className="mr-2 h-5 w-5" /> Start New Chat</>
                        )}
                    </Button>
                </CardContent>
                <CardFooter className="bg-secondary/20 p-4 justify-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">FireLeagues Secure Assist</p>
                </CardFooter>
            </Card>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl h-[calc(100vh-10rem)]">
            {currentChat && (
                <Card className="h-full flex flex-col overflow-hidden border-primary/20 shadow-2xl">
                    <CardHeader className="bg-primary text-primary-foreground p-5 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Session: {currentChat.id}</CardTitle>
                            {currentChat.status === 'waiting' ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                                    <span className="text-xs font-medium opacity-90">Searching for staff...</span>
                                </div>
                            ) : (
                                <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-transparent">Support Active</Badge>
                            )}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-white hover:bg-white/20"
                            onClick={() => updateDoc(doc(db, 'chats', currentChat.id), { status: 'closed' })}
                        >
                            <XCircle className="h-6 w-6" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 bg-secondary/5 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="space-y-4 pr-4">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex flex-col ${m.senderType === 'player' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                                            m.senderType === 'player' 
                                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                : 'bg-background border rounded-tl-none'
                                        }`}>
                                            {decryptMessage(m.text)}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                            {m.senderType === 'player' ? 'You' : 'Support'}
                                        </span>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-4 border-t bg-background">
                        <form onSubmit={sendMessage} className="flex w-full gap-2">
                            <Input 
                                placeholder="Type your message..." 
                                value={inputText} 
                                onChange={e => setInputText(e.target.value)} 
                                disabled={currentChat.status === 'closed'}
                                className="rounded-full bg-secondary/20 border-none focus-visible:ring-primary"
                            />
                            <Button type="submit" disabled={currentChat.status === 'closed' || !inputText.trim()} size="icon" className="rounded-full shrink-0">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
