
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
import { MessageSquare, Send, ArrowLeft, Headset, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
                // Strictly allow isSupport users
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
                } else {
                    setSelectedChat(null);
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
        
        const chatRef = doc(db, 'chats', chat.id);
        await updateDoc(chatRef, { 
            assignedAdmin: user.uid, 
            status: 'open', 
            lastMessageTime: serverTimestamp() 
        });
        setSelectedChat(chat);
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !selectedChat || !user) return;
        const txt = inputText.trim();
        setInputText('');
        
        await addDoc(collection(db, `messages/${selectedChat.id}/chat`), {
            text: encryptMessage(txt),
            senderId: user.uid,
            senderType: 'admin',
            createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'chats', selectedChat.id), { lastMessageTime: serverTimestamp() });
    };

    if (authLoading) return null;

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 h-[calc(100vh-10rem)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                        <Headset className="h-8 w-8 text-primary" />
                        Support Panel
                    </h1>
                    <p className="text-muted-foreground mt-1">Professional assist panel for staff.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4 mr-2"/> 
                        Back to Home
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <Card className="lg:col-span-1 flex flex-col overflow-hidden border-border/50">
                    <CardHeader className="bg-secondary/30">
                        <CardTitle className="flex items-center justify-between">
                            Active Queue
                            <Badge variant="outline">{chats.length}</Badge>
                        </CardTitle>
                        <CardDescription>Select a user to begin assisting.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            {chats.length > 0 ? chats.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => pickChat(c)} 
                                    className={cn(
                                        "p-4 border-b cursor-pointer transition-colors hover:bg-secondary/50",
                                        selectedChat?.id === c.id ? 'bg-primary/10 border-l-4 border-l-primary' : '',
                                        c.assignedAdmin && c.assignedAdmin !== user?.uid ? 'opacity-50 cursor-not-allowed bg-muted/20' : ''
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-sm">{c.userName}</div>
                                        <Badge variant={c.status === 'waiting' ? 'destructive' : 'default'} className="text-[10px] px-1.5 h-5">
                                            {c.status === 'waiting' ? 'WAITING' : 'IN PROGRESS'}
                                        </Badge>
                                    </div>
                                    <div className="text-[10px] font-mono text-muted-foreground truncate">ID: {c.id}</div>
                                    {c.assignedAdmin && c.assignedAdmin !== user?.uid && (
                                        <div className="text-[10px] text-destructive mt-1 italic">Being assisted by another admin</div>
                                    )}
                                    {c.assignedAdmin === user?.uid && (
                                        <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                            <UserCheck className="h-3 w-3" /> Assisting
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="p-12 text-center text-muted-foreground text-sm">
                                    No active support requests.
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 flex flex-col overflow-hidden border-primary/20">
                    {selectedChat ? (
                        <>
                            <CardHeader className="bg-primary text-primary-foreground flex flex-row items-center justify-between p-4">
                                <div>
                                    <CardTitle className="text-lg">{selectedChat.userName}</CardTitle>
                                    <p className="text-xs opacity-80 font-mono">Session: {selectedChat.id}</p>
                                </div>
                                <Button 
                                    variant="secondary" 
                                    size="sm"
                                    onClick={() => updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' })}
                                >
                                    End Session
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 p-4 bg-secondary/5 overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="space-y-4">
                                        {messages.map(m => (
                                            <div key={m.id} className={cn(
                                                "flex flex-col",
                                                m.senderType === 'admin' ? 'items-end' : 'items-start'
                                            )}>
                                                <div className={cn(
                                                    "p-3 rounded-2xl max-w-[85%] text-sm shadow-sm",
                                                    m.senderType === 'admin' 
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                        : 'bg-background border rounded-tl-none'
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
                            </CardContent>
                            <CardFooter className="p-4 border-t bg-background">
                                <form onSubmit={sendMessage} className="flex w-full gap-2">
                                    <Input 
                                        placeholder="Type your reply..." 
                                        value={inputText} 
                                        onChange={e => setInputText(e.target.value)} 
                                        className="rounded-full bg-secondary/30"
                                    />
                                    <Button type="submit" size="icon" className="rounded-full shrink-0">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </CardFooter>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                            <h3 className="text-xl font-semibold text-foreground/50">No Chat Selected</h3>
                            <p className="max-w-xs mt-2">Please pick a user from the active queue on the left to start assisting.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
