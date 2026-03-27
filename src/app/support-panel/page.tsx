
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ChevronLeft, Headset, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Message = {
    id: string;
    text: string;
    senderId: string;
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
                if (updatedSelected) setSelectedChat(updatedSelected);
                else {
                    setSelectedChat(null);
                    setShowQueueOnMobile(true);
                }
            }
        });
        return () => unsub();
    }, [isAuthorized, selectedChat?.id]);

    useEffect(() => {
        if (!selectedChat) return;
        const unsubMsgs = onSnapshot(
            query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc')), 
            snap => {
                setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
                setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        );
        return () => unsubMsgs();
    }, [selectedChat?.id]);

    const pickChat = async (chat: ChatSession) => {
        if (!user) return;
        if (chat.status === 'waiting') {
            await updateDoc(doc(db, 'chats', chat.id), { 
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
            await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
                text: encryptMessage(txt),
                senderId: user.uid,
                createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'chats', selectedChat.id), { lastMessageTime: serverTimestamp() });
        } catch (err) {
            console.error("Staff send error:", err);
            toast({ title: "Error", description: "Could not send reply.", variant: "destructive" });
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
                        <h2 className="font-bold">Support Queue</h2>
                    </div>
                    <Badge variant="secondary">{chats.length}</Badge>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {chats.length > 0 ? chats.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => pickChat(c)} 
                                className={cn(
                                    "w-full text-left p-3 rounded-lg transition-all border border-transparent",
                                    selectedChat?.id === c.id 
                                        ? "bg-primary/10 border-primary/20 shadow-sm" 
                                        : "hover:bg-accent"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm truncate">{c.userName}</span>
                                    <Badge variant={c.status === 'waiting' ? 'destructive' : 'default'} className="text-[10px] scale-90">
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
                                <p className="text-sm">No active requests</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </aside>

            {/* Main Chat Area */}
            <main className={cn(
                "flex-1 flex flex-col bg-background relative",
                showQueueOnMobile && "hidden lg:flex"
            )}>
                {selectedChat ? (
                    <>
                        <header className="h-16 border-b flex items-center justify-between px-4 bg-background z-10">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowQueueOnMobile(true)}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h3 className="font-bold text-sm lg:text-base leading-none">{selectedChat.userName}</h3>
                                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">Session: {selectedChat.id}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="text-destructive h-8" onClick={() => updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' })}>
                                End Session
                            </Button>
                        </header>

                        <div className="flex-1 overflow-hidden bg-muted/5">
                            <ScrollArea className="h-full">
                                <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
                                    {messages.map(m => (
                                        <div key={m.id} className={cn("flex flex-col", m.senderId === user?.uid ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "p-3 rounded-2xl max-w-[85%] text-sm shadow-sm",
                                                m.senderId === user?.uid 
                                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                    : "bg-background border border-border/50 rounded-tl-none"
                                            )}>
                                                {decryptMessage(m.text)}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                                {m.senderId === user?.uid ? 'You' : 'Player'} • {m.createdAt ? format(m.createdAt.toDate(), 'p') : '...'}
                                            </span>
                                        </div>
                                    ))}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>
                        </div>

                        <footer className="p-4 border-t bg-background">
                            <form onSubmit={sendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                                <Input 
                                    placeholder="Type a professional reply..." 
                                    value={inputText} 
                                    onChange={e => setInputText(e.target.value)} 
                                    className="flex-1 bg-muted/30 border-none h-11 rounded-full"
                                />
                                <Button type="submit" size="icon" disabled={!inputText.trim()} className="rounded-full h-11 w-11 shadow-lg">
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                        <Headset className="h-16 w-16 opacity-20 mb-6" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Workspace Empty</h3>
                        <p className="max-w-xs text-sm">Pick a player from the queue to start a professional assistance session.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
