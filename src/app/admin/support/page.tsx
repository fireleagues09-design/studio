
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
    serverTimestamp, 
    updateDoc,
    getDoc
} from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Image as ImageIcon, Loader2, XCircle, User, ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    adminId: string | null;
    status: 'waiting' | 'open' | 'closed';
    lastPlayerActivity: any;
    lastAdminActivity: any;
    createdAt: any;
};

export default function AdminSupportPanel() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const userDoc = await getDoc(doc(db, 'users', u.uid));
                if (userDoc.exists() && userDoc.data().isAdmin) {
                    setUser(u);
                    setIsAdmin(true);
                } else {
                    router.push('/');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    // Listener for all waiting or open chats
    useEffect(() => {
        if (!isAdmin) return;
        const q = query(collection(db, 'chats'), where('status', 'in', ['waiting', 'open']), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            const chatList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
            setChats(chatList);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Listener for messages of selected chat
    useEffect(() => {
        if (!selectedChat) return;
        const q = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        // Auto-reassignment logic (Admin Inactivity - 5 mins)
        const unsubChat = onSnapshot(doc(db, 'chats', selectedChat.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as ChatSession;
                setSelectedChat(data);

                if (data.adminId === user?.uid && data.status === 'open') {
                    const lastAdminActivity = data.lastAdminActivity?.toDate() || new Date();
                    const diff = (Date.now() - lastAdminActivity.getTime()) / 1000 / 60;
                    if (diff >= 5) {
                        // Move back to queue
                        updateDoc(doc(db, 'chats', data.id), { 
                            adminId: null, 
                            status: 'waiting' 
                        });
                        setSelectedChat(null);
                        toast({ 
                            title: "Chat Moved", 
                            description: "The chat was moved back to queue due to 5 mins inactivity.",
                            variant: "destructive"
                        });
                    }
                }
            }
        });

        return () => {
            unsubscribe();
            unsubChat();
        };
    }, [selectedChat?.id, user?.uid, toast]);

    const pickChat = async (chat: ChatSession) => {
        if (!user) return;
        if (chat.adminId && chat.adminId !== user.uid) {
            toast({ title: "Access Denied", description: "Another admin is already assisting this player.", variant: "destructive" });
            return;
        }

        await updateDoc(doc(db, 'chats', chat.id), {
            adminId: user.uid,
            status: 'open',
            lastAdminActivity: serverTimestamp(),
        });
        setSelectedChat(chat);
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!inputText.trim() && !isUploading) || !selectedChat || !user) return;

        const textToEncrypt = inputText.trim();
        setInputText('');

        try {
            await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
                text: encryptMessage(textToEncrypt),
                senderId: user.uid,
                senderType: 'admin',
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'chats', selectedChat.id), {
                lastAdminActivity: serverTimestamp()
            });
        } catch (err) {
            toast({ title: "Failed to send", variant: "destructive" });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedChat || !user) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `support/${selectedChat.id}/${Date.now()}_${file.name}`);
            const uploadSnap = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(uploadSnap.ref);

            await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
                text: encryptMessage("Media shared"),
                mediaUrl: url,
                mediaType: file.type.startsWith('image/') ? 'image' : 'video',
                senderId: user.uid,
                senderType: 'admin',
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'chats', selectedChat.id), {
                lastAdminActivity: serverTimestamp()
            });
        } catch (err) {
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const closeChat = async () => {
        if (!selectedChat) return;
        await updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' });
        setSelectedChat(null);
    };

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-8rem)]">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
                </Button>
                <h1 className="text-3xl font-bold">Support Management</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Chat Queue */}
                <Card className="lg:col-span-1 flex flex-col border-primary/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Active Requests ({chats.length})
                        </CardTitle>
                        <CardDescription>Select a user to begin assisting.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-[500px]">
                            <div className="p-4 space-y-2">
                                {chats.map((chat) => (
                                    <div 
                                        key={chat.id}
                                        onClick={() => pickChat(chat)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                            selectedChat?.id === chat.id 
                                            ? 'bg-primary text-primary-foreground border-primary' 
                                            : chat.adminId && chat.adminId !== user?.uid 
                                                ? 'bg-muted opacity-60 cursor-not-allowed'
                                                : 'hover:bg-secondary bg-background'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold flex items-center gap-2">
                                                <User className="h-4 w-4" /> {chat.userName}
                                            </span>
                                            {chat.adminId && <span className="text-[10px] uppercase font-bold px-1 bg-white/20 rounded">TAKEN</span>}
                                        </div>
                                        <p className="text-[10px] font-mono opacity-70">ID: {chat.id}</p>
                                        <div className="flex justify-between mt-2 text-[10px] opacity-80">
                                            <span>Requested {format(chat.createdAt?.toDate() || new Date(), 'HH:mm')}</span>
                                            <span className="capitalize">{chat.status}</span>
                                        </div>
                                    </div>
                                ))}
                                {chats.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No active support requests.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="lg:col-span-2 flex flex-col border-primary/10 shadow-lg overflow-hidden">
                    {selectedChat ? (
                        <>
                            <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Assisting: {selectedChat.userName}</CardTitle>
                                    <p className="text-xs opacity-80 font-mono">Chat ID: {selectedChat.id}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={closeChat}>
                                        <XCircle className="h-5 w-5 mr-2" /> Close Chat
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 bg-secondary/30">
                                <ScrollArea className="h-[400px] p-4">
                                    <div className="space-y-4">
                                        {messages.map((msg) => (
                                            <div 
                                                key={msg.id} 
                                                className={`flex flex-col ${msg.senderType === 'admin' ? 'items-end' : 'items-start'}`}
                                            >
                                                <div 
                                                    className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                                                        msg.senderType === 'admin' 
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
                                                    <p className={`text-[10px] mt-1 opacity-70 ${msg.senderType === 'admin' ? 'text-right' : 'text-left'}`}>
                                                        {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={scrollRef} />
                                    </div>
                                </ScrollArea>
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
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                                    </Button>
                                    <Input 
                                        placeholder="Type an encrypted reply..." 
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" disabled={!inputText.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </CardFooter>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                            <div className="bg-primary/10 p-6 rounded-full">
                                <AlertCircle className="h-12 w-12 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">No Chat Selected</h2>
                            <p className="text-muted-foreground max-w-xs">Select a player from the queue on the left to start the assistance process.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
