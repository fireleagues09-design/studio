'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDocs, limit, where, getDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Headset, ArrowLeft, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { encryptMessage, decryptMessage } from '@/lib/encryption';

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

    useEffect(() => {
        if (!user || !isMounted) return;

        const initChat = async () => {
            try {
                // Fetch the official FireLeagues profile data
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.exists() ? userDoc.data() : null;
                
                // Registered Name (from Google/Auth or Firestore)
                const registeredName = user.displayName || userData?.username || "Player";
                // FireLeagues Username Handle
                const userHandle = userData?.username || registeredName.toLowerCase().replace(/\s/g, '');

                const q = query(
                    collection(db, "chats"),
                    where("userId", "==", user.uid),
                    where("status", "in", ["waiting", "open"]),
                    orderBy("createdAt", "desc"),
                    limit(1)
                );

                const snap = await getDocs(q);

                const chatMetadata = {
                    playerDisplayName: registeredName,
                    userHandle: userHandle,
                    lastMessageTime: serverTimestamp()
                };

                if (!snap.empty) {
                    const existingChatId = snap.docs[0].id;
                    setChatId(existingChatId);
                    // Force sync identity data so agents see correct names
                    await updateDoc(doc(db, "chats", existingChatId), chatMetadata);
                } else {
                    const docRef = await addDoc(collection(db, "chats"), {
                        ...chatMetadata,
                        userId: user.uid,
                        status: "waiting",
                        createdAt: serverTimestamp(),
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
                text: encryptMessage(messageText), 
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
    
    if (!user) {
        return (
            <div className="container mx-auto px-4 py-12 text-center h-[calc(100vh-10rem)] flex flex-col items-center justify-center">
                <Headset className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <h1 className="text-2xl font-bold mb-4">Support Chat</h1>
                <p className="text-muted-foreground">Please log in to contact our support team.</p>
                <Button asChild className="mt-6"><Link href="/login">Login Now</Link></Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 md:px-4 py-4 max-w-4xl h-[calc(100vh-5rem)] flex flex-col">
            <header className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="md:hidden">
                        <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Headset className="h-5 w-5 text-primary" />
                            Live Support
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Session: {chatId?.substring(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agent Online</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 border rounded-2xl p-4 bg-card/30 backdrop-blur-md shadow-inner relative scroll-smooth scrollbar-hide">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                        <div className="p-6 bg-secondary rounded-full">
                            <MessageSquare className="h-12 w-12" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Connected!</p>
                            <p className="text-sm">How can we help you today?</p>
                        </div>
                    </div>
                ) : (
                    messages.map((m) => {
                        const isMe = m.senderType === 'player';
                        return (
                            <div key={m.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                <div className={cn("flex flex-col max-w-[85%] md:max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-sm md:text-base shadow-sm",
                                        isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-foreground rounded-bl-none"
                                    )}>
                                        {!isMe && (
                                            <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-primary">
                                                Support Agent
                                            </div>
                                        )}
                                        <p className="leading-relaxed break-words whitespace-pre-wrap">{decryptMessage(m.text)}</p>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-bold text-muted-foreground mt-1.5 px-1 opacity-60",
                                        isMe ? "text-right" : "text-left"
                                    )}>
                                        {isMe ? 'You' : 'Support Agent'} • {m.createdAt ? format(m.createdAt.toDate(), 'p') : '...'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="flex mt-4 gap-2 items-center">
                <div className="relative flex-1">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full border-2 rounded-full px-5 py-6 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-base shadow-lg"
                        placeholder="Describe your issue..."
                        autoComplete="off"
                    />
                </div>
                <Button 
                    type="submit" 
                    disabled={!text.trim() || isSending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center p-0"
                >
                    {isSending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                </Button>
            </form>
        </div>
    );
}
