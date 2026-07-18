'use client';

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc, limit, deleteDoc
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLoading } from "@/context/LoadingContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Headset, Send, MessageSquare, ArrowLeft, XCircle, CheckCircle, Loader2, History, Trash2, RotateCcw, ShieldCheck, User as UserIcon, ClipboardList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SupportPanel() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [activeType, setActiveType] = useState<'chat' | 'ticket'>('chat');
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { hideLoader } = useLoading();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        const data = userDoc.data();
        if (data?.isAdmin || data?.isSupport || data?.isEmployee) {
          setUser(u);
          setIsAuthorized(true);
        } else {
          router.push("/");
        }
      } else {
        router.push("/login");
      }
      hideLoader();
    });
    return () => unsub();
  }, [hideLoader, router]);

  useEffect(() => {
    if (!isAuthorized || !isMounted) return;

    const statusFilter = activeTab === 'active' ? ["waiting", "open"] : ["closed"];
    const q = query(
      collection(db, "chats"),
      where("status", "in", statusFilter),
      where("type", "==", activeType),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [isAuthorized, isMounted, activeTab, activeType]);

  useEffect(() => {
    if (!selectedChat) {
        setMessages([]);
        return;
    }

    const q = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [selectedChat]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !selectedChat || !user || isSending || selectedChat.status === 'closed') return;

    const msgText = text.trim();
    setIsSending(true);

    try {
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text: encryptMessage(msgText), 
        senderId: user.uid,
        senderType: 'admin',
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", selectedChat.id), {
        status: "open",
        assignedAdmin: user.uid,
        lastMessageTime: serverTimestamp()
      });

      setText("");
    } catch (err: any) {
      console.error("Staff send error:", err);
      toast({ title: "Error", description: err.message || "Failed to send response.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const endChat = async () => {
      if (!selectedChat) return;
      await updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' });
      setSelectedChat(null);
      toast({ title: "Session Closed", description: "Case resolved." });
  };

  const reopenChat = async () => {
      if (!selectedChat || !user) return;
      try {
          await updateDoc(doc(db, 'chats', selectedChat.id), { 
              status: 'open',
              assignedAdmin: user.uid,
              lastMessageTime: serverTimestamp()
          });
          setActiveTab('active');
          toast({ title: "Success", description: "Session reopened." });
      } catch (err) {
          console.error("Reopen error:", err);
          toast({ title: "Error", description: "Failed to reopen.", variant: "destructive" });
      }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
        await deleteDoc(doc(db, "chats", chatToDelete));
        if (selectedChat?.id === chatToDelete) setSelectedChat(null);
        toast({ title: "Success", description: "Session deleted permanently." });
    } catch (err) {
        console.error("Delete error:", err);
        toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    } finally {
        setChatToDelete(null);
    }
  };

  const deleteMessage = async (messageId: string) => {
      if (!selectedChat) return;
      try {
          await deleteDoc(doc(db, `chats/${selectedChat.id}/messages`, messageId));
          toast({ title: "Message Unsent" });
      } catch (err) {
          console.error("Message delete error:", err);
          toast({ title: "Error", description: "Could not unsend message.", variant: 'destructive' });
      }
  }

  if (!isMounted || !isAuthorized) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation History?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this support session (Ticket ID: {chatToDelete}) from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-white hover:bg-destructive/90">
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={cn(
          "w-full md:w-80 border-r flex flex-col bg-muted/5 transition-all duration-300 shrink-0",
          selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-sm tracking-tight">Staff Panel</h2>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">{chats.length}</Badge>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active" className="text-xs font-bold">Active</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs font-bold">Archived</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
                <Button 
                    variant={activeType === 'chat' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="flex-1 h-7 text-[10px] font-black uppercase"
                    onClick={() => { setActiveType('chat'); setSelectedChat(null); }}
                >
                    <MessageSquare className="h-3 w-3 mr-1.5" />
                    Chats
                </Button>
                <Button 
                    variant={activeType === 'ticket' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="flex-1 h-7 text-[10px] font-black uppercase"
                    onClick={() => { setActiveType('ticket'); setSelectedChat(null); }}
                >
                    <ClipboardList className="h-3 w-3 mr-1.5" />
                    Tickets
                </Button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {chats.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
                <CheckCircle className="h-8 w-8 opacity-20" />
                <p>{activeTab === 'active' ? `No ${activeType}s in queue.` : `No archived ${activeType}s.`}</p>
            </div>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChat(c)}
                className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer relative group",
                    selectedChat?.id === c.id 
                        ? "bg-primary/5 border-primary/20 shadow-sm" 
                        : "hover:bg-accent border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border shrink-0">
                        {c.playerPhotoURL && <AvatarImage src={c.playerPhotoURL} alt={c.playerDisplayName} />}
                        <AvatarFallback className="text-xs bg-secondary">{(c.playerDisplayName || "P").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                            <div className="font-bold text-sm truncate text-foreground">{c.playerDisplayName || "Unknown Player"}</div>
                            {c.type === 'ticket' && <Badge variant="outline" className="text-[7px] px-1 h-3 border-blue-500/30 text-blue-500 uppercase tracking-tighter">Ticket</Badge>}
                        </div>
                        {c.userHandle && c.userHandle !== 'unregistered' && (
                          <div className="text-[10px] text-primary/70 font-mono">@{c.userHandle}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                c.status === 'open' ? "bg-green-500" : c.status === 'closed' ? "bg-muted-foreground" : "bg-amber-500"
                            )} />
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{c.status}</span>
                        </div>
                    </div>
                    {activeTab === 'history' ? (
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                              e.stopPropagation();
                              setChatToDelete(c.id);
                          }}
                      >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    ) : (
                        <div className="text-[9px] font-bold text-muted-foreground tabular-nums">#{c.id.slice(-4)}</div>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={cn(
          "flex-1 flex flex-col bg-card/30 transition-all duration-300",
          !selectedChat ? "hidden md:flex" : "flex"
      )}>
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-background/50 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 border flex-shrink-0">
                    {selectedChat.playerPhotoURL && <AvatarImage src={selectedChat.playerPhotoURL} />}
                    <AvatarFallback className="bg-secondary">{(selectedChat.playerDisplayName || "P").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="leading-none min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate whitespace-nowrap">{selectedChat.playerDisplayName || "Unknown Player"}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">Ref: #{selectedChat.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedChat.status !== 'closed' && (
                    <div className="flex items-center gap-2 mr-2 pr-2 border-r">
                        <Switch 
                            id="wa-toggle"
                            checked={selectedChat.whatsappEnabled === true}
                            onCheckedChange={(checked) => {
                                updateDoc(doc(db, "chats", selectedChat.id), { whatsappEnabled: checked });
                                toast({ title: checked ? "WhatsApp Enabled" : "WhatsApp Disabled" });
                            }}
                        />
                        <Label htmlFor="wa-toggle" className="text-[9px] font-black uppercase text-muted-foreground cursor-pointer">WhatsApp</Label>
                    </div>
                )}
                
                {selectedChat.status !== 'closed' ? (
                    <Button variant="outline" size="sm" onClick={endChat} className="h-8 text-destructive border-destructive/20 hover:bg-destructive/10 text-xs font-bold">
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Resolve Case
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-bold gap-1 text-muted-foreground bg-muted/50">
                            <History className="h-3 w-3" />
                            Archived
                        </Badge>
                        <Button variant="outline" size="sm" onClick={reopenChat} className="h-8 text-primary border-primary/20 hover:bg-primary/10 text-xs font-bold shadow-sm">
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Reopen
                        </Button>
                    </div>
                )}
              </div>
            </div>

            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto flex flex-col gap-4 p-6 bg-muted/5 scrollbar-hide"
            >
              {selectedChat.screenshotUrl && (
                  <div className="flex justify-start mb-6">
                      <div className="max-w-xs w-full bg-card rounded-xl p-3 border shadow-sm">
                          <div className="flex items-center gap-2 mb-2 text-blue-500">
                              <UserIcon className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Initial Ticket Attachment</span>
                          </div>
                          <a href={selectedChat.screenshotUrl} target="_blank" rel="noopener noreferrer">
                              <img src={selectedChat.screenshotUrl} alt="Screenshot" className="rounded-lg object-contain w-full hover:brightness-90 transition-all cursor-zoom-in" />
                          </a>
                      </div>
                  </div>
              )}

              {messages.map((m, idx) => {
                  const isMe = m.senderType === 'admin';
                  return (
                    <div key={m.id} className={cn("flex w-full group", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn("flex flex-col max-w-[80%] relative", isMe ? "items-end" : "items-start")}>
                            {selectedChat.status !== 'closed' && (
                                <button 
                                    onClick={() => deleteMessage(m.id)}
                                    className={cn(
                                        "absolute top-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-full shadow-sm z-10",
                                        isMe ? "-left-8" : "-right-8"
                                    )}
                                    title="Unsend message"
                                >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                </button>
                            )}
                            <div className={cn(
                                "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                isMe 
                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                    : "bg-card border text-foreground rounded-tl-none"
                            )}>
                                {m.text && <p className="whitespace-pre-wrap leading-relaxed">{decryptMessage(m.text)}</p>}
                                {m.imageUrl && (
                                    <div className={cn("rounded-lg overflow-hidden border", m.text && "mt-2")}>
                                        <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                                            <img src={m.imageUrl} alt="Staff attachment" className="max-w-full h-auto max-h-60 object-contain" />
                                        </a>
                                    </div>
                                )}
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-1 px-1 font-medium">
                                {m.createdAt ? format(m.createdAt.toDate(), 'p') : '...'}
                            </span>
                        </div>
                    </div>
                  );
              })}
            </div>

            {selectedChat.status !== 'closed' ? (
                <div className="p-4 border-t bg-background shadow-2xl space-y-3">
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="flex-1 rounded-full px-4"
                            placeholder={selectedChat.type === 'ticket' ? "Reply to ticket..." : "Type response..."}
                            autoComplete="off"
                            disabled={isSending}
                        />
                        <Button type="submit" disabled={!text.trim() || isSending} className="rounded-full w-10 h-10 p-0 flex-shrink-0">
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            ) : (
                <div className="p-6 border-t bg-muted/20 text-center flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <History className="h-4 w-4" />
                        Archived Session
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setChatToDelete(selectedChat.id)} className="text-destructive font-bold text-[10px]">
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        PURGE DATA
                    </Button>
                </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 opacity-40">
              <div className="p-8 bg-secondary/30 rounded-full mb-6">
                {activeType === 'chat' ? <MessageSquare className="h-16 w-16" /> : <ClipboardList className="h-16 w-16" />}
              </div>
              <p className="text-lg font-black uppercase tracking-tighter">Workspace Idle</p>
              <p className="text-xs font-medium max-w-xs text-center mt-2">Select a {activeType} from the queue to start assisting players.</p>
          </div>
        )}
      </div>
    </div>
  );
}