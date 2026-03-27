
'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, XCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';

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

export default function AdminSupportPanel() {
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
                const docSnap = await getDoc(doc(db, 'users', u.uid));
                const data = docSnap.data();
                if (data?.isAdmin || data?.isSupport) {
                    setUser(u);
                    setIsAuthorized(true);
                } else router.push('/');
            } else router.push('/login');
            setAuthLoading(false);
            hideLoader();
        });
        return () => unsubAuth();
    }, [router, hideLoader]);

    useEffect(() => {
        if (!isAuthorized) return;
        const q = query(collection(db, 'chats'), where('status', 'in', ['waiting', 'open']), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setChats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession)));
        });
        return () => unsub();
    }, [isAuthorized]);

    useEffect(() => {
        if (!selectedChat) return;
        const unsubMsgs = onSnapshot(query(collection(db, `messages/${selectedChat.id}/chat`), orderBy('createdAt', 'asc')), snap => {
            setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        const unsubChat = onSnapshot(doc(db, 'chats', selectedChat.id), snap => {
            if (snap.exists()) {
                const data = snap.data() as ChatSession;
                setSelectedChat({ id: snap.id, ...data });
                if (data.assignedAdmin === user?.uid && data.status === 'open') {
                    const last = data.lastMessageTime?.toDate() || new Date();
                    if ((Date.now() - last.getTime()) / 60000 >= 5) {
                        updateDoc(doc(db, 'chats', snap.id), { assignedAdmin: null, status: 'waiting' });
                        setSelectedChat(null);
                        toast({ title: "Chat Moved", description: "Moved to queue due to inactivity." });
                    }
                }
            }
        });
        return () => { unsubMsgs(); unsubChat(); };
    }, [selectedChat?.id, user?.uid, toast]);

    const pickChat = async (chat: ChatSession) => {
        if (!user || (chat.assignedAdmin && chat.assignedAdmin !== user.uid)) return;
        await updateDoc(doc(db, 'chats', chat.id), { assignedAdmin: user.uid, status: 'open', lastMessageTime: serverTimestamp() });
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
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-8rem)]">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="sm" asChild><Link href="/admin"><ArrowLeft className="h-4 w-4 mr-2"/> Back</Link></Button>
                <h1 className="text-3xl font-bold">Support Management</h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle>Queue ({chats.length})</CardTitle></CardHeader>
                    <CardContent className="p-0"><ScrollArea className="h-[500px]">
                        {chats.map(c => (
                            <div key={c.id} onClick={() => pickChat(c)} className={`p-4 border-b cursor-pointer ${selectedChat?.id === c.id ? 'bg-primary text-white' : ''}`}>
                                <div className="font-bold">{c.userName}</div>
                                <div className="text-xs opacity-60">Status: {c.status}</div>
                            </div>
                        ))}
                    </ScrollArea></CardContent>
                </Card>
                <Card className="lg:col-span-2 flex flex-col">
                    {selectedChat ? (
                        <>
                            <CardHeader className="bg-primary text-white flex flex-row justify-between">
                                <div><CardTitle>{selectedChat.userName}</CardTitle><p className="text-xs">{selectedChat.id}</p></div>
                                <Button variant="ghost" onClick={() => updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' })}>Close</Button>
                            </CardHeader>
                            <CardContent className="flex-1 p-4"><ScrollArea className="h-[400px]">
                                {messages.map(m => (
                                    <div key={m.id} className={`mb-4 flex flex-col ${m.senderType === 'admin' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-lg max-w-[80%] ${m.senderType === 'admin' ? 'bg-primary text-white' : 'bg-secondary'}`}>
                                            {decryptMessage(m.text)}
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </ScrollArea></CardContent>
                            <CardFooter className="p-4 border-t">
                                <form onSubmit={sendMessage} className="flex w-full gap-2">
                                    <Input placeholder="Reply..." value={inputText} onChange={e => setInputText(e.target.value)} />
                                    <Button type="submit">Send</Button>
                                </form>
                            </CardFooter>
                        </>
                    ) : <div className="flex-1 flex items-center justify-center">Select a chat.</div>}
                </Card>
            </div>
        </div>
    );
}
