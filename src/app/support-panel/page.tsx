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
import { Headset, Send, MessageSquare, ArrowLeft, XCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

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

  // Fetch chats
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

  // Fetch messages
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

  // Send message
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !selectedChat || !user || isSending) return;

    const msgText = text.trim();
    setText("");
    setIsSending(true);

    try {
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text: msgText,
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
    <div className="flex h-[calc(100vh-4rem)] border-t overflow-hidden">

      {/* Sidebar */}
      <div className={cn(
          "w-full md:w-80 border-r flex flex-col bg-muted/5 transition-all duration-300",
          selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b bg-background flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Active Queue</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Headset className="h-8 w-8 opacity-20" />
                <p>No active sessions</p>
            </div>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChat(c)}
                className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedChat?.id === c.id 
                        ? "bg-primary/10 border-primary shadow-sm" 
                        : "bg-background hover:bg-accent border-transparent"
                )}
              >
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="font-bold text-sm truncate">{c.userName || "Player"}</div>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <div className="text-[10px] opacity-60 font-mono">ID: {c.id.substring(0, 8)}</div>
                    <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        c.status === 'open' ? "bg-green-500" : "bg-amber-500"
                    )} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
          "flex-1 flex flex-col bg-background transition-all duration-300",
          !selectedChat ? "hidden md:flex" : "flex"
      )}>
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-background flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="font-bold flex items-center gap-2">
                        {selectedChat.userName}
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">Player</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active Session
                    </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={endChat}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold"
              >
                <XCircle className="h-4 w-4 mr-1" />
                End
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-muted/10">
              {messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm italic">
                      No messages yet in this session.
                  </div>
              )}
              {messages.map((m) => {
                const isMe = m.senderType === 'admin';
                return (
                  <div key={m.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                    <div className="flex flex-col max-w-[85%] md:max-w-[70%] items-start">
                        <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm shadow-sm text-white",
                            isMe ? "bg-green-600 rounded-br-none" : "bg-gray-700 rounded-bl-none"
                        )}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                                {isMe ? 'You' : 'Player'}
                            </div>
                            {m.text}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-60">
                            {m.createdAt ? format(m.createdAt.toDate(), 'p') : '...'}
                        </span>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t bg-background flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 border rounded-full px-4 py-2 bg-muted/30 focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Reply to player..."
                autoComplete="off"
              />
              <Button 
                type="submit" 
                disabled={!text.trim() || isSending}
                className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-full font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Support Workspace</h3>
              <p>Select an active chat from the sidebar queue to start assisting players.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
