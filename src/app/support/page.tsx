'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
    collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, getDocs, limit, where, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Headset, ArrowLeft, MessageSquare, History, PlusCircle, CheckCircle2, ClipboardList, Image as ImageIcon, User as UserIcon, X, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { startSupportChatAction, submitTicketAction } from '@/app/actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
    
    // Ticket States
    const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
    const [ticketUsername, setTicketUsername] = useState("");
    const [ticketMessage, setTicketMessage] = useState("");
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
    
    // File States
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatFileInputRef = useRef<HTMLInputElement>(null);
    const { hideLoader, showLoader } = useLoading();
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
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setTicketUsername(userDoc.data().username || "");
                }

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (userId: string, folder: string): Promise<string | null> => {
        if (!selectedFile) return null;
        const fileName = `${Date.now()}_${selectedFile.name}`;
        // Consistent folder naming as requested
        const storageRef = ref(storage, `support_images/${userId}/${folder}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        return await getDownloadURL(snapshot.ref);
    };

    const handleTicketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !ticketUsername.trim() || !ticketMessage.trim()) return;

        setIsSubmittingTicket(true);
        try {
            const idToken = await user.getIdToken();
            let uploadedUrl = null;
            if (selectedFile) {
                uploadedUrl = await uploadImage(user.uid, 'tickets');
            }

            const encrypted = encryptMessage(ticketMessage.trim());
            
            const result = await submitTicketAction(
                idToken,
                ticketUsername.trim(),
                encrypted,
                uploadedUrl || undefined
            );

            if (result.success && result.ticketId) {
                toast({ title: "Ticket Submitted", description: `Reference: #${result.ticketId}` });
                setIsTicketDialogOpen(false);
                setTicketMessage("");
                setSelectedFile(null);
                setPreviewUrl(null);
                
                setChatId(result.ticketId);
                setIsPendingFirstMessage(false);
                setView('chat');
                syncHistory();
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!text.trim() && !selectedFile) || !user || isSending || activeChat?.status === 'closed') return;

        const messageText = text.trim();
        setIsSending(true);

        try {
            let uploadedUrl = null;
            if (selectedFile) {
                uploadedUrl = await uploadImage(user.uid, 'chat');
            }

            const encrypted = messageText ? encryptMessage(messageText) : "";

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
                    
                    if (uploadedUrl) {
                        await addDoc(collection(db, `chats/${result.chatId}/messages`), {
                            text: "", 
                            imageUrl: uploadedUrl,
                            senderId: user.uid,
                            senderType: 'player',
                            createdAt: serverTimestamp(),
                        });
                    }
                } else {
                    throw new Error(result.message);
                }
            } else if (chatId) {
                await addDoc(collection(db, `chats/${chatId}/messages`), {
                    text: encrypted, 
                    imageUrl: uploadedUrl || null,
                    senderId: user.uid,
                    senderType: 'player',
                    createdAt: serverTimestamp(),
                });

                await updateDoc(doc(db, "chats", chatId), {
                    lastMessageTime: serverTimestamp(),
                });
            }
            
            setText("");
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (err: any) {
            console.error("Send error:", err);
            toast({ title: "Error", description: err.message || "Failed to send message.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const endChat = async () => {
        if (!chatId) return;
        try {
            await updateDoc(doc(db, 'chats', chatId), { status: 'closed' });
            toast({ title: "Session Closed", description: "You have closed the support session." });
            syncHistory();
            setView('home');
        } catch (err) {
            console.error("Close error:", err);
            toast({ title: "Error", description: "Failed to close session.", variant: "destructive" });
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer group shadow-sm overflow-hidden" onClick={startNewChat}>
                            <CardHeader className="flex flex-row items-center gap-4 bg-primary/5 p-6">
                                <div className="p-3 bg-primary text-primary-foreground rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">Live Support</CardTitle>
                                    <CardDescription>Chat with an agent now.</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>

                        <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
                            <DialogTrigger asChild>
                                <Card className="hover:border-blue-500/50 transition-colors cursor-pointer group shadow-sm overflow-hidden border-blue-500/20">
                                    <CardHeader className="flex flex-row items-center gap-4 bg-blue-500/5 p-6">
                                        <div className="p-3 bg-blue-500 text-white rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                                            <PlusCircle className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg">Submit a Ticket</CardTitle>
                                            <CardDescription>Formal report with details.</CardDescription>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Raise a Support Ticket</DialogTitle>
                                    <DialogDescription>Provide details about your issue. Our team will review it shortly.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleTicketSubmit} className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="ticket-username">Your Username</Label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                id="ticket-username" 
                                                className="pl-9"
                                                placeholder="e.g. fireleagues_pro" 
                                                value={ticketUsername} 
                                                onChange={e => setTicketUsername(e.target.value)} 
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ticket-message">Message / Details</Label>
                                        <Textarea 
                                            id="ticket-message" 
                                            placeholder="Explain what happened..." 
                                            className="min-h-[120px] resize-none"
                                            value={ticketMessage}
                                            onChange={e => setTicketMessage(e.target.value)} 
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Screenshot / Attachment (Optional)</Label>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                        />
                                        {!previewUrl ? (
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="w-full h-24 border-dashed flex flex-col gap-2"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Tap to select image from gallery</span>
                                            </Button>
                                        ) : (
                                            <div className="relative w-full aspect-video rounded-lg border bg-secondary/30 overflow-hidden group">
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                                <Button 
                                                    type="button" 
                                                    variant="destructive" 
                                                    size="icon" 
                                                    className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setPreviewUrl(null);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button type="submit" disabled={isSubmittingTicket} className="w-full font-bold">
                                            {isSubmittingTicket ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                            Submit Formal Ticket
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {historyChats.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">
                                <History className="h-4 w-4" />
                                <span>Conversation History</span>
                            </div>
                            <div className="grid gap-3">
                                {historyChats.map((c) => (
                                    <Card key={c.id} className="hover:bg-accent/50 transition-colors cursor-pointer border-border/50" onClick={() => selectHistoryChat(c.id)}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-secondary rounded-lg">
                                                    {c.type === 'ticket' ? <ClipboardList className="h-5 w-5 text-blue-500" /> : <MessageSquare className="h-5 w-5 text-primary" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">Case #{c.id}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">
                                                        {c.createdAt ? format(c.createdAt.toDate(), 'PPP p') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {c.type === 'ticket' && <Badge variant="outline" className="text-[8px] h-4 text-blue-500 border-blue-500/20">TICKET</Badge>}
                                                <Badge variant="secondary" className="font-bold text-[10px] uppercase h-5">Closed</Badge>
                                            </div>
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
                        <h1 className="text-sm font-bold leading-none">
                            {activeChat?.type === 'ticket' ? "Formal Ticket" : "Live Support"}
                        </h1>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">
                            {isPendingFirstMessage ? "Draft" : `Ref: #${chatId}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isPendingFirstMessage && activeChat?.status !== 'closed' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                            onClick={endChat}
                        >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Close
                        </Button>
                    )}
                    {activeChat?.status === 'closed' ? (
                        <Badge variant="outline" className="text-[10px] uppercase py-0.5 font-bold">Closed</Badge>
                    ) : (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
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
                {activeChat?.screenshotUrl && (
                    <div className="flex justify-center mb-4">
                        <div className="max-w-xs w-full bg-muted rounded-xl p-2 border border-dashed border-primary/30">
                            <p className="text-[10px] font-bold uppercase text-center mb-2 text-muted-foreground">Initial Ticket Attachment</p>
                            <a href={activeChat.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                    src={activeChat.screenshotUrl} 
                                    alt="Screenshot" 
                                    className="rounded-lg object-contain w-full hover:opacity-90 transition-opacity"
                                />
                            </a>
                        </div>
                    </div>
                )}

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
                                        {m.text && <p className="leading-relaxed break-words whitespace-pre-wrap">{decryptMessage(m.text)}</p>}
                                        {m.imageUrl && (
                                            <div className={cn("rounded-lg overflow-hidden border", m.text && "mt-2")}>
                                                <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                                                    <img src={m.imageUrl} alt="Attached" className="max-w-full h-auto max-h-60 object-contain" />
                                                </a>
                                            </div>
                                        )}
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

            <div className="pt-4 space-y-3">
                {activeChat?.status !== 'closed' ? (
                    <>
                        {previewUrl && (
                            <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg w-fit ml-4">
                                <div className="relative h-12 w-12 rounded border overflow-hidden">
                                    <img src={previewUrl} className="h-full w-full object-cover" />
                                    <button 
                                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} 
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">Ready to send</span>
                            </div>
                        )}
                        <form onSubmit={sendMessage} className="flex gap-2 items-center bg-card p-2 border rounded-full shadow-md">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={chatFileInputRef} 
                                onChange={handleFileChange} 
                            />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="rounded-full flex-shrink-0"
                                onClick={() => chatFileInputRef.current?.click()}
                            >
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </Button>
                            <Input
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="flex-1 border-0 rounded-full px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                                placeholder="Type your message..."
                                autoComplete="off"
                            />
                            <Button 
                                type="submit" 
                                disabled={(!text.trim() && !selectedFile) || isSending}
                                className="rounded-full w-10 h-10 p-0 flex-shrink-0"
                            >
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="p-4 bg-secondary/50 rounded-xl text-center border border-dashed flex items-center justify-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">This session is closed. Submit a new ticket if you need more help.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
