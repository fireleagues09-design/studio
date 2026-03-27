
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, XCircle, Loader2, BadgeInfo } from 'lucide-react';
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
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { hideLoader } = useLoading();

    const startNewChat = async (currentUser: FirebaseUser) => {
        setIsCreating(true);
        const chatId = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
        
        let userName = currentUser.displayName || 'Player';
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) userName = userDoc.data().username || userName;
        } catch (e) {
            console.warn("Could not fetch username for chat, using fallback.");
        }

        const chatData = {
            id: chatId,
            userId: currentUser.uid,
            userName: userName,
            assignedAdmin: null,
            status: 'waiting',
            lastMessageTime: serverTimestamp(),
            createdAt: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, 'chats', chatId), chatData);
            setCurrentChat(chatData as ChatSession);
        } catch (error: any) {
            console.error("Chat creation error:", error);
            toast({ title: "Session Error", description: "Could not initialize support. Please try again.", variant: "destructive" });
        } finally {
            setIsCreating(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                try {
                    // Check for existing waiting or open chats
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
                        setLoading(false);
                    } else {
                        await startNewChat(u);
                    }
                } catch (err) {
                    console.error("Auth session check error:", err);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
            hideLoader();
        });
        return () => unsub();
    }, [hideLoader]);

    useEffect(() => {
        if (!currentChat) return;
        const unsubMsgs = onSnapshot(query(collection(db, `messages/${currentChat.id}/chat`), orderBy('createdAt', 'asc')), snap => {
            setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        const unsubChat = onSnapshot(doc(db, 'chats', currentChat.id), snap => {
            if (snap.exists()) setCurrentChat({ id: snap.id, ...snap.data() } as ChatSession);
        });
        return () => { unsubMsgs(); unsubChat(); };
    }, [currentChat?.id]);

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
            await updateDoc(doc(db, 'chats', currentChat.id), { lastMessageTime: serverTimestamp() });
        } catch (err) {
            toast({ title: "Send Failed", description: "Could not send message. Please refresh.", variant: "destructive" });
        }
    };

    if (loading || isCreating) return (
        <div className="h-[calc(100vh-10rem)] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground animate-pulse font-medium">Initializing Secure Connection...</p>
        </div>
    );

    if (!user) return (
        <div className="container mx-auto px-4 py-12 text-center">
            <BadgeInfo className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold">Authentication Required</h2>
            <p className="text-muted-foreground mt-2">Please login to access live support features.</p>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl h-[calc(100vh-10rem)]">
            {currentChat && (
                <Card className="h-full flex flex-col overflow-hidden border-primary/20 shadow-2xl">
                    <CardHeader className="bg-primary text-primary-foreground p-5 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Session: {currentChat.id}</CardTitle>
                            {currentChat.status === 'waiting' && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                                    <span className="text-xs font-medium opacity-90">Searching for staff...</span>
                                </div>
                            )}
                            {currentChat.status === 'open' && (
                                <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-transparent">Active Session</Badge>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => updateDoc(doc(db, 'chats', currentChat.id), { status: 'closed' })}>
                            <XCircle className="h-6 w-6" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 bg-secondary/5 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="space-y-4">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex flex-col ${m.senderType === 'player' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                                            m.senderType === 'player' 
                                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                : 'bg-background border rounded-tl-none'
                                        }`}>
                                            {decryptMessage(m.text)}
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-4 border-t bg-background">
                        <form onSubmit={sendMessage} className="flex w-full gap-2">
                            <Input 
                                placeholder={currentChat.status === 'closed' ? "Session ended" : "Type your message..."} 
                                value={inputText} 
                                onChange={e => setInputText(e.target.value)} 
                                disabled={currentChat.status === 'closed'}
                                className="rounded-full bg-secondary/20"
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
