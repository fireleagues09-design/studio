'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDocs, limit, where
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Headset } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function SupportPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chatId, setChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [isMounted, setIsMounted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const { hideLoader } = useLoading();
    const { toast } = useToast();

    useEffect(() => {
        setIsMounted(true);
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) hideLoader();
        });
        return () => unsubAuth();
    }, [hideLoader]);

    // Get/Create chat
    useEffect(() => {
        if (!user || !isMounted) return;

        const initChat = async () => {
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
                } else {
                    const docRef = await addDoc(collection(db, "chats"), {
                        userId: user.uid,
                        userName: user.displayName || user.email?.split('@')[0] || "Player",
                        status: "waiting",
                        createdAt: serverTimestamp(),
                        lastMessageTime: serverTimestamp(),
                    });
                    setChatId(docRef.id);
                }
            } catch (err) {
                console.error("Chat init error:", err);
            } finally {
                hideLoader();
            }
        };

        initChat();
    }, [user, isMounted, hideLoader]);

    // Listen messages
    useEffect(() => {
        if (!chatId) return;

        const q = query(
            collection(db, `chats/${chatId}/messages`),
            orderBy("createdAt", "asc")
        );

        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });

        return () => unsub();
    }, [chatId]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!text.trim() || !chatId || !user || isSending) return;

        const messageText = text.trim();
        setText("");
        setIsSending(true);

        try {
            await addDoc(collection(db, `chats/${chatId}/messages`), {
                text: messageText,
                senderId: user.uid,
                senderType: 'player',
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, "chats", chatId), {
                lastMessageTime: serverTimestamp(),
            });
        } catch (err) {
            console.error("Send error:", err);
            toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    if (!isMounted) return null;
    if (!user) return (
        <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-2xl font-bold mb-4">Support Chat</h1>
            <p className="text-muted-foreground">Please log in to contact support.</p>
            <Button asChild className="mt-4"><a href="/login">Login</a></Button>
        </div>
    );

    return (
        <div className="container mx-auto px-2 md:px-4 py-4 max-w-4xl h-[calc(100vh-5rem)] flex flex-col">
            <header className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <Headset className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold">Live Support</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Online</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 border rounded-xl p-4 bg-card/50 backdrop-blur-sm shadow-inner relative">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-center space-y-2">
                        <Headset className="h-12 w-12" />
                        <p className="italic text-sm">Waiting for messages...</p>
                    </div>
                ) : (
                    messages.map((m) => {
                        const isMe = m.senderType === 'player';
                        return (
                            <div key={m.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                <div className={cn("flex flex-col max-w-[85%] md:max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-sm md:text-base shadow-sm text-white",
                                        isMe ? "bg-orange-500 rounded-br-none" : "bg-gray-700 rounded-bl-none"
                                    )}>
                                        {!isMe && (
                                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                                                Support Agent
                                            </div>
                                        )}
                                        {m.text}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-60">
                                        {m.createdAt ? format(m.createdAt.toDate(), 'p') : '...'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="flex mt-4 gap-2 px-1">
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 border rounded-full px-5 py-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none h-11 md:h-12"
                    placeholder="Type your message..."
                    autoComplete="off"
                />
                <Button 
                    type="submit" 
                    disabled={!text.trim() || isSending}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-full font-bold h-11 md:h-12 transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
            </form>
        </div>
    );
}
