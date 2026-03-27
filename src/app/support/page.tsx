
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
import { MessageSquare, Send, Image as ImageIcon, Loader2, XCircle, ShieldCheck, Headset } from 'lucide-react';
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
    createdBy: string;
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

    const generateChatId = () => {
        return Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    };

    const startNewChat = async (currentUser: FirebaseUser) => {
        setIsCreating(true);
        const chatId = generateChatId();
        
        let userName = currentUser.displayName || 'Player';
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                userName = userDoc.data().username || userName;
            }
        } catch (e) {
            console.warn("Could not fetch user doc for name, using fallback.");
        }

        const chatData: ChatSession = {
            id: chatId,
            createdBy: currentUser.uid,
            userName: userName,
            assignedAdmin: null,
            status: 'waiting',
            lastMessageTime: serverTimestamp(),
            createdAt: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, 'chats', chatId), chatData);
            setCurrentChat(chatData);
        } catch (error) {
            console.error("Failed to create chat:", error);
            toast({ title: "Error", description: "Could not start chat. Please check your connection.", variant: "destructive" });
        } finally {
            setIsCreating(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const q = query(
                    collection(db, 'chats'), 
                    where('createdBy', '==', u.uid), 
                    where('status', 'in', ['waiting', 'open']),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                );
                try {
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setCurrentChat({ id: snap.docs[0].id, ...snap.docs[0].data() } as ChatSession);
                        setLoading(false);
                    } else {
                        await startNewChat(u);
                    }
                } catch (e) {
                    console.error("Error checking existing chats:", e);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
            hideLoader();
        });
        return () => unsubscribeAuth();
    }, [hideLoader]);

    useEffect(() => {
        if (!currentChat) return;
        const q = query(collection(db, `messages/${currentChat.id}/chat`), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        
        const unsubChat = onSnapshot(doc(db, 'chats', currentChat.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as ChatSession;
                setCurrentChat(data);
                if (data.status === 'closed') {
                    toast({ title: "Chat Closed", description: "The support session has ended." });
                }
            }
        });

        return () => {
            unsubscribe();
            unsubChat();
        };
    }, [currentChat?.id, toast]);

    useEffect(() => {
        if (!currentChat || currentChat.status === 'closed') return;
        
        const interval = setInterval(() => {
            const lastActivity = currentChat.lastMessageTime?.toDate() || new Date();
            const diffInMins = (Date.now() - lastActivity.getTime()) / 1000 / 60;
            
            if (diffInMins >= 5) {
                updateDoc(doc(db, 'chats', currentChat.id), { status: 'closed' });
                clearInterval(interval);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [currentChat]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!inputText.trim() && !isUploading) || !currentChat || !user) return;

        const textToEncrypt = inputText.trim();
        setInputText('');

        try {
            await addDoc(collection(db, `messages/${currentChat.id}/chat`), {
                text: encryptMessage(textToEncrypt),
                senderId: user.uid,
                senderType: 'player',
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'chats', currentChat.id), {
                lastMessageTime: serverTimestamp()
            });
        } catch (err) {
            toast({ title: "Failed to send", variant: "destructive" });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentChat || !user) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `support/${currentChat.id}/${Date.now()}_${file.name}`);
            const uploadSnap = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(uploadSnap.ref);

            await addDoc(collection(db, `messages/${currentChat.id}/chat`), {
                text: encryptMessage("Media shared"),
                mediaUrl: url,
                mediaType: file.type.startsWith('image/') ? 'image' : 'video',
                senderId: user.uid,
                senderType: 'player',
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'chats', currentChat.id), {
                lastMessageTime: serverTimestamp()
            });
        } catch (err) {
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const closeChat = async () => {
        if (!currentChat) return;
        await updateDoc(doc(db, 'chats', currentChat.id), { status: 'closed' });
        setCurrentChat(null);
        setMessages([]);
    };

    if (loading || isCreating) {
        return (
            <div className="container mx-auto px-4 flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse font-medium">Initialising support session...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Support requires login</h1>
                <Button asChild><Link href="/login">Go to Login</Link></Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl h-[calc(100vh-10rem)]">
            {!currentChat ? (
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 space-y-8 border-primary/10 shadow-2xl bg-card">
                    <div className="bg-destructive/10 p-6 rounded-full">
                        <XCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <div className="space-y-3">
                        <CardTitle className="text-3xl font-bold">Session Ended</CardTitle>
                        <CardDescription>Your support request could not be processed or was closed.</CardDescription>
                    </div>
                    <Button size="lg" onClick={() => user && startNewChat(user)} className="px-8 font-bold">
                        Start New Chat
                    </Button>
                </Card>
            ) : (
                <Card className="h-full flex flex-col overflow-hidden border-primary/20 shadow-2xl bg-card">
                    <CardHeader className="bg-primary text-primary-foreground p-5 flex flex-row items-center justify-between border-b border-primary/10">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-xl font-bold">Assisting: {currentChat.userName}</CardTitle>
                                {currentChat.status === 'waiting' && (
                                    <Badge variant="secondary" className="animate-pulse bg-white/20 text-white border-white/10 px-3 py-1">
                                        Searching Admin...
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 opacity-80 text-xs font-mono">
                                <span>Chat ID:</span>
                                <span className="tracking-widest">{currentChat.id}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-10 w-10" onClick={closeChat}>
                            <XCircle className="h-6 w-6" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 bg-secondary/10 relative overflow-hidden">
                        <ScrollArea className="h-full p-6">
                            <div className="space-y-6">
                                {messages.length === 0 && !isCreating && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
                                        <div className="bg-primary/10 p-4 rounded-full">
                                            <Headset className="h-8 w-8 text-primary" />
                                        </div>
                                        <p className="text-sm text-muted-foreground max-w-[200px]">
                                            You are connected. Type a message to start the conversation.
                                        </p>
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={`flex flex-col ${msg.senderType === 'player' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div 
                                            className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                                                msg.senderType === 'player' 
                                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                : 'bg-background border border-primary/10 rounded-tl-none'
                                            }`}
                                        >
                                            {msg.mediaUrl ? (
                                                <div className="space-y-2">
                                                    {msg.mediaType === 'image' ? (
                                                        <div className="relative w-full aspect-square min-w-[240px] rounded-xl overflow-hidden border border-white/10">
                                                            <Image src={msg.mediaUrl} alt="shared" fill className="object-cover" />
                                                        </div>
                                                    ) : (
                                                        <video src={msg.mediaUrl} controls className="rounded-xl max-w-full max-h-[350px] border border-white/10" />
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm md:text-base leading-relaxed break-words">{decryptMessage(msg.text)}</p>
                                            )}
                                            <p className={`text-[10px] mt-2 font-medium opacity-60 ${msg.senderType === 'player' ? 'text-right' : 'text-left'}`}>
                                                {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : 'Sending...'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                        
                        {currentChat.status === 'closed' && (
                            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center p-8 text-center z-50">
                                <div className="space-y-6 max-w-xs">
                                    <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto">
                                        <XCircle className="h-12 w-12 text-destructive" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-bold text-2xl">Session Ended</p>
                                        <p className="text-muted-foreground text-sm">This chat session has been closed. Start a new one if you still need help.</p>
                                    </div>
                                    <Button onClick={() => user && startNewChat(user)} className="w-full py-6 font-bold text-lg rounded-xl">
                                        Start New Session
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="p-4 bg-background border-t border-primary/10 shadow-inner">
                        <form onSubmit={sendMessage} className="flex w-full items-center gap-3">
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload}
                                accept="image/*,video/*"
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="rounded-xl h-12 w-12 flex-shrink-0 border-primary/20 hover:bg-primary/5"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || currentChat.status === 'closed'}
                            >
                                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5 text-primary" />}
                            </Button>
                            <div className="relative flex-1">
                                <Input 
                                    placeholder="Type your message..." 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="h-12 px-4 rounded-xl border-primary/20 focus-visible:ring-primary/30"
                                    disabled={currentChat.status === 'closed'}
                                />
                            </div>
                            <Button 
                                type="submit" 
                                disabled={!inputText.trim() || currentChat.status === 'closed'}
                                className="rounded-xl h-12 w-12 flex-shrink-0 shadow-lg"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
