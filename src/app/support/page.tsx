
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
    getDocs
} from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Image as ImageIcon, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { format } from 'date-fns';
import { useLoading } from '@/context/LoadingContext';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

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
    adminId: string | null;
    status: 'waiting' | 'open' | 'closed';
    lastPlayerActivity: any;
    lastAdminActivity: any;
    createdAt: any;
};

export default function SupportPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { hideLoader } = useLoading();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                // Find most recent active chat
                const q = query(
                    collection(db, 'chats'), 
                    where('userId', '==', u.uid), 
                    where('status', 'in', ['waiting', 'open']),
                    limit(1)
                );
                try {
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setCurrentChat({ id: snap.docs[0].id, ...snap.docs[0].data() } as ChatSession);
                    }
                } catch (e) {
                    console.error("Error checking existing chats:", e);
                }
            }
            setLoading(false);
            hideLoader();
        });
        return () => unsubscribeAuth();
    }, [hideLoader]);

    useEffect(() => {
        if (!currentChat) return;
        const q = query(collection(db, `chats/${currentChat.id}/messages`), orderBy('createdAt', 'asc'));
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

    // Player Inactivity Check (5 mins)
    useEffect(() => {
        if (!currentChat || currentChat.status === 'closed') return;
        
        const interval = setInterval(() => {
            const lastActivity = currentChat.lastPlayerActivity?.toDate() || new Date();
            const diffInMins = (Date.now() - lastActivity.getTime()) / 1000 / 60;
            
            if (diffInMins >= 5) {
                updateDoc(doc(db, 'chats', currentChat.id), { status: 'closed' });
                clearInterval(interval);
            }
        }, 30000); // Check every 30s

        return () => clearInterval(interval);
    }, [currentChat]);

    const generateChatId = () => {
        return Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    };

    const startNewChat = async () => {
        if (!user) return;
        const chatId = generateChatId();
        const chatData: ChatSession = {
            id: chatId,
            userId: user.uid,
            userName: user.displayName || 'Player',
            adminId: null,
            status: 'waiting',
            lastPlayerActivity: serverTimestamp(),
            lastAdminActivity: serverTimestamp(),
            createdAt: serverTimestamp(),
        };

        try {
            await setDoc(doc(db, 'chats', chatId), chatData);
            setCurrentChat(chatData);
            toast({ title: "Support Requested", description: "Connecting you to an available admin..." });
        } catch (error) {
            console.error("Failed to create chat:", error);
            toast({ title: "Error", description: "Could not start chat. Try again.", variant: "destructive" });
        }
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!inputText.trim() && !isUploading) || !currentChat || !user) return;

        const textToEncrypt = inputText.trim();
        setInputText('');

        try {
            await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
                text: encryptMessage(textToEncrypt),
                senderId: user.uid,
                senderType: 'player',
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'chats', currentChat.id), {
                lastPlayerActivity: serverTimestamp()
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

            await addDoc(collection(db, `chats/${currentChat.id}/messages`), {
                text: encryptMessage("Media shared"),
                mediaUrl: url,
                mediaType: file.type.startsWith('image/') ? 'image' : 'video',
                senderId: user.uid,
                senderType: 'player',
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'chats', currentChat.id), {
                lastPlayerActivity: serverTimestamp()
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

    if (loading) return null;

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Support requires login</h1>
                <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl h-[calc(100vh-10rem)]">
            {!currentChat ? (
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="bg-primary/10 p-6 rounded-full">
                        <MessageSquare className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-3xl">Support Chat</CardTitle>
                        <CardDescription>Need help? Connect with our team in real-time.</CardDescription>
                    </div>
                    <Button size="lg" onClick={startNewChat} className="px-12 font-bold text-lg">
                        Start New Chat
                    </Button>
                </Card>
            ) : (
                <Card className="h-full flex flex-col overflow-hidden border-primary/20 shadow-xl">
                    <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">Assisting: {user.displayName || 'You'}</CardTitle>
                                {currentChat.status === 'waiting' && <Badge variant="secondary" className="animate-pulse bg-white/20 text-white">Searching Admin...</Badge>}
                            </div>
                            <p className="text-xs opacity-80 font-mono">Chat ID: {currentChat.id}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={closeChat}>
                            <XCircle className="h-6 w-6" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 bg-secondary/30 relative">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={`flex flex-col ${msg.senderType === 'player' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div 
                                            className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                                                msg.senderType === 'player' 
                                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                : 'bg-background border rounded-tl-none'
                                            }`}
                                        >
                                            {msg.mediaUrl ? (
                                                <div className="space-y-2">
                                                    {msg.mediaType === 'image' ? (
                                                        <div className="relative w-full aspect-square min-w-[200px] rounded overflow-hidden">
                                                            <Image src={msg.mediaUrl} alt="shared" fill className="object-cover" />
                                                        </div>
                                                    ) : (
                                                        <video src={msg.mediaUrl} controls className="rounded max-w-full max-h-[300px]" />
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm break-words">{decryptMessage(msg.text)}</p>
                                            )}
                                            <p className={`text-[10px] mt-1 opacity-70 ${msg.senderType === 'player' ? 'text-right' : 'text-left'}`}>
                                                {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                        
                        {currentChat.status === 'closed' && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-6 text-center z-50">
                                <div className="space-y-4">
                                    <p className="font-bold text-lg">This chat session has ended.</p>
                                    <Button onClick={() => setCurrentChat(null)}>Start New Session</Button>
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="p-4 bg-background border-t">
                        <form onSubmit={sendMessage} className="flex w-full items-center gap-2">
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
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || currentChat.status === 'closed'}
                            >
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                            </Button>
                            <Input 
                                placeholder="Securely message support..." 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="flex-1"
                                disabled={currentChat.status === 'closed'}
                            />
                            <Button type="submit" disabled={!inputText.trim() || currentChat.status === 'closed'}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
