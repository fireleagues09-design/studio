
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, ArrowLeft, Headset, UserCheck, ChevronLeft, ListFilter, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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

export default function SupportPanelPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [showQueueOnMobile, setShowQueueOnMobile] = useState(true);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const router = useRouter();
    const { hideLoader } = useLoading();

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const userDocRef = doc(db, 'users', u.uid);
                const docSnap = await getDoc(userDocRef);
                const data = docSnap.data();
                if (data?.isSupport === true) {
                    setUser(u);
                    setIsAuthorized(true);
                } else {
                    router.push('/');
                }
            } else {
                router.push('/login');
            }
            setAuthLoading(false);
            hideLoader();
        });
        return () => unsubAuth();
    }, [router, hideLoader]);

    useEffect(() => {
        if (!isAuthorized) return;
        const q = query(collection(db, 'chats'), where('status', 'in', ['waiting', 'open']), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            const fetchedChats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
            setChats(fetchedChats);
            
            if (selectedChat) {
                const updatedSelected = fetchedChats.find(c => c.id === selectedChat.id);
                if (updatedSelected) {
                    setSelectedChat(updatedSelected);
                } else if (updatedSelected === undefined && selectedChat.status !== 'closed') {
                    // Chat was likely closed or deleted
                    setSelectedChat(null);
                    setShowQueueOnMobile(true);
                }
            }
        });
        return () => unsub();
    }, [isAuthorized, selectedChat?.id]);

    useEffect(() => {
        if (!selectedChat) return;
        const unsubMsgs = onSnapshot(query(collection(db, `messages/${selectedChat.id}/chat`), orderBy('createdAt', 'asc')), snap => {
            setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return () => unsubMsgs();
    }, [selectedChat?.id]);

    const pickChat = async (chat: ChatSession) => {
        if (!user || (chat.assignedAdmin && chat.assignedAdmin !== user.uid)) return;
        
        if (chat.status === 'waiting') {
            const chatRef = doc(db, 'chats', chat.id);
            await updateDoc(chatRef, { 
                assignedAdmin: user.uid, 
                status: 'open', 
                lastMessageTime: serverTimestamp() 
            });
        }
        setSelectedChat(chat);
        setShowQueueOnMobile(false);
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !selectedChat || !user) return;
        const txt = inputText.trim();
        setInputText('');
        
        try {
            await addDoc(collection(db, `messages/${selectedChat.id}/chat`), {
                text: encryptMessage(txt),
                senderId: user.uid,
                senderType: 'admin',
                createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'chats', selectedChat.id), { lastMessageTime: serverTimestamp() });
        } catch (err) {
            console.error("Staff send error:", err);
            toast({ title: "Error", description: "Could not send reply.", variant: "destructive" });
        }
    };

    const endSession = async () => {
        if (!selectedChat) return;
        try {
            await updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' });
            setSelectedChat(null);
            setShowQueueOnMobile(true);
            toast({ title: "Session Closed", description: "Support session has ended." });
        } catch (err) {
            toast({ title: "Error", description: "Could not close session.", variant: "destructive" });
        }
    };

    if (authLoading || !isAuthorized) return null;

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden border-t">
            {/* Sidebar / Queue List */}
            <aside className={cn(
                "w-full lg:w-80 xl:w-96 border-r flex flex-col bg-muted/10 shrink-0",
                !showQueueOnMobile && "hidden lg:flex"
            )}>
                <div className="p-4 border-b flex items-center justify-between bg-background">
                    <div className="flex items-center gap-2">
                        <Headset className="h-5 w-5 text-primary" />
                        <h2 className="font-bold">Active Queue</h2>
                    </div>
                    <Badge variant="secondary">{chats.length}</Badge>
                </div>
                
                <div className="p-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search active users..." 
                            className="pl-9 h-9 bg-background"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {chats.length > 0 ? chats.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => pickChat(c)} 
                                className={cn(
                                    "w-full text-left p-3 rounded-lg transition-all group border border-transparent",
                                    selectedChat?.id === c.id 
                                        ? "bg-primary/10 border-primary/20 shadow-sm" 
                                        : "hover:bg-accent",
                                    c.assignedAdmin && c.assignedAdmin !== user?.uid && "opacity-50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm truncate">{c.userName}</span>
                                    <Badge 
                                        variant={c.status === 'waiting' ? 'destructive' : 'default'} 
                                        className="text-[10px] scale-90"
                                    >
                                        {c.status === 'waiting' ? 'WAITING' : 'OPEN'}
                                    </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono flex items-center justify-between">
                                    <span>ID: {c.id.substring(0, 8)}...</span>
                                    {c.assignedAdmin === user?.uid && (
                                        <span className="text-green-600 flex items-center gap-1 font-bold">
                                            <UserCheck className="h-3 w-3" /> Assisting
                                        </span>
                                    )}
                                </div>
                            </button>
                        )) : (
                            <div className="p-8 text-center text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No active requests</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                
                <div className="p-4 border-t bg-background/50">
                    <Button variant="ghost" size="sm" asChild className="w-full text-xs">
                        <Link href="/">
                            <ArrowLeft className="h-3 w-3 mr-2" /> Back to Home
                        </Link>
                    </Button>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className={cn(
                "flex-1 flex flex-col bg-background relative",
                showQueueOnMobile && "hidden lg:flex"
            )}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <header className="h-16 border-b flex items-center justify-between px-4 bg-background z-10">
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="lg:hidden"
                                    onClick={() => setShowQueueOnMobile(true)}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h3 className="font-bold text-sm lg:text-base leading-none">{selectedChat.userName}</h3>
                                    <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-tighter">
                                        Session: {selectedChat.id}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs h-8 text-destructive hover:bg-destructive/10"
                                    onClick={endSession}
                                >
                                    End Session
                                </Button>
                            </div>
                        </header>

                        {/* Messages */}
                        <div className="flex-1 overflow-hidden bg-muted/5">
                            <ScrollArea className="h-full">
                                <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
                                    <div className="flex justify-center">
                                        <span className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground uppercase font-bold tracking-widest">
                                            Encrypted Session Started
                                        </span>
                                    </div>
                                    
                                    {messages.map(m => (
                                        <div 
                                            key={m.id} 
                                            className={cn(
                                                "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                m.senderType === 'admin' ? "items-end" : "items-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-3 rounded-2xl max-w-[85%] text-sm shadow-sm",
                                                m.senderType === 'admin' 
                                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                    : "bg-background border border-border/50 rounded-tl-none"
                                            )}>
                                                {decryptMessage(m.text)}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                                {m.createdAt ? format(m.createdAt.toDate(), 'p') : '...'}
                                            </span>
                                        </div>
                                    ))}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Input Area */}
                        <footer className="p-4 border-t bg-background">
                            <form 
                                onSubmit={sendMessage} 
                                className="flex items-center gap-2 max-w-4xl mx-auto"
                            >
                                <Input 
                                    placeholder="Type a professional reply..." 
                                    value={inputText} 
                                    onChange={e => setInputText(e.target.value)} 
                                    className="flex-1 bg-muted/30 border-none focus-visible:ring-primary h-11 rounded-full"
                                />
                                <Button 
                                    type="submit" 
                                    size="icon" 
                                    disabled={!inputText.trim()} 
                                    className="rounded-full h-11 w-11 shrink-0 shadow-lg"
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                        <div className="bg-muted/30 p-8 rounded-full mb-6">
                            <Headset className="h-16 w-16 opacity-20" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Workspace Empty</h3>
                        <p className="max-w-xs text-sm">
                            Pick a player from the active queue on the left to start a professional assistance session.
                        </p>
                        <Button 
                            variant="outline" 
                            className="mt-6 lg:hidden"
                            onClick={() => setShowQueueOnMobile(true)}
                        >
                            <ListFilter className="mr-2 h-4 w-4" />
                            View Active Queue
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
