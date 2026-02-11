
'use client';

import React, { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, doc, getDoc, query, where, orderBy, startAt, endAt, limit, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLoading } from "@/context/LoadingContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";

// --- TYPES ---
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
  isEmployee?: boolean;
  suspended?: boolean;
  isBestie?: boolean;
  registeredOn?: { seconds?: number } | any;
};

// --- UTIL ---
function formatTime(ts: any) {
  if (!ts) return "-";
  try {
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return new Date(ts).toLocaleString();
  } catch (e) {
    return "-";
  }
}

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// --- COMPONENT ---
export default function ManagementUsersPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [queryText, setQueryText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; data: UserDoc }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; data: UserDoc } | null>(null);

  const { hideLoader } = useLoading();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
      hideLoader();
    }
  }, [loadingAuth, hideLoader]);

  // Auth and permission check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (!u) {
        router.push('/login');
        setLoadingAuth(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        const data = userDoc.exists() ? (userDoc.data() as UserDoc) : null;
        if (data?.isAdmin || data?.isEmployee) {
          setIsAllowed(true);
        } else {
          router.push('/');
        }
      } catch (e) {
        console.error("Permission check failed", e);
        router.push('/');
      } finally {
        setLoadingAuth(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Debounced search handler
  const doSearch = useMemo(() => debounce(async (text: string) => {
    setSearching(true);
    setResults([]);
    setSelectedUser(null);
    const q = text.trim();
    if (!q) {
      setSearching(false);
      return setResults([]);
    }
    
    try {
        if (/^[A-Za-z0-9_-]{20,}$/.test(q)) {
            const docRef = doc(db, "users", q);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setResults([{ id: docSnap.id, data: docSnap.data() as UserDoc }]);
            }
            setSearching(false);
            return;
        }

        if (/^\+?\d{4,}$/.test(q)) {
            const usersRef = collection(db, "users");
            const phoneQuery = query(usersRef, orderBy("phone"), startAt(q), endAt(q + "\\uf8ff"), limit(20));
            const unsub = onSnapshot(phoneQuery, (snap) => {
                const items: Array<{ id: string; data: UserDoc }> = [];
                snap.forEach((d) => items.push({ id: d.id, data: d.data() as UserDoc }));
                setResults(items);
                setSearching(false);
                if (typeof unsub === "function") unsub();
            });
            return;
        }

        const usersRef = collection(db, "users");
        const nameQuery = query(usersRef, orderBy("username"), startAt(q), endAt(q + "\\uf8ff"), limit(30));
        const emailQuery = query(usersRef, orderBy("email"), startAt(q), endAt(q + "\\uf8ff"), limit(30));
        
        const unsubName = onSnapshot(nameQuery, (nameSnap) => {
            const items: Array<{ id: string; data: UserDoc }> = [];
            nameSnap.forEach((d) => items.push({ id: d.id, data: d.data() as UserDoc }));

            if (items.length) {
                setResults(items);
                setSearching(false);
                if (typeof unsubName === "function") unsubName();
            } else {
                const unsubEmail = onSnapshot(emailQuery, (emailSnap) => {
                    const emailItems: Array<{ id: string; data: UserDoc }> = [];
                    emailSnap.forEach((d) => emailItems.push({ id: d.id, data: d.data() as UserDoc }));
                    setResults(emailItems);
                    setSearching(false);
                    if (typeof unsubEmail === "function") unsubEmail();
                    if (typeof unsubName === "function") unsubName();
                });
            }
        });
    } catch (err) {
        console.error("Search failed:", err);
        alert("Search failed. Check console for details.");
        setSearching(false);
    }
  }, 400), []);

  useEffect(() => {
    doSearch(queryText);
  }, [queryText, doSearch]);

  const selectUser = async (id: string) => {
    const d = await getDoc(doc(db, "users", id));
    if (d.exists()) {
      setSelectedUser({ id: d.id, data: d.data() as UserDoc });
    }
  };
  
  const totalBalance = (wallet: UserDoc['wallet']) => {
    if (!wallet) return 0;
    return (wallet.deposit || 0) + (wallet.winning || 0) + (wallet.bonus || 0);
  }

  if (loadingAuth || !isAllowed) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
       <Button asChild variant="outline">
        <Link href="/management">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back to Dashboard
        </Link>
      </Button>

      <h1 className="text-4xl font-bold tracking-tight">User Search</h1>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
            placeholder="Search by UID, username, email or phone..."
            className="pl-9"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Search Results</CardTitle>
                    <CardDescription>Found {results.length} user(s).</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {searching ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Searching...</TableCell></TableRow>
                                ) : results.length === 0 ? (
                                     <TableRow><TableCell colSpan={4} className="h-24 text-center">No results found.</TableCell></TableRow>
                                ) : (
                                    results.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">{r.data.username ?? '—'}</TableCell>
                                            <TableCell>{r.data.email ?? '—'}</TableCell>
                                            <TableCell>{r.data.phone ?? '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => selectUser(r.id)}>
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="sticky top-24">
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedUser ? (
                        <div className="space-y-3 text-sm">
                            <h3 className="font-semibold text-lg">{selectedUser.data.username ?? 'N/A'}</h3>
                            <p className="text-muted-foreground break-all"><strong>UID:</strong> {selectedUser.id}</p>
                            <p><strong>Email:</strong> {selectedUser.data.email ?? '—'}</p>
                            <p><strong>Phone:</strong> {selectedUser.data.phone ?? '—'}</p>
                            <p><strong>Registered:</strong> {formatTime(selectedUser.data.registeredOn)}</p>
                            <p><strong>Total Balance:</strong> ₹{totalBalance(selectedUser.data.wallet).toFixed(2)}</p>
                            <div className="space-y-1 pt-2">
                                <p><strong>Deposit:</strong> ₹{(selectedUser.data.wallet?.deposit ?? 0).toFixed(2)}</p>
                                <p><strong>Winnings:</strong> ₹{(selectedUser.data.wallet?.winning ?? 0).toFixed(2)}</p>
                                <p><strong>Bonus:</strong> ₹{(selectedUser.data.wallet?.bonus ?? 0).toFixed(2)}</p>
                            </div>
                            <p><strong>Admin:</strong> {selectedUser.data.isAdmin ? 'Yes' : 'No'}</p>
                             <p><strong>Employee:</strong> {selectedUser.data.isEmployee ? 'Yes' : 'No'}</p>
                            <p><strong>Bestie:</strong> {selectedUser.data.isBestie ? 'Yes' : 'No'}</p>
                            <p><strong>Status:</strong> {selectedUser.data.suspended ? "Suspended" : "Active"}</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                            <p>Select a user to see details.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    