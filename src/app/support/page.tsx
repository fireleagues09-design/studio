
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDocs, limit, where, getDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Headset, ArrowLeft, MessageSquare, History, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    const [view, setView] = useState<'chat' | 'home'>('home');
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

                syncHistory();

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

        const unsubChat = onSnapshot(doc(db, "chats", chatId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setActiveChat({ id: snap.id, ...data });
            }
        });

        return () => {
            unsub();
            unsubChat();
        };
    }, [chatId]);

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
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.exists() ? userDoc.data() : null;
                
                const realName = userData?.realName || user.displayName || "Player";
                const gamingHandle = userData?.username || null;
                const idToken = await user.getIdToken();

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
                } else {
                    throw new Error(result.message);
                }
            } else if (chatId) {
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
            <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
                <div className="p-6 bg-secondary/50 rounded-full mb-6">
                    <Headset className="h-12 w-12 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Support Center</h1>
                <p className="text-muted-foreground text-center max-w-sm mb-8">Please sign in to chat with our support team and view your conversation history.</p>
                <Button asChild size="lg" className="px-10 rounded-full font-semibold"><Link href="/login">Sign In to Continue</Link></Button>
            </div>
        );
    }

    if (view === 'home') {
        return (
            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-10">
                <header className="text-center space-y-4">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-2">
                        <Headset className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">How can we help?</h1>
                    <p className="text-muted-foreground text-lg">Our team is available to assist you with any questions or issues.</p>
                </header>

                <div className="grid gap-6">
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={startNewChat}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="p-3 bg-primary text-primary-foreground rounded-xl group-hover:scale-110 transition-transform">
                                <PlusCircle className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle>Start New Conversation</CardTitle>
                                <CardDescription>Get help from an agent in real-time.</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>

                    {historyChats.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-1">
                                <History className="h-4 w-4" />
                                <span>Recent Conversations</span>
                            </div>
                            <div className="grid gap-3">
                                {historyChats.map((c) => (
                                    <Card key={c.id} className="hover:bg-accent transition-colors cursor-pointer" onClick={() => selectHistoryChat(c.id)}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-secondary rounded-lg">
                                                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">Session #{c.id}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {c.createdAt ? format(c.createdAt.toDate(), 'PPP') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="font-medium">Closed</Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-4 max-w-4xl h-[calc(100vh-5rem)] flex flex-col">
            <header className="flex items-center justify-between mb-4 p-3 bg-card border rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setView('home')} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-sm font-bold leading-none">Support Session</h1>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">
                            {isPendingFirstMessage ? "Draft" : `ID: ${chatId}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeChat?.status === 'closed' ? (
                        <Badge variant="outline" className="text-[10px] uppercase py-0.5">Closed</Badge>
                    ) : (
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-green-500 uppercase px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live
                        </div>
                    )}
                </div>
            </header>

            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 md:p-6 bg-card border rounded-2xl shadow-inner relative scrollbar-hide"
            >
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-center py-12">
                        <div className="p-6 bg-secondary rounded-full mb-4">
                            <MessageSquare className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <p className="font-bold">No messages yet</p>
                        <p className="text-xs text-muted-foreground max-w-[200px] mt-1 leading-relaxed">
                            Send your first message to start the conversation.
                        </p>
                    </div>
                ) : (
                    messages.map((m, idx) => {
                        // Sender Sense Logic: My messages (player) are on the Right
                        const isMe = m.senderType === 'player';
                        const showAvatar = !isMe && (idx === 0 || messages[idx-1].senderType !== 'admin');
                        
                        return (
                            <div key={m.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                <div className={cn("flex flex-col max-w-[85%] md:max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                    {!isMe && showAvatar && (
                                        <span className="text-[10px] font-bold text-primary mb-1 ml-1 uppercase">Support Team</span>
                                    )}
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                        isMe 
                                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                                            : "bg-secondary text-foreground rounded-tl-none border"
                                    )}>
                                        <p className="leading-relaxed break-words whitespace-pre-wrap">{decryptMessage(m.text)}</p>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground mt-1 px-1">
                                        {m.createdAt ? format(m.createdAt.toDate(), 'p') : 'Sending...'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="pt-4">
                {activeChat?.status !== 'closed' ? (
                    <form onSubmit={sendMessage} className="flex gap-2 items-center bg-card p-2 border rounded-full shadow-md">
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="flex-1 border-0 rounded-full px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="Type your message..."
                            autoComplete="off"
                        />
                        <Button 
                            type="submit" 
                            disabled={!text.trim() || isSending}
                            className="rounded-full w-10 h-10 p-0 flex-shrink-0"
                        >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                ) : (
                    <div className="p-4 bg-secondary/50 rounded-xl text-center border border-dashed flex items-center justify-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">This session is closed. Start a new one if you need more help.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
