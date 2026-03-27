
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
import { Send, XCircle, Loader2, BadgeInfo, MessageCircle, ShieldCheck } from 'lucide-react';
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
    const [chatId, setChatId] = useState<string | null>(null);
    const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { hideLoader } = useLoading();

    // 1. Auth Observer
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) {
                setLoading(false);
                hideLoader();
            }
        });
        return () => unsub();
    }, [hideLoader]);

    // 2. Get or Create Chat
    useEffect(() => {
        if (!user) return;

        const getOrCreateChat = async () => {
            try {
                const q = query(
                    collection(db, "chats"),
                    where("userId", "==", user.uid),
                    where("status", "in", ["waiting", "open"]),
                    orderBy("createdAt", "desc"),
                    limit(1)
                );

                const snap = await getDocs(q);

                if (!snap.empty) {
                    setChatId(snap.docs[0].id);
                    setCurrentChat({ id: snap.docs[0].id, ...snap.docs[0].data() } as ChatSession);
                } else {
                    // Fetch username for the session
                    let userName = user.displayName || user.email?.split('@')[0] || 'Player';
                    try {
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (userDoc.exists()) {
                            userName = userDoc.data().username || userName;
                        }
                    } catch (e) { console.warn("Name fetch error", e); }

                    const docRef = await addDoc(collection(db, "chats"), {
                        userId: user.uid,
                        userName: userName,
                        status: "waiting",
                        assignedAdmin: null,
                        createdAt: serverTimestamp(),
                        lastMessageTime: serverTimestamp()
                    });

                    setChatId(docRef.id);
                }
            } catch (err) {
                console.error("Chat error:", err);
                toast({ title: "Error", description: "Failed to initialize support session.", variant: "destructive" });
            } finally {
                setLoading(false);
                hideLoader();
            }
        };

        getOrCreateChat();
    }, [user, hideLoader, toast]);

    // 3. Listen to Messages & Session Updates
    useEffect(() => {
        if (!chatId) return;

        const unsubMsgs = onSnapshot(
            query(collection(db, `chats/${chatId}/messages`), orderBy("createdAt", "asc")), 
            (snap) => {
                setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
                setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        );

        const unsubChat = onSnapshot(doc(db, 'chats', chatId), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as ChatSession;
                setCurrentChat({ id: snap.id, ...data });
                if (data.status === 'closed') {
                    setChatId(null);
                    setCurrentChat(null);
                    setMessages([]);
                }
            }
        });

        return () => { unsubMsgs(); unsubChat(); };
    }, [chatId]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !chatId || !user) return;

        const txt = inputText.trim();
        setInputText('');

        try {
            await addDoc(collection(db, `chats/${chatId}/messages`), {
                text: encryptMessage(txt),
                senderId: user.uid,
                senderType: 'player',
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, "chats", chatId), {
                lastMessageTime: serverTimestamp()
            });
        } catch (err) {
            console.error("Send error:", err);
            toast({ title: "Error", description: "Message not sent.", variant: "destructive" });
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

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl h-[calc(100vh-10rem)]">
            <Card className="h-full flex flex-col overflow-hidden border-primary/20 shadow-2xl">
                <CardHeader className="bg-primary text-primary-foreground p-5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Live Support</CardTitle>
                        {currentChat?.status === 'waiting' ? (
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
                        onClick={() => chatId && updateDoc(doc(db, 'chats', chatId), { status: 'closed' })}
                    >
                        <XCircle className="h-6 w-6" />
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 p-4 bg-secondary/5 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="space-y-4 pr-4">
                            <div className="text-center py-2">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Encrypted Session: {chatId}</span>
                            </div>
                            {messages.map(m => (
                                <div key={m.id} className={`flex flex-col ${m.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                                        m.senderId === user.uid 
                                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                            : 'bg-background border rounded-tl-none'
                                    }`}>
                                        {decryptMessage(m.text)}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                        {m.senderId === user.uid ? 'You' : 'Support'}
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
                            className="rounded-full bg-secondary/20 border-none focus-visible:ring-primary"
                        />
                        <Button type="submit" disabled={!inputText.trim()} size="icon" className="rounded-full shrink-0">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
