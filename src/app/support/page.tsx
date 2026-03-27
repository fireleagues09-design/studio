
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDocs, limit, where, getDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Headset, ArrowLeft, MessageSquare, History, Clock, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { startSupportChatAction } from '@/app/actions';

export default function SupportPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chatId, setChatId] = useState<string | null>(null);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [historyChats, setHistoryChats] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [isMounted, setIsMounted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [view, setView] = useState<'chat' | 'home' | 'history'>('home');
    const [isPendingFirstMessage, setIsPendingFirstMessage] = useState(false);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
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

        const syncIdentityAndFetchData = async () => {
            try {
                // 1. Fetch Active Chat
                const qActive = query(
                    collection(db, "chats"),
                    where("userId", "==", user.uid),
                    where("status", "in", ["waiting", "open"]),
                    orderBy("createdAt", "desc"),
                    limit(1)
                );
                const activeSnap = await getDocs(qActive);
                
                if (!activeSnap.empty) {
                    const docData = activeSnap.docs[0].data();
                    setChatId(activeSnap.docs[0].id);
                    setActiveChat({ id: activeSnap.docs[0].id, ...docData });
                    setView('chat');
                    setIsPendingFirstMessage(false);
                } else {
                    setView('home');
                }

                // 2. Fetch History
                const qHistory = query(
                    collection(db, "chats"),
                    where("userId", "==", user.uid),
                    where("status", "==", "closed"),
                    orderBy("createdAt", "desc"),
                    limit(10)
                );
                const historySnap = await getDocs(qHistory);
                setHistoryChats(historySnap.docs.map(d => ({ id: d.id, ...d.data() })));

            } catch (err) {
                console.error("Support init error:", err);
            } finally {
                hideLoader();
            }
        };

        syncIdentityAndFetchData();
    }, [user, isMounted, hideLoader]);

    useEffect(() => {
        if (!chatId) return;

        const q = query(
            collection(db, `chats/${chatId}/messages`),
            orderBy("createdAt", "asc")
        );

        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        // Listen to chat session updates (status changes)
        const unsubChat = onSnapshot(doc(db, "chats", chatId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setActiveChat({ id: snap.id, ...data });
                if (data.status === 'closed' && view === 'chat') {
                    // Refresh history if closed
                    syncHistory();
                }
            }
        });

        return () => {
            unsub();
            unsubChat();
        };
    }, [chatId, view]);

    // Auto-scroll chat to bottom without scrolling the entire page
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const syncHistory = async () => {
        if (!user) return;
        const qHistory = query(
            collection(db, "chats"),
            where("userId", "==", user.uid),
            where("status", "==", "closed"),
            orderBy("createdAt", "desc"),
            limit(10)
        );
        const historySnap = await getDocs(qHistory);
        setHistoryChats(historySnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const startNewChat = async () => {
        if (!user) return;
        // Don't create in Firestore yet. Just enter the UI.
        setChatId(null);
        setActiveChat(null);
        setMessages([]);
        setIsPendingFirstMessage(true);
        setView('chat');
    };

    const selectHistoryChat = (id: string) => {
        setChatId(id);
        const chat = historyChats.find(c => c.id === id);
        setActiveChat(chat);
        setIsPendingFirstMessage(false);
        setView('chat');
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!text.trim() || !user || isSending || activeChat?.status === 'closed') return;

        const messageText = text.trim();
        const encrypted = encryptMessage(messageText);
        setText("");
        setIsSending(true);

        try {
            if (isPendingFirstMessage) {
                // Fetch latest profile details for metadata
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.exists() ? userDoc.data() : null;
                
                const realName = userData?.realName || user.displayName || "No Name Provided";
                const gamingHandle = userData?.username || null;
                const idToken = await user.getIdToken();

                // Create chat AND send first message in one action
                const result = await startSupportChatAction(
                    idToken,
                    realName,
                    gamingHandle,
                    user.photoURL,
                    encrypted
                );

                if (result.success && result.chatId) {
                    setChatId(result.chatId);
                    setIsPendingFirstMessage(false);
                    // Snapshot will pick up the activeChat and messages
                } else {
                    throw new Error(result.message);
                }
            } else if (chatId) {
                // Normal message send for existing chat
                await addDoc(collection(db, `chats/${chatId}/messages`), {
                    text: encrypted, 
                    senderId: user.uid,
                    senderType: 'player',
                    createdAt: serverTimestamp(),
                });

                await updateDoc(doc(db, "chats", chatId), {
                    lastMessageTime: serverTimestamp(),
                });
            }
        } catch (err: any) {
            console.error("Send error:", err);
            toast({ title: "Error", description: err.message || "Failed to send message.", variant: "destructive" });
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

    // HOME VIEW: List history and show "Start New" button
    if (view === 'home') {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Headset className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">How can we help?</h1>
                    <p className="text-muted-foreground">Our support agents are online and ready to assist you with any tournament or wallet issues.</p>
                    <Button size="lg" className="rounded-full font-bold px-8 shadow-lg shadow-primary/20" onClick={startNewChat}>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Start New Conversation
                    </Button>
                </div>

                {historyChats.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Recent Support Sessions
                        </h3>
                        <div className="grid gap-3">
                            {historyChats.map((c) => (
                                <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]" onClick={() => selectHistoryChat(c.id)}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-secondary rounded-lg">
                                                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Session #{c.id}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {c.createdAt ? format(c.createdAt.toDate(), 'PPp') : 'Unknown date'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary">Closed</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // CHAT VIEW
    return (
        <div className="container mx-auto px-2 md:px-4 py-4 max-w-4xl h-[calc(100vh-5rem)] flex flex-col">
            <header className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setView('home')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Headset className="h-5 w-5 text-primary" />
                            Live Support
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            {isPendingFirstMessage ? "New Conversation" : `Session: ${chatId}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                    <div className={cn("h-2 w-2 rounded-full", (activeChat?.status === 'closed' || isPendingFirstMessage) ? "bg-muted-foreground" : "bg-green-500 animate-pulse")} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {activeChat?.status === 'closed' ? 'Closed' : 'Agent Online'}
                    </span>
                </div>
            </header>

            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto flex flex-col gap-4 border rounded-2xl p-4 bg-card/30 backdrop-blur-md shadow-inner relative scroll-smooth scrollbar-hide"
            >
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                        <div className="p-6 bg-secondary rounded-full">
                            <MessageSquare className="h-12 w-12" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Connected!</p>
                            <p className="text-sm">Describe your issue below to start the session.</p>
                        </div>
                    </div>
                ) : (
                    messages.map((m) => {
                        const isMe = m.senderId === user.uid;
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
            </div>

            {activeChat?.status !== 'closed' ? (
                <form onSubmit={sendMessage} className="flex mt-4 gap-2 items-center">
                    <div className="relative flex-1">
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full border-2 rounded-full px-5 py-6 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-base shadow-lg"
                            placeholder="Type your message..."
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
            ) : (
                <div className="mt-6 p-4 bg-secondary/30 rounded-xl text-center border-dashed border-2 border-muted-foreground/20">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4" />
                        This conversation is archived.
                    </p>
                    <Button variant="link" size="sm" onClick={() => setView('home')} className="mt-1">
                        Back to Home
                    </Button>
                </div>
            )}
        </div>
    );
}
