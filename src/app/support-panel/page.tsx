
"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLoading } from "@/context/LoadingContext";
import { useRouter } from "next/navigation";

export default function SupportPanel() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { hideLoader } = useLoading();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Verify role before showing panel
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
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("status", "in", ["waiting", "open"]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!selectedChat) return;

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
    if (!text.trim() || !selectedChat || !user) return;

    const msgText = text.trim();
    setText("");

    try {
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text: msgText,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", selectedChat.id), {
        status: "open",
        assignedAdmin: user.uid,
        lastMessageTime: serverTimestamp()
      });
    } catch (err) {
      console.error("Staff send error:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] border-t">

      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col bg-muted/5">
        <div className="p-4 border-b bg-background font-bold">Support Queue</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Queue is empty</div>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChat(c)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedChat?.id === c.id 
                    ? "bg-primary/10 border-primary shadow-sm" 
                    : "bg-background hover:bg-accent"
                }`}
              >
                <div className="font-bold text-sm truncate">{c.userName || "Player"}</div>
                <div className="text-[10px] opacity-60 font-mono mt-1">ID: {c.id.substring(0, 8)}...</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-background flex justify-between items-center">
              <div>
                <div className="font-bold">{selectedChat.userName}</div>
                <div className="text-xs text-muted-foreground">Active Session</div>
              </div>
              <button 
                onClick={() => updateDoc(doc(db, 'chats', selectedChat.id), { status: 'closed' })}
                className="text-xs text-destructive font-bold hover:underline"
              >
                End Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4 bg-muted/10">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;

                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm text-white ${
                        isMe
                          ? "bg-green-600 rounded-br-none"
                          : "bg-gray-700 rounded-tl-none"
                      }`}
                    >
                      {!isMe && <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Player</div>}
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t bg-background flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 border rounded-full px-4 py-2 bg-muted/30 focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Reply to player..."
              />
              <button 
                type="submit" 
                disabled={!text.trim()}
                className="bg-green-600 text-white px-6 rounded-full font-bold transition-transform active:scale-95 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-2 opacity-20">💬</div>
              <p>Select a chat from the sidebar to begin assisting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
