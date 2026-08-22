'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy, doc, getDoc, deleteDoc, where, getCountFromServer } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Activity, Pencil, Trash, UsersRound, CheckCircle, XCircle, TrophyIcon, ArrowUpRight, ArrowDownLeft, Gift, MessageSquare, User as UserIcon, Calendar, Hash, ShieldCheck, Wallet, Ban, Lock } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Tournament as TournamentType } from '@/lib/mock-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { updateTransaction, updatePaymentDetails, updateAuthConfig, updateTournamentAction } from './actions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import SliderAdmin from '@/components/SliderAdmin';
import BrandingAdmin from '@/components/BrandingAdmin';
import { useLoading } from '@/context/LoadingContext';
import { Switch } from '@/components/ui/switch';
import { CreateTournamentDialog } from '@/components/CreateTournamentDialog';
import { cn } from '@/lib/utils';

type Transaction = {
    id: string;
    userId: string;
    userName?: string;
    type: 'deposit' | 'entry_fee' | 'withdrawal' | 'prize';
    amount: number;
    transactionId?: string;
    details?: any;
    date: any;
    status: 'Completed' | 'Pending' | 'Failed';
};

function EditTournamentDialog({ tournament }: { tournament: TournamentType }) {
    const [name, setName] = useState(tournament.name);
    const [date, setDate] = useState(tournament.date);
    const [time, setTime] = useState(tournament.time);
    const [entryFee, setEntryFee] = useState(tournament.entryFee);
    const [prize, setPrize] = useState(tournament.prize);
    const [slots, setSlots] = useState(tournament.slots.toString());
    const [status, setStatus] = useState<TournamentType['status']>(tournament.status || 'Upcoming');
    const [roomId, setRoomId] = useState(tournament.roomId || '');
    const [roomPassword, setRoomPassword] = useState(tournament.roomPassword || '');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const result = await updateTournamentAction(tournament.id, {
                name,
                date,
                time,
                entryFee,
                prize,
                slots: Number(slots),
                status,
                roomId,
                roomPassword,
            }, idToken);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message
                });
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Error updating tournament:", error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update lobby. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Lobby</DialogTitle>
                    <DialogDescription>
                        Modify parameters for "{tournament.name}".
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-6">
                     <div className="grid gap-2">
                        <Label htmlFor="name">Lobby Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time">Time</Label>
                            <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="entryFee">Entry Fee</Label>
                            <Input id="entryFee" value={entryFee} onChange={e => setEntryFee(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="prize">Reward Pool (INR)</Label>
                            <Input id="prize" value={prize} onChange={e => setPrize(e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                           <Label htmlFor="slots">Total Slots</Label>
                           <Input id="slots" type="number" value={slots} onChange={e => setSlots(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                           <Label htmlFor="edit-status">Status</Label>
                           <Select value={status} onValueChange={(value) => setStatus(value as TournamentType['status'])}>
                               <SelectTrigger id="edit-status">
                                   <SelectValue placeholder="Select status" />
                               </SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="Upcoming">Upcoming</SelectItem>
                                   <SelectItem value="Ongoing">Ongoing</SelectItem>
                                   <SelectItem value="Finished">Finished</SelectItem>
                                   <SelectItem value="Cancelled" className="text-destructive font-bold">Cancelled (Refund All)</SelectItem>
                               </SelectContent>
                           </Select>
                        </div>
                    </div>

                    <div className="p-4 border rounded-md space-y-3 bg-secondary/50">
                        <Label>Room Credentials</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="roomId">Room ID</Label>
                                <Input id="roomId" value={roomId} onChange={e => setRoomId(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="roomPassword">Room Password</Label>
                                <Input id="roomPassword" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} />
                            </div>
                        </div>
                    </div>


                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteTournamentDialog({tournamentId, tournamentName }: { tournamentId: string, tournamentName: string }) {
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteDoc(doc(db, 'tournaments', tournamentId));
            toast({
                title: 'Success',
                description: `Lobby "${tournamentName}" has been removed.`
            });
        } catch (error) {
            console.error("Error deleting tournament:", error);
            toast({
                title: 'Error',
                description: 'Failed to delete lobby. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove this lobby?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the lobby "{tournamentName}" and all associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function AdminPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const [tournaments, setTournaments] = useState<TournamentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

    const [totalUsers, setTotalUsers] = useState(0);
    const [totalTournaments, setTotalTournaments] = useState(0);
    const [suspendedUsersCount, setSuspendedUsersCount] = useState(0);

    const [activeTab, setActiveTab] = useState('transactions');
    
    const [upiId, setUpiId] = useState('');
    const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');
    const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(true);
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    // Auth Config States
    const [authConfig, setAuthConfig] = useState({
        emailLoginEnabled: true,
        googleLoginEnabled: true,
        registrationEnabled: true,
        maintenanceNote: ""
    });
    const [isSavingAuthConfig, setIsSavingAuthConfig] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    const { hideLoader } = useLoading();
    

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().isAdmin) {
                    setIsAdmin(true);
                } else {
                    router.push('/');
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });
        return () => unsubscribeAuth();
    }, [router]);
    
    useEffect(() => {
        if (!loading && !dataLoading) {
            hideLoader();
        }
    }, [loading, dataLoading, hideLoader]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'MMM dd, p');
    };

    useEffect(() => {
        if (!isAdmin || !user) return;

        setDataLoading(true);
        
        const tournamentsRef = collection(db, "tournaments");
        const tournamentsQuery = query(tournamentsRef, orderBy("createdAt", "desc"));
        const unsubscribeTournaments = onSnapshot(tournamentsQuery, async (snapshot) => {
            const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentType));
            setTournaments(tournamentsData);
            const countSnapshot = await getCountFromServer(tournamentsRef);
            setTotalTournaments(countSnapshot.data().count);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching tournaments:", error)
            setDataLoading(false);
        });

        const usersRef = collection(db, "users");
        const unsubscribeUsers = onSnapshot(usersRef, async () => {
             const countSnapshot = await getCountFromServer(usersRef);
             setTotalUsers(countSnapshot.data().count);
        });

        const suspendedQuery = query(usersRef, where("suspended", "==", true));
        const unsubscribeSuspended = onSnapshot(suspendedQuery, async () => {
            const countSnapshot = await getCountFromServer(suspendedQuery);
            setSuspendedUsersCount(countSnapshot.data().count);
        });

        const transactionsQuery = query(
            collection(db, "transactions"), 
            where("status", "==", "Pending"), 
            orderBy("date", "desc")
        );
        const unsubscribeTransactions = onSnapshot(transactionsQuery, async (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            
            const transactionsWithUserNames = await Promise.all(
                transactionsData.map(async (transaction) => {
                    const userDocRef = doc(db, 'users', transaction.userId);
                    const userDoc = await getDoc(userDocRef);
                    const userName = userDoc.exists() ? userDoc.data().username : 'Unknown User';
                    return { ...transaction, userName };
                })
            );

            setPendingTransactions(transactionsWithUserNames);
        });
        
        const paymentDocRef = doc(db, 'settings', 'paymentDetails');
        const unsubscribePayment = onSnapshot(paymentDocRef, (doc) => {
            if (doc.exists()) {
                setUpiId(doc.data().upiId || '');
                setUpiQrCodeUrl(doc.data().upiQrCodeUrl || '');
            }
            setPaymentSettingsLoading(false);
        });

        const authConfigRef = doc(db, 'settings', 'auth_config');
        const unsubscribeAuth = onSnapshot(authConfigRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setAuthConfig({
                    emailLoginEnabled: data.emailLoginEnabled ?? true,
                    googleLoginEnabled: data.googleLoginEnabled ?? true,
                    registrationEnabled: data.registrationEnabled ?? true,
                    maintenanceNote: data.maintenanceNote ?? ""
                });
            }
        });


        // Cleanup listeners
        return () => {
            unsubscribeTournaments();
            unsubscribeUsers();
            unsubscribeSuspended();
            unsubscribeTransactions();
            unsubscribePayment();
            unsubscribeAuth();
        };
    }, [isAdmin, user]);
    
    const handleTransactionUpdate = async (
        transaction: Transaction,
        newStatus: 'Completed' | 'Failed'
    ) => {
        if (!isAdmin || !auth.currentUser) {
            toast({ title: 'Permission Denied', description: 'Unauthorized access.', variant: 'destructive' });
            return;
        };
        
        const { id, userId, amount, type } = transaction;

        setActionLoading(prev => ({...prev, [id]: true}));
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await updateTransaction(id, newStatus, userId, amount, type, idToken);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: `Request has been ${newStatus === 'Completed' ? 'approved' : 'rejected'}.`
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error('Failed to update transaction:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update record.',
                variant: 'destructive'
            });
        } finally {
            setActionLoading(prev => ({...prev, [id]: false}));
        }
    };

    const handlePaymentDetailsSave = async () => {
        if (!auth.currentUser) {
            toast({ title: "Authentication Error", description: "Login required.", variant: "destructive" });
            return;
        };
        setIsSavingPayment(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await updatePaymentDetails({ upiId, upiQrCodeUrl }, idToken);
            if (result.success) {
                toast({ title: 'Success', description: 'Receiver details updated.' });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSavingPayment(false);
        }
    };

    const handleAuthConfigSave = async () => {
        if (!auth.currentUser) return;
        setIsSavingAuthConfig(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await updateAuthConfig(authConfig, idToken);
            if (result.success) {
                toast({ title: 'Success', description: 'Access controls updated.' });
            } else throw new Error(result.message);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSavingAuthConfig(false);
        }
    }

    const pendingDeposits = pendingTransactions.filter(t => t.type === 'deposit');
    const pendingWithdrawals = pendingTransactions.filter(t => t.type === 'withdrawal');

    if (loading || dataLoading) {
        return null;
    }

    if (!isAdmin) {
         return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center justify-center h-64">
                    <p>Access Denied. Redirecting...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-6 md:py-12 space-y-8 max-w-7xl">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">System Controls</h1>
                <p className="text-muted-foreground text-sm">Managing FireLeagues Arena</p>
            </header>

             <section>
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Competitors</CardTitle>
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">{totalUsers}</div>
                            <p className="text-[10px] text-muted-foreground">Joined arena</p>
                        </CardContent>
                    </Card>
                    
                    <Link href="/admin/suspended" className="block transition-transform hover:scale-[1.02] active:scale-95">
                        <Card className="bg-destructive/5 border-destructive/10 h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Restricted</CardTitle>
                                <div className="p-2 bg-destructive/10 rounded-full text-destructive">
                                    <Ban className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-destructive">{suspendedUsersCount}</div>
                                <p className="text-[10px] text-muted-foreground">Access revoked</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card className="bg-blue-500/5 border-blue-500/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Events</CardTitle>
                            <div className="p-2 bg-blue-500/10 rounded-full">
                                <TrophyIcon className="h-4 w-4 text-blue-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="text-xl font-bold">{totalTournaments}</div>
                            <p className="text-[10px] text-muted-foreground">Created lobbies</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-500/5 border-amber-500/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Queue</CardTitle>
                            <div className="p-2 bg-amber-500/10 rounded-full">
                                <Activity className="h-4 w-4 text-amber-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                           <div className="text-xl font-bold">{pendingTransactions.length}</div>
                           <p className="text-[10px] text-muted-foreground">Pending verify</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

             <div className="w-full">
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {['transactions', 'tournaments', 'users', 'besties', 'payments', 'auth', 'Fav-icon', 'settings'].map((tab) => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? 'default' : 'secondary'}
                            size="sm"
                            className={cn(
                                "capitalize rounded-full px-6 font-semibold transition-all shrink-0",
                                activeTab === tab ? "shadow-md" : "opacity-70 hover:opacity-100"
                            )}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </Button>
                    ))}
                </div>

                <div className="mt-4">
                    {activeTab === 'transactions' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardHeader className="px-0">
                                    <CardTitle className="text-xl">Pending Verification</CardTitle>
                                    <CardDescription>Review deposits and reward transfers</CardDescription>
                                </CardHeader>
                                <CardContent className="px-0">
                                    <Tabs defaultValue="deposits" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-xl p-1 mb-6">
                                            <TabsTrigger value="deposits" className="rounded-lg">
                                                <ArrowDownLeft className="mr-2 h-4 w-4 text-green-500" />
                                                Incoming
                                            </TabsTrigger>
                                            <TabsTrigger value="withdrawals" className="rounded-lg">
                                                <ArrowUpRight className="mr-2 h-4 w-4 text-red-500" />
                                                Outgoing
                                            </TabsTrigger>
                                        </TabsList>
                                        
                                        <TabsContent value="deposits" className="space-y-4">
                                            {pendingDeposits.length > 0 ? pendingDeposits.map(deposit => (
                                                <Card key={deposit.id} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-lg">₹{deposit.amount.toFixed(2)}</p>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                                    <UserIcon className="h-3 w-3" />
                                                                    <span>@{deposit.userName}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded w-fit">
                                                                    <Hash className="h-2.5 w-2.5" />
                                                                    <span>{deposit.transactionId}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button variant="outline" size="icon" className="h-10 w-10 text-green-500 rounded-full border-green-500/20" onClick={() => handleTransactionUpdate(deposit, 'Completed')} disabled={actionLoading[deposit.id]}>
                                                                    <CheckCircle className="h-5 w-5" />
                                                                </Button>
                                                                <Button variant="outline" size="icon" className="h-10 w-10 text-red-500 rounded-full border-red-500/20" onClick={() => handleTransactionUpdate(deposit, 'Failed')} disabled={actionLoading[deposit.id]}>
                                                                    <XCircle className="h-5 w-5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t flex justify-between items-center text-[10px] text-muted-foreground italic">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>{formatDate(deposit.date)}</span>
                                                            </div>
                                                            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter">Deposit</Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )) : (
                                                <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
                                                    <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                                    <p className="text-sm text-muted-foreground">No pending arrivals.</p>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="withdrawals" className="space-y-4">
                                            {pendingWithdrawals.length > 0 ? pendingWithdrawals.map(withdrawal => (
                                                <Card key={withdrawal.id} className="overflow-hidden border-border/50">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-lg text-red-500">₹{withdrawal.amount.toFixed(2)}</p>
                                                                <p className="text-sm font-semibold">@{withdrawal.userName}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{withdrawal.details?.method || 'Method'}</p>
                                                            </div>
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold px-4">Dest. Details</Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Reward Transfer Info</DialogTitle>
                                                                        <DialogDescription>Destination path for {withdrawal.userName}</DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4 py-4">
                                                                        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                                                                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                                                                <span className="text-muted-foreground">Name</span>
                                                                                <span className="font-bold">{withdrawal.details?.name}</span>
                                                                            </div>
                                                                            {withdrawal.details?.method === 'upi' ? (
                                                                                <div className="flex justify-between items-center text-sm">
                                                                                    <span className="text-muted-foreground">UPI ID</span>
                                                                                    <span className="font-mono text-primary font-bold">{withdrawal.details?.upiId}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="space-y-2">
                                                                                    <div className="flex justify-between text-xs">
                                                                                        <span className="text-muted-foreground">Bank</span>
                                                                                        <span className="font-bold">{withdrawal.details?.bankName}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between text-xs">
                                                                                        <span className="text-muted-foreground">Account</span>
                                                                                        <span className="font-mono">{withdrawal.details?.accountNumber}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between text-xs">
                                                                                        <span className="text-muted-foreground">IFSC</span>
                                                                                        <span className="font-mono">{withdrawal.details?.ifscCode}</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleTransactionUpdate(withdrawal, 'Completed')}>Verify & Transfer</Button>
                                                                            <Button className="flex-1" variant="destructive" onClick={() => handleTransactionUpdate(withdrawal, 'Failed')}>Reject Request</Button>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                        <div className="mt-3 flex justify-between items-center text-[9px] text-muted-foreground font-medium pt-3 border-t">
                                                            <span>{formatDate(withdrawal.date)}</span>
                                                            <div className="flex gap-2">
                                                                <CheckCircle className="h-4 w-4 text-green-500 cursor-pointer" onClick={() => handleTransactionUpdate(withdrawal, 'Completed')} />
                                                                <XCircle className="h-4 w-4 text-red-500 cursor-pointer" onClick={() => handleTransactionUpdate(withdrawal, 'Failed')} />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )) : (
                                                <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
                                                    <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                                    <p className="text-sm text-muted-foreground">No pending transfers.</p>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'tournaments' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Arena Lobbies</h2>
                                <CreateTournamentDialog />
                            </div>
                            
                            <div className="grid gap-4">
                                {tournaments.map(t => (
                                    <Card key={t.id} className="overflow-hidden border-border/50">
                                        <CardContent className="p-0">
                                            <div className="flex h-24">
                                                <div className="relative w-24 h-full shrink-0">
                                                    <Image src={t.image} alt={t.name} fill className="object-cover" />
                                                    <div className="absolute inset-0 bg-black/40" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <TrophyIcon className="h-6 w-6 text-white opacity-80" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                                    <div>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h3 className="font-bold text-sm truncate">{t.name}</h3>
                                                            <Badge className="text-[8px] h-4 scale-90 origin-right px-1.5" variant={t.status === 'Finished' ? 'destructive' : t.status === 'Cancelled' ? 'outline' : 'default'}>{t.status}</Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                                                            <div className="flex items-center gap-1 font-bold">
                                                                <DollarSign className="h-2.5 w-2.5" />
                                                                <span>{t.entryFee === 'FREE' ? 'Entry Free' : `Fee: ₹${t.entryFee}`}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <UsersRound className="h-2.5 w-2.5" />
                                                                <span>{t.slotsFilled}/{t.slots}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <p className="text-[9px] text-muted-foreground font-medium">{t.date}</p>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                                <Link href={`/admin/registrations/${t.id}`}>
                                                                    <Users className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                            <EditTournamentDialog tournament={t} />
                                                            <DeleteTournamentDialog tournamentId={t.id} tournamentName={t.name} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="bg-secondary/30 border-none shadow-none rounded-2xl overflow-hidden">
                                <CardContent className="p-8 text-center space-y-4">
                                    <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                                        <Users className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Competitor Directory</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">Search and manage player roles, reward balances, and access level.</p>
                                    </div>
                                    <Button asChild className="rounded-full px-8 shadow-lg shadow-primary/20">
                                        <Link href="/admin/users">Open Manager</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'besties' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="bg-pink-500/5 border-pink-500/10 rounded-2xl overflow-hidden">
                                <CardContent className="p-8 text-center space-y-4">
                                    <div className="p-4 bg-pink-500/10 rounded-full w-fit mx-auto">
                                        <Gift className="h-8 w-8 text-pink-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">V.I.P. Management</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">Special roles for your most dedicated competitors.</p>
                                    </div>
                                    <Button asChild variant="secondary" className="rounded-full px-8">
                                        <Link href="/admin/besties">View VIP List</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="border-border/50 rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Wallet className="h-5 w-5 text-primary" />
                                        Collection Details
                                    </CardTitle>
                                    <CardDescription>Configure your public receiving endpoints</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {paymentSettingsLoading ? (
                                        <div className="space-y-4">
                                            <Skeleton className="h-12 w-full rounded-xl" />
                                            <Skeleton className="h-12 w-full rounded-xl" />
                                            <Skeleton className="h-40 w-40 rounded-2xl mx-auto" />
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Merchant UPI ID</Label>
                                                <Input
                                                    className="rounded-xl h-12 border-muted-foreground/20 focus:border-primary"
                                                    value={upiId}
                                                    onChange={(e) => setUpiId(e.target.value)}
                                                    placeholder="your-id@bank"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">QR Code Source URL</Label>
                                                <Input
                                                    className="rounded-xl h-12 border-muted-foreground/20"
                                                    value={upiQrCodeUrl}
                                                    onChange={(e) => setUpiQrCodeUrl(e.target.value)}
                                                    placeholder="https://image-host.com/qr.png"
                                                />
                                            </div>

                                            {upiQrCodeUrl && (
                                                <div className="text-center space-y-2">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Live Preview</p>
                                                    <div className="relative w-48 h-48 mx-auto rounded-3xl overflow-hidden flex items-center justify-center">
                                                        <Image src={upiQrCodeUrl} alt="QR Preview" fill className="object-contain" unoptimized />
                                                    </div>
                                                </div>
                                            )}

                                            <Button onClick={handlePaymentDetailsSave} disabled={isSavingPayment} className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
                                                {isSavingPayment ? 'Updating System...' : 'Commit Changes'}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'auth' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="border-border/50 rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Lock className="h-5 w-5 text-primary" />
                                        Access Controls
                                    </CardTitle>
                                    <CardDescription>Manage arena entry globally</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">Email Login</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase">Password Access</p>
                                            </div>
                                            <Switch 
                                                checked={authConfig.emailLoginEnabled}
                                                onCheckedChange={(v) => setAuthConfig(prev => ({...prev, emailLoginEnabled: v}))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">Google Login</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase">OAuth 2.0</p>
                                            </div>
                                            <Switch 
                                                checked={authConfig.googleLoginEnabled}
                                                onCheckedChange={(v) => setAuthConfig(prev => ({...prev, googleLoginEnabled: v}))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">Arena Enrollment</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase">New Competitors</p>
                                            </div>
                                            <Switch 
                                                checked={authConfig.registrationEnabled}
                                                onCheckedChange={(v) => setAuthConfig(prev => ({...prev, registrationEnabled: v}))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Arena Note</Label>
                                        <Textarea 
                                            placeholder="Display a note when enrollment or entry is restricted..."
                                            className="rounded-xl min-h-[100px] border-muted-foreground/20 focus:border-primary"
                                            value={authConfig.maintenanceNote}
                                            onChange={(e) => setAuthConfig(prev => ({...prev, maintenanceNote: e.target.value}))}
                                        />
                                        <p className="text-[10px] text-muted-foreground italic">This message will appear if an entry method is locked.</p>
                                    </div>

                                    <Button onClick={handleAuthConfigSave} disabled={isSavingAuthConfig} className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
                                        {isSavingAuthConfig ? 'Saving Settings...' : 'Update Arena Rules'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'Fav-icon' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <BrandingAdmin />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
                            <SliderAdmin />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
