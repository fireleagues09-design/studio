
'use client';

import React, { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, doc, getDoc, query, where, orderBy, startAt, endAt, limit, onSnapshot, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { setAdminStatus, setSupportStatus, updateUserAdminAction, updateUserSuspension } from "../actions";
import { useLoading } from "@/context/LoadingContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User as UserIcon, Mail, Phone, Calendar, Wallet, Trophy, History, Edit, Ban, CheckCircle, Save, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

type UserDoc = {
  username?: string;
  email?: string;
  phone?: string;
  realName?: string;
  photoURL?: string;
  wallet?: {
    deposit: number;
    winning: number;
    bonus: number;
  };
  isAdmin?: boolean;
  isSupport?: boolean;
  suspended?: boolean;
  suspensionNote?: string;
  registeredOn?: any;
};

function formatTime(ts: any) {
  if (!ts) return "-";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return format(d, 'PPP p');
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
  
  // Details data
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { hideLoader } = useLoading();
  const { toast } = useToast();

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
    const q = text.trim();
    if (!q) {
        setSearching(false);
        return;
    }

    try {
      const usersRef = collection(db, "users");
      let snap;

      if (q.includes('@')) {
          snap = await getDocs(query(usersRef, where('email', '==', q), limit(10)));
      } else if (/^\d+$/.test(q.replace(/\s/g, ''))) {
          const cleanPhone = q.replace(/\s/g, '');
          // Search both formats
          const phoneSnap = await getDocs(query(usersRef, where('phone', '==', cleanPhone), limit(10)));
          if (phoneSnap.empty && cleanPhone.length === 10) {
              const formatted = cleanPhone.slice(0, 5) + ' ' + cleanPhone.slice(5);
              snap = await getDocs(query(usersRef, where('phone', '==', formatted), limit(10)));
          } else snap = phoneSnap;
      } else {
          snap = await getDocs(query(usersRef, orderBy("username"), startAt(q.toLowerCase()), endAt(q.toLowerCase() + "\uf8ff"), limit(30)));
      }

      const items: any[] = [];
      snap?.forEach(d => items.push({ id: d.id, data: d.data() }));
      setResults(items);
    } catch (err) { console.error(err); } finally { setSearching(false); }
  }, 400), []);

  useEffect(() => { doSearch(queryText); }, [queryText, doSearch]);

  const fetchUserDetailsData = async (uid: string) => {
      setLoadingDetails(true);
      try {
          const txQuery = query(collection(db, 'transactions'), where('userId', '==', uid), orderBy('date', 'desc'), limit(20));
          const txSnap = await getDocs(txQuery);
          setUserTransactions(txSnap.docs.map(d => ({id: d.id, ...d.data()})));

          // Finding tournaments user registered for is complex since they are in subcollections
          // For MVP, we'll search across main tournaments and see if uid is in registeredPlayers
          const tQuery = query(collection(db, 'tournaments'), where('registeredPlayers', 'array-contains', uid), limit(20));
          const tSnap = await getDocs(tQuery);
          setUserTournaments(tSnap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (err) {
          console.error("Error fetching user history:", err);
      } finally {
          setLoadingDetails(false);
      }
  }

  const selectUser = async (id: string) => {
    const d = await getDoc(doc(db, "users", id));
    if (d.exists()) {
        const userData = { id: d.id, data: d.data() as UserDoc };
        setSelectedUser(userData);
        fetchUserDetailsData(id);
    }
  };

  if (loadingAuth) return null;
  if (!isAdminUser) return <div className="p-8 text-center text-muted-foreground">Access Denied.</div>;

  return (
    <div className="container mx-auto px-4 py-6 md:py-12 max-w-6xl space-y-8">
      <header>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Search and manage all player accounts and financial details.</p>
      </header>

      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-10 h-12 rounded-xl border-border/50 bg-secondary/30 focus:ring-primary"
            placeholder="Search by username, email or 10-digit phone..." 
            value={queryText} 
            onChange={e => setQueryText(e.target.value)} 
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Search Results</h2>
            {searching ? (
                <div className="flex items-center justify-center p-12 bg-secondary/20 rounded-2xl border border-dashed">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : results.length > 0 ? (
                <div className="space-y-2">
                    {results.map(r => (
                        <Card 
                            key={r.id} 
                            onClick={() => selectUser(r.id)} 
                            className={cn(
                                "cursor-pointer transition-all border-transparent hover:border-primary/30",
                                selectedUser?.id === r.id ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card"
                            )}
                        >
                            <CardContent className="p-4 flex items-center gap-3">
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={r.data.photoURL} />
                                    <AvatarFallback>{(r.data.username || "U").charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{r.data.username}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{r.data.email}</p>
                                </div>
                                {r.data.suspended && <Badge variant="destructive" className="text-[8px] h-4">SUSPENDED</Badge>}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : queryText.trim() ? (
                <div className="p-8 text-center bg-secondary/20 rounded-2xl border border-dashed">
                    <p className="text-xs text-muted-foreground">No users found for "{queryText}"</p>
                </div>
            ) : (
                <div className="p-8 text-center bg-secondary/20 rounded-2xl border border-dashed">
                    <p className="text-xs text-muted-foreground italic">Enter a query to begin searching.</p>
                </div>
            )}
        </div>

        <div className="lg:col-span-2">
            {selectedUser ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <UserDetailsCard 
                        user={selectedUser} 
                        transactions={userTransactions}
                        tournaments={userTournaments}
                        loading={loadingDetails}
                        onUpdate={() => selectUser(selectedUser.id)}
                    />
                </div>
            ) : (
                <Card className="h-64 flex flex-col items-center justify-center border-dashed bg-secondary/10 opacity-50">
                    <UserIcon className="h-12 w-12 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Select a user to view full profile</p>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}

function UserDetailsCard({ user, transactions, tournaments, loading, onUpdate }: { user: {id: string, data: UserDoc}, transactions: any[], tournaments: any[], loading: boolean, onUpdate: () => void }) {
    const { id, data } = user;
    const { toast } = useToast();
    
    const handleSuspend = async (isSuspended: boolean, note: string) => {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) return;
        const res = await updateUserSuspension(id, isSuspended, note, idToken);
        if (res.success) {
            toast({ title: "Success", description: `User ${isSuspended ? 'suspended' : 'unsuspended'}.` });
            onUpdate();
        } else toast({ title: "Error", description: res.message, variant: 'destructive' });
    };

    const wallet = data.wallet || { deposit: 0, winning: 0, bonus: 0 };
    const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

    return (
        <Card className="rounded-2xl border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="bg-secondary/20 border-b p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                        <AvatarImage src={data.photoURL} />
                        <AvatarFallback className="text-2xl">{(data.username || "U").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold">{data.username}</h3>
                            {data.isAdmin && <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-transparent">Admin</Badge>}
                            {data.isSupport && <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Staff</Badge>}
                        </div>
                        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                            <Mail className="h-3 w-3" /> {data.email}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground break-all bg-secondary/50 px-2 py-0.5 rounded w-fit uppercase">UID: {id}</p>
                    </div>
                    <div className="flex gap-2">
                        <EditUserDialog user={user} onUpdate={onUpdate} />
                        <SuspendDialog user={user} onAction={handleSuspend} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 px-6">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none text-xs font-bold uppercase tracking-wider h-full">Overview</TabsTrigger>
                        <TabsTrigger value="tournaments" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none text-xs font-bold uppercase tracking-wider h-full">Events</TabsTrigger>
                        <TabsTrigger value="transactions" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none text-xs font-bold uppercase tracking-wider h-full">Finance</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="p-6 space-y-6 m-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Basic Information</h4>
                                <div className="space-y-3 bg-secondary/30 p-4 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /> Real Name</span>
                                        <span className="font-semibold">{data.realName || "Not Set"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone</span>
                                        <span className="font-semibold">{data.phone || "N/A"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Registered</span>
                                        <span className="font-semibold">{formatTime(data.registeredOn)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Wallet Summary</h4>
                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-bold">Total Balance</span>
                                        </div>
                                        <span className="text-xl font-black text-primary">₹{totalBalance.toFixed(2)}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 bg-background rounded-lg border">
                                            <p className="text-[8px] uppercase font-bold text-muted-foreground">Deposit</p>
                                            <p className="text-xs font-bold">₹{wallet.deposit.toFixed(0)}</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg border">
                                            <p className="text-[8px] uppercase font-bold text-muted-foreground">Winnings</p>
                                            <p className="text-xs font-bold">₹{wallet.winning.toFixed(0)}</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg border">
                                            <p className="text-[8px] uppercase font-bold text-muted-foreground">Bonus</p>
                                            <p className="text-xs font-bold">₹{wallet.bonus.toFixed(0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="tournaments" className="p-6 m-0">
                        {loading ? (
                            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : tournaments.length > 0 ? (
                            <div className="space-y-3">
                                {tournaments.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg"><Trophy className="h-4 w-4 text-primary" /></div>
                                            <div>
                                                <p className="text-xs font-bold truncate max-w-[150px] sm:max-w-xs">{t.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">{t.date}</p>
                                            </div>
                                        </div>
                                        <Badge variant={t.status === 'Finished' ? 'destructive' : 'secondary'} className="text-[8px] uppercase tracking-tighter">{t.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-xs text-muted-foreground italic border-dashed border rounded-2xl">No tournament history found.</div>
                        )}
                    </TabsContent>

                    <TabsContent value="transactions" className="p-6 m-0">
                        {loading ? (
                            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : transactions.length > 0 ? (
                            <div className="space-y-3">
                                {transactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-secondary rounded-lg"><History className="h-4 w-4 text-muted-foreground" /></div>
                                            <div>
                                                <p className="text-xs font-bold capitalize">{tx.type.replace('_', ' ')}</p>
                                                <p className="text-[10px] text-muted-foreground">{formatTime(tx.date)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-xs font-bold", tx.type === 'deposit' || tx.type === 'prize' ? "text-green-500" : "text-red-500")}>
                                                {tx.type === 'deposit' || tx.type === 'prize' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                            </p>
                                            <p className="text-[8px] text-muted-foreground uppercase font-black">{tx.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-xs text-muted-foreground italic border-dashed border rounded-2xl">No recent transactions.</div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function EditUserDialog({ user, onUpdate }: { user: {id: string, data: UserDoc}, onUpdate: () => void }) {
    const { id, data } = user;
    const [username, setUsername] = useState(data.username || '');
    const [email, setEmail] = useState(data.email || '');
    const [phone, setPhone] = useState(data.phone || '');
    const [realName, setRealName] = useState(data.realName || '');
    const [deposit, setDeposit] = useState(data.wallet?.deposit?.toString() || '0');
    const [winning, setWinning] = useState(data.wallet?.winning?.toString() || '0');
    const [bonus, setBonus] = useState(data.wallet?.bonus?.toString() || '0');
    
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            if (!idToken) throw new Error("Unauthorized");

            const res = await updateUserAdminAction(id, {
                username, email, phone, realName,
                wallet: {
                    deposit: parseFloat(deposit),
                    winning: parseFloat(winning),
                    bonus: parseFloat(bonus)
                }
            }, idToken);

            if (res.success) {
                toast({ title: "Success", description: "User details updated." });
                setOpen(false);
                onUpdate();
            } else throw new Error(res.message);
        } catch (err: any) {
            toast({ title: "Update Failed", description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-primary/20 hover:bg-primary/10 text-primary font-bold">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Edit Account: {data.username}</DialogTitle>
                    <DialogDescription>Modify core account details and wallet balances. Use with caution.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Username (Lowercase)</Label>
                            <Input value={username} onChange={e => setUsername(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Real Name</Label>
                            <Input value={realName} onChange={e => setRealName(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <h4 className="text-sm font-bold flex items-center gap-2"><Wallet className="h-4 w-4" /> Wallet Balance Management</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Deposit</Label>
                                <Input type="number" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Winnings</Label>
                                <Input type="number" step="0.01" value={winning} onChange={e => setWinning(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Bonus</Label>
                                <Input type="number" step="0.01" value={bonus} onChange={e => setBonus(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="font-bold min-w-[120px]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SuspendDialog({ user, onAction }: { user: {id: string, data: UserDoc}, onAction: (sus: boolean, note: string) => void }) {
    const [note, setNote] = useState(user.data.suspensionNote || '');
    const [open, setOpen] = useState(false);
    const isSuspended = user.data.suspended;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-10 px-4 rounded-xl font-bold", isSuspended ? "border-green-500/20 text-green-500 hover:bg-green-500/10" : "border-destructive/20 text-destructive hover:bg-destructive/10")}>
                    {isSuspended ? <CheckCircle className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                    {isSuspended ? "Unsuspend" : "Suspend"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isSuspended ? "Unsuspend Account" : "Suspend Account"}</DialogTitle>
                    <DialogDescription>
                        {isSuspended 
                            ? `Are you sure you want to restore access for ${user.data.username}?` 
                            : `This will immediately block ${user.data.username} from accessing their account.`}
                    </DialogDescription>
                </DialogHeader>
                {!isSuspended && (
                    <div className="space-y-2 pt-2">
                        <Label>Reason for Suspension</Label>
                        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Violation of Terms, Hacking..." />
                    </div>
                )}
                <DialogFooter className="pt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button 
                        variant={isSuspended ? "default" : "destructive"} 
                        onClick={() => { onAction(!isSuspended, note); setOpen(false); }}
                        className="font-bold"
                    >
                        Confirm {isSuspended ? "Unsuspend" : "Suspension"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
