
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
    setDoc, 
    serverTimestamp, 
    updateDoc,
    limit,
    getDocs,
    getDoc
} from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Image as ImageIcon, Loader2, XCircle, Headset } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { format } from 'date-fns';
import { useLoading } from '@/context/LoadingContext';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Message = {
    id: string;
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
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
    const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { hideLoader } = useLoading();

    const startNewChat = async (currentUser: FirebaseUser) => {
        setIsCreating(true);
        const chatId = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
        
        let userName = currentUser.displayName || 'Player';
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) userName = userDoc.data().username || userName;
        } catch (e) {}

        const chatData = {
            id: chatId,
            userId: currentUser.uid,
            userName: userName,
            assignedAdmin: null,
            status: 'waiting',
            lastMessageTime: serverTimestamp(),
            createdAt: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, 'chats', chatId), chatData);
            setCurrentChat(chatData as ChatSession);
        } catch (error: any) {
            toast({ title: "Error", description: "Permissions mismatch. Retrying...", variant: "destructive" });
        } finally {
            setIsCreating(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const q = query(collection(db, 'chats'), where('userId', '==', u.uid), where('status', 'in', ['waiting', 'open']), orderBy('createdAt', 'desc'), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) setCurrentChat({ id: snap.docs[0].id, ...snap.docs[0].data() } as ChatSession);
                else await startNewChat(u);
            }
            setLoading(false);
            hideLoader();
        });
        return () => unsub();
    }, [hideLoader]);

    useEffect(() => {
        if (!currentChat) return;
        const unsubMsgs = onSnapshot(query(collection(db, `messages/${currentChat.id}/chat`), orderBy('createdAt', 'asc')), snap => {
            setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        const unsubChat = onSnapshot(doc(db, 'chats', currentChat.id), snap => {
            if (snap.exists()) setCurrentChat({ id: snap.id, ...snap.data() } as ChatSession);
        });
        return () => { unsubMsgs(); unsubChat(); };
    }, [currentChat?.id]);

    useEffect(() => {
        if (!currentChat || currentChat.status === 'closed') return;
        const interval = setInterval(() => {
            const last = currentChat.lastMessageTime?.toDate() || new Date();
            if ((Date.now() - last.getTime()) / 60000 >= 5) updateDoc(doc(db, 'chats', currentChat.id), { status: 'closed' });
        }, 30000);
        return () => clearInterval(interval);
    }, [currentChat]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !currentChat || !user) return;
        const txt = inputText.trim();
        setInputText('');
        await addDoc(collection(db, `messages/${currentChat.id}/chat`), {
            text: encryptMessage(txt),
            senderId: user.uid,
            senderType: 'player',
            createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'chats', currentChat.id), { lastMessageTime: serverTimestamp() });
    };

    if (loading || isCreating) return <div className="h-screen flex items-center justify-center">Initializing...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl h-[calc(100vh-10rem)]">
            {currentChat && (
                <Card className="h-full flex flex-col overflow-hidden border-primary/20 shadow-2xl">
                    <CardHeader className="bg-primary text-primary-foreground p-5 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>ID: {currentChat.id}</CardTitle>
                            {currentChat.status === 'waiting' && <Badge className="animate-pulse">Searching Admin...</Badge>}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => updateDoc(doc(db, 'chats', currentChat.id), { status: 'closed' })}>
                            <XCircle className="h-6 w-6" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 bg-secondary/10 overflow-hidden">
                        <ScrollArea className="h-full">
                            {messages.map(m => (
                                <div key={m.id} className={`mb-4 flex flex-col ${m.senderType === 'player' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3 rounded-xl max-w-[80%] ${m.senderType === 'player' ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                                        {decryptMessage(m.text)}
                                    </div>
                                </div>
                            ))}
                            <div ref={scrollRef} />
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-4 border-t">
                        <form onSubmit={sendMessage} className="flex w-full gap-2">
                            <Input placeholder="Type message..." value={inputText} onChange={e => setInputText(e.target.value)} disabled={currentChat.status === 'closed'} />
                            <Button type="submit" disabled={currentChat.status === 'closed'}><Send className="h-4 w-4" /></Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
