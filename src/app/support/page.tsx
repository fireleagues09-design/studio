
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
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SupportPage() {
  const [user, setUser] = useState<any>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Get/Create chat
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        const q = query(
          collection(db, "chats"),
          where("userId", "==", user.uid),
          where("status", "in", ["waiting", "open"]),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          setChatId(snap.docs[0].id);
        } else {
          const ref = await addDoc(collection(db, "chats"), {
            userId: user.uid,
            userName: user.displayName || user.email?.split('@')[0] || "Player",
            status: "waiting",
            createdAt: serverTimestamp(),
            lastMessageTime: serverTimestamp(),
          });
          setChatId(ref.id);
        }
      } catch (err) {
        console.error("Chat init error:", err);
      }
    };

    init();
  }, [user]);

  // Listen messages
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsub();
  }, [chatId]);

  // Send message
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !chatId || !user) return;

    const messageText = text.trim();
    setText("");

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text: messageText,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessageTime: serverTimestamp(),
      });
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  if (!user) return <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Login required</div>;

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 max-w-4xl h-[calc(100vh-5rem)] flex flex-col">
      <h1 className="mb-4 text-xl font-bold px-2">Support Chat</h1>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 border rounded-lg p-4 bg-card/50 backdrop-blur-sm shadow-inner">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center opacity-40 italic text-sm">
            Start the conversation...
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === user.uid;

            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] md:max-w-[70%] text-sm md:text-base leading-relaxed ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-none shadow-md"
                      : "bg-secondary text-secondary-foreground rounded-tl-none shadow-sm"
                  }`}
                >
                  {!isMe && <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Support Agent</div>}
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="flex mt-4 gap-2 px-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 border rounded-full px-5 py-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none h-11 md:h-12"
          placeholder="Type your message..."
        />
        <button 
          type="submit" 
          disabled={!text.trim()}
          className="bg-primary text-primary-foreground px-6 rounded-full font-bold h-11 md:h-12 transition-transform active:scale-95 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
