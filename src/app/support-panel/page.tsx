
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
import { Headset, Send, MessageSquare, ArrowLeft, XCircle, CheckCircle, Loader2, History, Clock, Trash2, RotateCcw } from "lucide-react";
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation from the history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={cn(
          "w-full md:w-80 border-r flex flex-col bg-muted/5 transition-all duration-300",
          selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b bg-background space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h2 className="font-bold">Support Center</h2>
                </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-4">
                <div className="p-4 bg-secondary rounded-full opacity-20">
                    {activeTab === 'active' ? <CheckCircle className="h-10 w-10" /> : <History className="h-10 w-10" />}
                </div>
                <p className="font-medium italic">
                    {activeTab === 'active' ? "Everything is handled!\nQueue is empty." : "No conversation history found."}
                </p>
            </div>
          ) : (
            chats.map((c) => {
              const registeredName = c.playerDisplayName || c.userName || "Unknown Player";
              const fireleaguesHandle = c.userHandle && c.userHandle !== 'unregistered' ? c.userHandle : null;
              
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedChat(c)}
                  className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 relative group",
                      selectedChat?.id === c.id 
                          ? "bg-primary/10 border-primary shadow-md scale-[0.98]" 
                          : "bg-background hover:bg-accent border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                          {c.playerPhotoURL && <AvatarImage src={c.playerPhotoURL} alt={registeredName} />}
                          <AvatarFallback className="bg-secondary text-[12px] font-bold">
                              {registeredName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate text-foreground">{registeredName}</div>
                          {fireleaguesHandle && (
                            <div className="text-[10px] text-blue-400 font-mono truncate">@{fireleaguesHandle}</div>
                          )}
                          <div className="text-[9px] opacity-60 font-mono flex items-center gap-1 mt-1">
                              <span className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  c.status === 'open' ? "bg-green-500" : c.status === 'closed' ? "bg-muted-foreground" : "bg-amber-500"
                              )} />
                              {c.status === 'open' ? 'Active Session' : c.status === 'closed' ? 'Closed' : 'Waiting...'}
                          </div>
                      </div>
                      
                      {activeTab === 'history' && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
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
            <div className="p-4 border-b bg-background flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        {selectedChat.playerPhotoURL && <AvatarImage src={selectedChat.playerPhotoURL} alt={selectedChat.playerDisplayName} />}
                        <AvatarFallback className="text-[10px] font-bold">
                            {(selectedChat.playerDisplayName || "P").charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-bold flex items-center gap-2">
                            <span className="text-foreground">{selectedChat.playerDisplayName || selectedChat.userName || "Unknown Player"}</span>
                            <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground uppercase font-black tracking-tighter">Player</span>
                        </div>
                        {selectedChat.userHandle && selectedChat.userHandle !== 'unregistered' && (
                          <p className="text-[10px] text-blue-400 font-mono">Handle: @{selectedChat.userHandle}</p>
                        )}
                    </div>
                </div>
              </div>
              {selectedChat.status !== 'closed' ? (
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={endChat}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold border border-destructive/20"
                >
                    <XCircle className="h-4 w-4 mr-1" />
                    Close Session
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="font-bold gap-1 text-primary hover:bg-primary/10 border-primary/20"
                        onClick={reopenChat}
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reopen Session
                    </Button>
                    <Badge variant="outline" className="font-bold gap-1 text-muted-foreground">
                        <History className="h-3 w-3" />
                        History Mode
                    </Badge>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setChatToDelete(selectedChat.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              )}
            </div>

            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-muted/10 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center">
                    <p className="text-sm italic">Loading message history...</p>
                </div>
              ) : (
                messages.map((m) => {
                    const isMe = m.senderType === 'admin';
                    return (
                    <div key={m.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                        <div className="flex flex-col max-w-[85%] md:max-w-[75%]">
                            <div className={cn(
                                "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                isMe ? "bg-green-600 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none"
                            )}>
                                {!isMe && (
                                    <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-green-400">
                                        Player Message
                                    </div>
                                )}
                                <p className="leading-relaxed break-words whitespace-pre-wrap">{decryptMessage(m.text)}</p>
                            </div>
                            <span className={cn(
                                "text-[9px] font-bold text-muted-foreground mt-1.5 px-1 opacity-60",
                                isMe ? "text-right" : "text-left"
                            )}>
                                {isMe ? 'You (Staff)' : 'Player'} • {m.createdAt ? format(m.createdAt.toDate(), 'p') : '...'}
                            </span>
                        </div>
                    </div>
                    );
                })
              )}
            </div>

            {selectedChat.status !== 'closed' ? (
                <form onSubmit={sendMessage} className="p-4 border-t bg-background flex gap-2 items-center">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="flex-1 border-2 rounded-full px-5 py-6 bg-muted/30 focus:ring-2 focus:ring-green-600 focus:outline-none text-base"
                        placeholder="Type your reply..."
                        autoComplete="off"
                    />
                    <Button 
                        type="submit" 
                        disabled={!text.trim() || isSending}
                        className="bg-green-600 hover:bg-green-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg transition-all active:scale-90 disabled:opacity-50 p-0 flex items-center justify-center"
                    >
                        {isSending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                    </Button>
                </form>
            ) : (
                <div className="p-6 border-t bg-muted/20 text-center">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4" />
                        This conversation has been closed and saved to history.
                    </p>
                </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 bg-muted/5">
            <div className="text-center max-w-sm space-y-6">
              <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                {activeTab === 'active' ? <Headset className="h-12 w-12 opacity-20" /> : <History className="h-12 w-12 opacity-20" />}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {activeTab === 'active' ? 'Support Workspace' : 'History Viewer'}
                </h3>
                <p className="text-sm">
                    {activeTab === 'active' 
                        ? 'Select an active chat session from the queue to start assisting players in real-time.' 
                        : 'Select a closed conversation to review the chat history.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
