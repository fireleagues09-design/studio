'use client';

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLoading } from "@/context/LoadingContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Headset, Send, MessageSquare, ArrowLeft, XCircle, User, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { encryptMessage, decryptMessage } from "@/lib/encryption";

export default function SupportPanel() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { hideLoader } = useLoading();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        const data = userDoc.data();
        if (data?.isAdmin || data?.isSupport || data?.isEmployee) {
          setUser(u);
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
    if (!user || !isMounted) return;

    const q = query(
      collection(db, "chats"),
      where("status", "in", ["waiting", "open"]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user, isMounted]);

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
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsub();
  }, [selectedChat]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !selectedChat || !user || isSending) return;

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

  if (!isMounted || !user) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div className={cn(
          "w-full md:w-80 border-r flex flex-col bg-muted/5 transition-all duration-300",
          selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b bg-background flex items-center justify-between">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Active Queue</h2>
            </div>
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{chats.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-4">
                <div className="p-4 bg-secondary rounded-full opacity-20">
                    <CheckCircle className="h-10 w-10" />
                </div>
                <p className="font-medium italic">Everything is handled!<br/>Queue is empty.</p>
            </div>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChat(c)}
                className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    selectedChat?.id === c.id 
                        ? "bg-primary/10 border-primary shadow-md scale-[0.98]" 
                        : "bg-background hover:bg-accent border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary text-[10px] font-bold">
                            {c.userName?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{c.userName || "Unknown Player"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">ID: {c.userId}</div>
                        <div className="text-[9px] opacity-60 font-mono flex items-center gap-1 mt-1">
                            <span className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                c.status === 'open' ? "bg-green-500" : "bg-amber-500"
                            )} />
                            {c.status === 'open' ? 'Active Chat' : 'Waiting...'}
                        </div>
                    </div>
                </div>
              </div>
            ))
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
                <div>
                    <div className="font-bold flex items-center gap-2">
                        {selectedChat.userName}
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground uppercase font-black tracking-tighter">Player</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">UID: {selectedChat.userId}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={endChat}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold border border-destructive/20"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Close Session
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-muted/10 scroll-smooth">
              {messages.map((m) => {
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
              })}
              <div ref={scrollRef} />
            </div>

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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 bg-muted/5">
            <div className="text-center max-w-sm space-y-6">
              <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Headset className="h-12 w-12 opacity-20" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Support Workspace</h3>
                <p className="text-sm">Select an active chat session from the queue to start assisting players in real-time.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
