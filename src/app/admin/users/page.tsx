
'use client';

import React, { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, doc, getDoc, query, where, orderBy, startAt, endAt, limit, onSnapshot, updateDoc, addDoc, serverTimestamp, writeBatch, type DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { setAdminStatus, setSupportStatus } from "../actions";
import { useLoading } from "@/context/LoadingContext";

type UserDoc = {
  username?: string;
  email?: string;
  phone?: string;
  wallet?: {
    deposit: number;
    winning: number;
    bonus: number;
  };
  isAdmin?: boolean;
  isSupport?: boolean;
  suspended?: boolean;
  isBestie?: boolean;
  registeredOn?: { seconds?: number } | any;
};

function formatTime(ts: any) {
  if (!ts) return "-";
  try {
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return new Date(ts).toLocaleString();
  } catch (e) { return "-"; }
}

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [queryText, setQueryText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; data: UserDoc }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; data: UserDoc } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const { hideLoader } = useLoading();

  useEffect(() => { if (!loadingAuth) hideLoader(); }, [loadingAuth, hideLoader]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      setLoadingAuth(false);
      if (!u) return setIsAdminUser(false);
      try {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        setIsAdminUser(!!userDoc.data()?.isAdmin);
      } catch (e) { setIsAdminUser(false); }
    });
    return () => unsub();
  }, []);

  const doSearch = useMemo(() => debounce(async (text: string) => {
    setSearching(true);
    setResults([]);
    setSelectedUser(null);
    const q = text.trim();
    if (!q) return setSearching(false);
    try {
      const usersRef = collection(db, "users");
      const nameQuery = query(usersRef, orderBy("username"), startAt(q), endAt(q + "\uf8ff"), limit(30));
      const snap = await getDocs(nameQuery);
      const items: any[] = [];
      snap.forEach(d => items.push({ id: d.id, data: d.data() }));
      setResults(items);
    } catch (err) { console.error(err); } finally { setSearching(false); }
  }, 400), []);

  useEffect(() => { doSearch(queryText); }, [queryText, doSearch]);

  const selectUser = async (id: string) => {
    const d = await getDoc(doc(db, "users", id));
    if (d.exists()) setSelectedUser({ id: d.id, data: d.data() as UserDoc });
  };

  const toggleAdmin = async (id: string, currentlyAdmin?: boolean) => {
    if (!currentUser || !confirm(currentlyAdmin ? "Revoke admin?" : "Grant admin?")) return;
    const res = await setAdminStatus(id, !currentlyAdmin, await currentUser.getIdToken());
    if (res.success) selectUser(id);
    else alert(res.message);
  };

  const toggleSupport = async (id: string, currentlySupport?: boolean) => {
    if (!currentUser || !confirm(currentlySupport ? "Revoke Support?" : "Grant Support?")) return;
    const res = await setSupportStatus(id, !currentlySupport, await currentUser.getIdToken());
    if (res.success) selectUser(id);
    else alert(res.message);
  };

  const totalBalance = (wallet: any) => (wallet?.deposit || 0) + (wallet?.winning || 0) + (wallet?.bonus || 0);

  if (loadingAuth) return null;
  if (!isAdminUser) return <div className="p-8 text-white">Access Denied.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <input className="w-full mb-4 border rounded px-3 py-2 bg-gray-800 border-gray-700" placeholder="Search..." value={queryText} onChange={e => setQueryText(e.target.value)} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {results.map(r => (
            <div key={r.id} onClick={() => selectUser(r.id)} className="p-3 mb-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700">
              {r.data.username} ({r.data.email})
            </div>
          ))}
        </div>
        <div className="bg-gray-800 p-4 rounded sticky top-6">
          {selectedUser ? (
            <div className="space-y-3">
              <div className="font-bold">{selectedUser.data.username}</div>
              <div className="text-xs opacity-60">Admin: {selectedUser.data.isAdmin ? 'Yes' : 'No'}</div>
              <div className="text-xs opacity-60">Support: {selectedUser.data.isSupport ? 'Yes' : 'No'}</div>
              <div className="flex flex-col gap-2 mt-4">
                <button onClick={() => toggleAdmin(selectedUser.id, selectedUser.data.isAdmin)} className="bg-blue-600 p-2 rounded">Toggle Admin</button>
                <button onClick={() => toggleSupport(selectedUser.id, selectedUser.data.isSupport)} className="bg-purple-600 p-2 rounded">Toggle Support</button>
              </div>
            </div>
          ) : "Select a user"}
        </div>
      </div>
    </div>
  );
}
