
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
import { Headset, Send, MessageSquare, ArrowLeft, XCircle, CheckCircle, Loader2, History, Clock, Trash2, RotateCcw, ShieldCheck, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [isAuthorized, isMounted, activeTab]);

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
    setText("");
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
    } catch (err) {
      console.error("Staff send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const endChat = async () => {
      if (!selectedChat) return;
      await updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' });
      setSelectedChat(null);
      toast({ title: "Session Closed", description: "Case has been moved to history." });
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
          toast({ title: "Success", description: "Chat session has been reopened." });
      } catch (err) {
          console.error("Reopen error:", err);
          toast({ title: "Error", description: "Failed to reopen chat.", variant: "destructive" });
      }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
        await deleteDoc(doc(db, "chats", chatToDelete));
        if (selectedChat?.id === chatToDelete) {
            setSelectedChat(null);
        }
        toast({ title: "Success", description: "Chat deleted from history." });
    } catch (err) {
        console.error("Delete error:", err);
        toast({ title: "Error", description: "Failed to delete chat.", variant: "destructive" });
    } finally {
        setChatToDelete(null);
    }
  };

  if (!isMounted || !isAuthorized) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-tight">TERMINATE CONVERSATION</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently scrub this encrypted conversation from our database. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full font-bold">
              DELETE FOREVER
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={cn(
          "w-full md:w-80 border-r flex flex-col bg-muted/5 transition-all duration-300 shrink-0",
          selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b bg-background/50 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="font-black uppercase tracking-tighter text-sm">Staff Workspace</h2>
                </div>
                <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest">{chats.length}</Badge>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full p-1 bg-secondary/50">
                    <TabsTrigger value="active" className="text-[10px] uppercase font-black tracking-widest rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">LIVE QUEUE</TabsTrigger>
                    <TabsTrigger value="history" className="text-[10px] uppercase font-black tracking-widest rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">ARCHIVES</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chats.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-4 animate-in fade-in duration-500">
                <div className="p-6 bg-secondary rounded-3xl opacity-20 border-2 border-dashed border-muted-foreground">
                    {activeTab === 'active' ? <CheckCircle className="h-10 w-10" /> : <History className="h-10 w-10" />}
                </div>
                <p className="font-black uppercase text-[10px] tracking-[0.2em] max-w-[120px] mx-auto">
                    {activeTab === 'active' ? "Queue Secured.\nAll Clear." : "No Archived Sessions Found."}
                </p>
            </div>
          ) : (
            chats.map((c) => {
              const registeredName = c.playerDisplayName || c.userName || "Unknown Player";
              const fireleaguesHandle = c.userHandle && c.userHandle !== 'unregistered' ? c.userHandle : null;
              const isActive = selectedChat?.id === c.id;
              
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedChat(c)}
                  className={cn(
                      "p-4 rounded-2xl border transition-all duration-200 relative group active:scale-[0.98]",
                      isActive 
                          ? "bg-primary/5 border-primary/30 shadow-md" 
                          : "bg-background hover:bg-accent border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-xl border border-border/50">
                          {c.playerPhotoURL && <AvatarImage src={c.playerPhotoURL} alt={registeredName} />}
                          <AvatarFallback className="bg-secondary text-[12px] font-black uppercase">
                              {registeredName.charAt(0)}
                          </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                          <div className="font-black text-sm truncate uppercase tracking-tight">{registeredName}</div>
                          {fireleaguesHandle && (
                            <div className="text-[10px] text-blue-400 font-mono font-bold truncate">@{fireleaguesHandle}</div>
                          )}
                          <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mt-1 opacity-60">
                              <span className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  c.status === 'open' ? "bg-green-500" : c.status === 'closed' ? "bg-muted-foreground" : "bg-amber-500"
                              )} />
                              {c.status === 'open' ? 'ENGAGED' : c.status === 'closed' ? 'RESOLVED' : 'WAITING'}
                          </div>
                      </div>
                      
                      {activeTab === 'history' && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg"
                            onClick={(e) => {
                                e.stopPropagation();
                                setChatToDelete(c.id);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={cn(
          "flex-1 flex flex-col bg-background transition-all duration-300",
          !selectedChat ? "hidden md:flex" : "flex"
      )}>
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-background/80 backdrop-blur-md flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden hover:bg-secondary rounded-full" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-xl border border-border/50">
                        {selectedChat.playerPhotoURL && <AvatarImage src={selectedChat.playerPhotoURL} alt={selectedChat.playerDisplayName} />}
                        <AvatarFallback className="text-[10px] font-black uppercase">
                            {(selectedChat.playerDisplayName || "P").charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                        <div className="font-black text-sm uppercase flex items-center gap-2">
                            <span>{selectedChat.playerDisplayName || selectedChat.userName || "Unknown Player"}</span>
                            <span className="text-[8px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground uppercase font-black tracking-widest border border-border/50">PLAYER_ID: {selectedChat.id}</span>
                        </div>
                        {selectedChat.userHandle && selectedChat.userHandle !== 'unregistered' && (
                          <p className="text-[10px] text-blue-400 font-mono font-bold">HANDLE: @{selectedChat.userHandle}</p>
                        )}
                    </div>
                </div>
              </div>
              {selectedChat.status !== 'closed' ? (
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={endChat}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 font-black text-[10px] uppercase tracking-widest border border-destructive/20 rounded-full px-4 h-8"
                >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    CLOSE
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="font-black text-[10px] uppercase tracking-widest gap-1.5 text-primary hover:bg-primary/10 border-primary/30 rounded-full h-8 px-4"
                        onClick={reopenChat}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        REOPEN
                    </Button>
                    <Badge variant="secondary" className="font-black text-[10px] uppercase tracking-widest gap-1.5 bg-muted/50 rounded-full px-3 h-8">
                        <History className="h-3.5 w-3.5" />
                        ARCHIVE
                    </Badge>
                </div>
              )}
            </div>

            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto flex flex-col gap-4 p-6 bg-muted/5 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center opacity-30 text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Accessing Encrypted Logs...</p>
                    </div>
                </div>
              ) : (
                messages.map((m, idx) => {
                    const isMe = m.senderType === 'admin';
                    const showMeta = idx === 0 || messages[idx-1].senderType !== m.senderType;
                    
                    return (
                    <div key={m.id} className={cn("flex w-full mb-1", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn("flex flex-col max-w-[85%] md:max-w-[75%]", isMe ? "items-end" : "items-start")}>
                            {showMeta && (
                                <div className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 px-1 flex items-center gap-1.5", isMe ? "text-primary flex-row-reverse" : "text-muted-foreground")}>
                                    {isMe ? <ShieldCheck className="h-2.5 w-2.5" /> : <UserIcon className="h-2.5 w-2.5" />}
                                    {isMe ? 'STAFF_RESPONSE' : 'PLAYER_MSG'}
                                </div>
                            )}
                            <div className={cn(
                                "px-4 py-3 rounded-2xl text-sm shadow-sm font-medium leading-relaxed relative",
                                isMe 
                                    ? "bg-green-600 text-white rounded-br-none border-b-2 border-green-700/30" 
                                    : "bg-gray-700 text-white rounded-bl-none border-b-2 border-gray-800/30"
                            )}>
                                <p className="break-words whitespace-pre-wrap">{decryptMessage(m.text)}</p>
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1.5 px-2 opacity-40",
                                isMe ? "text-right" : "text-left"
                            )}>
                                {m.createdAt ? format(m.createdAt.toDate(), 'p') : 'SYNCING...'}
                            </span>
                        </div>
                    </div>
                    );
                })
              )}
            </div>

            {selectedChat.status !== 'closed' ? (
                <form onSubmit={sendMessage} className="p-4 border-t bg-background/50 backdrop-blur-md flex gap-2 items-center">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="flex-1 border-0 rounded-full px-6 py-6 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/20 text-base placeholder:text-muted-foreground/50 font-medium"
                        placeholder="Reply to player..."
                        autoComplete="off"
                    />
                    <Button 
                        type="submit" 
                        disabled={!text.trim() || isSending}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground w-12 h-12 rounded-full shadow-lg transition-all active:scale-90 disabled:opacity-50 p-0 flex items-center justify-center flex-shrink-0"
                    >
                        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
            ) : (
                <div className="p-8 border-t bg-muted/20 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground opacity-30" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Session Locked in Archive</p>
                    </div>
                </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 bg-muted/5">
            <div className="text-center max-w-sm space-y-8 animate-in fade-in duration-700">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-muted/50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border-2 border-dashed border-muted-foreground/20">
                    {activeTab === 'active' ? <Headset className="h-16 w-16 opacity-10" /> : <History className="h-16 w-16 opacity-10" />}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black uppercase tracking-tight text-foreground">
                    {activeTab === 'active' ? 'TERMINAL_IDLE' : 'ARCHIVE_READY'}
                </h3>
                <p className="text-xs uppercase tracking-[0.15em] font-bold leading-relaxed opacity-60">
                    {activeTab === 'active' 
                        ? 'Select a waiting signal from the primary queue to establish an encrypted link with the player.' 
                        : 'Access past communication cycles to review resolutions and tactical data.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
