
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDocs, limit, where, getDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Headset, ArrowLeft, MessageSquare, History, Clock, PlusCircle, Sparkles } from 'lucide-react';
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
                if (data.status === 'closed' && view === 'chat') {
                    syncHistory();
                }
            }
        });

        return () => {
            unsub();
            unsubChat();
        };
    }, [chatId, view]);

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
                
                const realName = userData?.realName || user.displayName || "No Name Provided";
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
            <div className="container mx-auto px-4 py-12 text-center h-[calc(100vh-10rem)] flex flex-col items-center justify-center">
                <div className="p-8 bg-secondary/30 rounded-full mb-6 border border-border/50">
                    <Headset className="h-16 w-16 text-muted-foreground opacity-20" />
                </div>
                <h1 className="text-3xl font-bold mb-4 tracking-tight">Support Arena</h1>
                <p className="text-muted-foreground max-w-xs mx-auto">Sign in to your FireLeagues account to chat with our expert staff.</p>
                <Button asChild size="lg" className="mt-8 px-10 rounded-full font-bold shadow-lg"><Link href="/login">Login to Access Support</Link></Button>
            </div>
        );
    }

    if (view === 'home') {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl space-y-10">
                <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border-2 border-primary/20 rotate-3">
                            <Headset className="h-12 w-12 text-primary -rotate-3" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-green-500 h-6 w-6 rounded-full border-4 border-background flex items-center justify-center">
                            <div className="h-2 w-2 bg-white rounded-full animate-ping" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tight uppercase">Live Support</h1>
                        <p className="text-muted-foreground">Our battle-hardened agents are ready to assist you.</p>
                    </div>
                    
                    <div className="grid gap-4 pt-4">
                        <Button size="lg" className="h-20 rounded-2xl font-black text-lg px-8 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" onClick={startNewChat}>
                            <PlusCircle className="mr-3 h-6 w-6" />
                            START NEW SESSION
                        </Button>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Response time: ~2 minutes</p>
                    </div>
                </div>

                {historyChats.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Battle Archives
                            </h3>
                            <span className="text-[10px] font-bold text-muted-foreground/50">{historyChats.length} Sessions</span>
                        </div>
                        <div className="grid gap-3">
                            {historyChats.map((c) => (
                                <Card key={c.id} className="cursor-pointer border-border/40 bg-card/50 hover:bg-accent hover:border-primary/30 transition-all group active:scale-[0.98]" onClick={() => selectHistoryChat(c.id)}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-secondary rounded-xl group-hover:bg-primary/10 transition-colors">
                                                <MessageSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="font-black text-sm uppercase tracking-tight">Session #{c.id}</p>
                                                <p className="text-[10px] font-medium text-muted-foreground">
                                                    {c.createdAt ? format(c.createdAt.toDate(), 'PPP') : 'Unknown date'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-secondary/50 font-black text-[9px] uppercase tracking-tighter">Resolved</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 md:px-4 py-4 max-w-4xl h-[calc(100vh-5rem)] flex flex-col">
            <header className="flex items-center justify-between mb-4 px-2 bg-background/80 backdrop-blur-sm sticky top-0 z-10 py-2 rounded-xl border border-border/20 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setView('home')} className="hover:bg-secondary rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Active Support
                        </h1>
                        <p className="text-[10px] text-muted-foreground font-mono font-bold leading-none">
                            {isPendingFirstMessage ? "NEW_IDENTITY_PENDING" : `REF: ${chatId}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                    <div className={cn("h-2 w-2 rounded-full", (activeChat?.status === 'closed' || isPendingFirstMessage) ? "bg-muted-foreground" : "bg-green-500 animate-pulse")} />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {activeChat?.status === 'closed' ? 'Archived' : 'Live Agent'}
                    </span>
                </div>
            </header>

            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto flex flex-col gap-4 border border-border/30 rounded-3xl p-4 bg-muted/5 backdrop-blur-sm shadow-inner relative scroll-smooth scrollbar-hide"
            >
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-center space-y-6 py-12">
                        <div className="p-8 bg-secondary/50 rounded-full border-2 border-dashed border-border">
                            <MessageSquare className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <p className="font-black text-lg uppercase tracking-tight">Channel Established</p>
                            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto uppercase tracking-widest leading-relaxed">System waiting for initial player input to assign staff.</p>
                        </div>
                    </div>
                ) : (
                    messages.map((m, idx) => {
                        const isMe = m.senderId === user.uid;
                        const showAvatar = !isMe && (idx === 0 || messages[idx-1].senderType !== 'admin');
                        
                        return (
                            <div key={m.id} className={cn("flex w-full mb-1", isMe ? "justify-end" : "justify-start")}>
                                <div className={cn("flex flex-col max-w-[85%] md:max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                    <div className={cn(
                                        "px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm relative transition-all duration-300",
                                        isMe 
                                            ? "bg-primary text-primary-foreground rounded-br-none border-b-2 border-primary/20" 
                                            : "bg-secondary/80 text-foreground rounded-bl-none border-b-2 border-border/20"
                                    )}>
                                        {!isMe && showAvatar && (
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-primary opacity-80">
                                                FIRELEAGUES STAFF
                                            </div>
                                        )}
                                        <p className="leading-relaxed break-words whitespace-pre-wrap font-medium">{decryptMessage(m.text)}</p>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-bold text-muted-foreground mt-1.5 px-2 opacity-50 uppercase tracking-tighter",
                                        isMe ? "text-right" : "text-left"
                                    )}>
                                        {m.createdAt ? format(m.createdAt.toDate(), 'p') : 'SYNCING...'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {activeChat?.status !== 'closed' ? (
                <form onSubmit={sendMessage} className="flex mt-4 gap-2 items-center bg-card/50 p-2 rounded-full border border-border/20 shadow-lg mb-2">
                    <div className="relative flex-1">
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full border-0 rounded-full px-5 py-6 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/50 font-medium"
                            placeholder="Type a message..."
                            autoComplete="off"
                        />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={!text.trim() || isSending}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground w-12 h-12 rounded-full shadow-lg transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center p-0 flex-shrink-0"
                    >
                        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
            ) : (
                <div className="mt-6 p-6 bg-secondary/30 rounded-2xl text-center border-2 border-dashed border-muted-foreground/10 animate-in fade-in duration-1000">
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Session Archived & Encrypted</p>
                        <Button variant="outline" size="sm" onClick={() => setView('home')} className="mt-2 rounded-full font-bold border-muted-foreground/20 hover:bg-background">
                            RETURN TO TERMINAL
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
