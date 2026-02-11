
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, query, orderBy, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, addDoc, where, limit, getDocs,getCountFromServer } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, Activity, Pencil, Trash, PlusCircle, MinusCircle as MinusCircleIcon, UsersRound, Search, CheckCircle, XCircle, TrophyIcon, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, Gift } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { updateTransaction, setBestiePageStatus } from './actions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import SliderAdmin from '@/components/SliderAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLoading } from '@/context/LoadingContext';
import { Switch } from '@/components/ui/switch';
import { CreateTournamentDialog } from '@/components/CreateTournamentDialog';

type UserData = {
    id: string;
    inGameName: string;
    inGameUid: string;
    phone: string;
    email: string;
    registeredOn: any;
    isAdmin?: boolean;
};

type Transaction = {
    id: string;
    userId: string;
    userName?: string;
    type: 'deposit' | 'entry_fee' | 'withdrawal' | 'prize';
    amount: number;
    transactionId?: string; // from deposit
    details?: any; // from withdrawal
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
        setLoading(true);
        try {
            const tournamentDocRef = doc(db, 'tournaments', tournament.id);
            await updateDoc(tournamentDocRef, {
                name,
                date,
                time,
                entryFee,
                prize,
                slots: Number(slots),
                status,
                roomId,
                roomPassword,
            });
            toast({
                title: 'Success',
                description: `Tournament "${name}" has been updated.`
            });
            setOpen(false);
        } catch (error) {
            console.error("Error updating tournament:", error);
            toast({
                title: 'Error',
                description: 'Failed to update tournament. Please try again.',
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
                    <DialogTitle>Edit Tournament</DialogTitle>
                    <DialogDescription>
                        Make changes to "{tournament.name}".
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-6">
                     <div className="grid gap-2">
                        <Label htmlFor="name">Tournament Name</Label>
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
                            <Label htmlFor="prize">Prize Pool (INR)</Label>
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


                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-4 px-4 border-t">
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
                description: `Tournament "${tournamentName}" has been deleted.`
            });
        } catch (error) {
            console.error("Error deleting tournament:", error);
            toast({
                title: 'Error',
                description: 'Failed to delete tournament. Please try again.',
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
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the tournament "{tournamentName}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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

    const [activeTab, setActiveTab] = useState('transactions');
    const [isMounted, setIsMounted] = useState(false);
    const isMobile = useIsMobile();
    const [isBestiePageEnabled, setIsBestiePageEnabled] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(true);

    const router = useRouter();
    const { toast } = useToast();
    const { hideLoader } = useLoading();
    

    useEffect(() => {
        setIsMounted(true);
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
        return format(date, 'PPp');
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
                    const userName = userDoc.exists() ? userDoc.data().inGameName : 'Unknown User';
                    return { ...transaction, userName };
                })
            );

            setPendingTransactions(transactionsWithUserNames);
        });

        const settingsDocRef = doc(db, 'settings', 'featureControls');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setIsBestiePageEnabled(doc.data().isBestiePageEnabled || false);
            } else {
                setIsBestiePageEnabled(false);
            }
            setSettingsLoading(false);
        });


        // Cleanup listeners
        return () => {
            unsubscribeTournaments();
            unsubscribeUsers();
            unsubscribeTransactions();
            unsubscribeSettings();
        };
    }, [isAdmin, user]);
    
    const handleTransactionUpdate = async (
        transaction: Transaction,
        newStatus: 'Completed' | 'Failed'
    ) => {
        if (!isAdmin || !auth.currentUser) {
            toast({ title: 'Permission Denied', description: 'You do not have permission to perform this action.', variant: 'destructive' });
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
                    description: `Transaction has been ${newStatus === 'Completed' ? 'approved' : 'rejected'}.`
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error('Failed to update transaction:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update transaction.',
                variant: 'destructive'
            });
        } finally {
            setActionLoading(prev => ({...prev, [id]: false}));
        }
    };

    const handleBestiePageToggle = async (enabled: boolean) => {
        if (!auth.currentUser) return;
        setActionLoading(prev => ({ ...prev, bestiePageToggle: true }));
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await setBestiePageStatus(enabled, idToken);
            if (result.success) {
                toast({ title: 'Success', description: `Bestie page has been ${enabled ? 'activated' : 'deactivated'}.` });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            setIsBestiePageEnabled(!enabled);
        } finally {
            setActionLoading(prev => ({ ...prev, bestiePageToggle: false }));
        }
    };

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
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-12">
            <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>

             <section>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalUsers}</div>
                            <p className="text-xs text-muted-foreground">Registered users on the platform</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
                            <TrophyIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold">{totalTournaments}</div>
                            <p className="text-xs text-muted-foreground">Tournaments created so far</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold">{pendingTransactions.length}</div>
                           <p className="text-xs text-muted-foreground">Deposits and withdrawals awaiting action</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {!isMounted ? (
                     <Skeleton className="h-10 w-full max-w-md mb-6" />
                 ) : isMobile ? (
                     <div className="mb-6">
                        <Select value={activeTab} onValueChange={setActiveTab}>
                             <SelectTrigger>
                                 <SelectValue placeholder="Select a section" />
                             </SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="transactions">Transactions</SelectItem>
                                 <SelectItem value="tournaments">Tournaments</SelectItem>
                                 <SelectItem value="users">Users</SelectItem>
                                 <SelectItem value="besties">Besties</SelectItem>
                                 <SelectItem value="settings">Settings</SelectItem>
                             </SelectContent>
                         </Select>
                     </div>
                 ) : (
                    <TabsList>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="besties">Besties</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                 )}
                <TabsContent value="transactions" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Transactions</CardTitle>
                            <CardDescription>Review and process all pending user transactions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="deposits">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="deposits">
                                        <ArrowDownLeft className="mr-2 h-4 w-4 text-green-500" />
                                        Deposits ({pendingDeposits.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="withdrawals">
                                        <ArrowUpRight className="mr-2 h-4 w-4 text-red-500" />
                                        Withdrawals ({pendingWithdrawals.length})
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="deposits" className="mt-4">
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Transaction ID</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pendingDeposits.length > 0 ? (
                                                    pendingDeposits.map(deposit => (
                                                    <TableRow key={deposit.id}>
                                                        <TableCell className="font-medium">{deposit.userName}</TableCell>
                                                        <TableCell>₹{deposit.amount.toFixed(2)}</TableCell>
                                                        <TableCell className="font-mono text-xs">{deposit.transactionId}</TableCell>
                                                        <TableCell>{formatDate(deposit.date)}</TableCell>
                                                        <TableCell className="text-right space-x-2">
                                                            <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600" onClick={() => handleTransactionUpdate(deposit, 'Completed')} disabled={actionLoading[deposit.id]}>
                                                                <CheckCircle className="h-5 w-5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleTransactionUpdate(deposit, 'Failed')} disabled={actionLoading[deposit.id]}>
                                                                <XCircle className="h-5 w-5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-24 text-center">No pending deposit requests.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                                <TabsContent value="withdrawals" className="mt-4">
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Details</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pendingWithdrawals.length > 0 ? (
                                                    pendingWithdrawals.map(withdrawal => (
                                                    <TableRow key={withdrawal.id}>
                                                        <TableCell className="font-medium">{withdrawal.userName}</TableCell>
                                                        <TableCell>₹{withdrawal.amount.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild><Button variant="link" size="sm">View</Button></TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="text-sm p-2 space-y-2">
                                                                            <h4 className="font-bold">{withdrawal.details.method === 'upi' ? 'UPI Details' : 'Bank Details'}</h4>
                                                                            <p><strong>Name:</strong> {withdrawal.details.name}</p>
                                                                            {withdrawal.details.method === 'upi' ? (
                                                                                <p><strong>UPI ID:</strong> {withdrawal.details.upiId}</p>
                                                                            ) : (
                                                                                <>
                                                                                    <p><strong>Bank:</strong> {withdrawal.details.bankName}</p>
                                                                                    <p><strong>Account:</strong> {withdrawal.details.accountNumber}</p>
                                                                                    <p><strong>IFSC:</strong> {withdrawal.details.ifscCode}</p>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </TableCell>
                                                        <TableCell>{formatDate(withdrawal.date)}</TableCell>
                                                        <TableCell className="text-right space-x-2">
                                                            <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600" onClick={() => handleTransactionUpdate(withdrawal, 'Completed')} disabled={actionLoading[withdrawal.id]}>
                                                                <CheckCircle className="h-5 w-5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleTransactionUpdate(withdrawal, 'Failed')} disabled={actionLoading[withdrawal.id]}>
                                                                <XCircle className="h-5 w-5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-24 text-center">No pending withdrawal requests.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="tournaments" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Tournament Management</CardTitle>
                                <CardDescription>View, create, edit, and delete all scheduled tournaments.</CardDescription>
                            </div>
                            <CreateTournamentDialog />
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Slots</TableHead>
                                            <TableHead>Entry Fee</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Prize</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tournaments.map(tournament => (
                                            <TableRow key={tournament.id}>
                                                <TableCell className="font-medium">{tournament.name}</TableCell>
                                                <TableCell>{tournament.date} @ {tournament.time}</TableCell>
                                                <TableCell>{tournament.slotsFilled} / {tournament.slots}</TableCell>
                                                <TableCell>{tournament.entryFee === 'FREE' || tournament.entryFee === '0' ? 'FREE' : `₹${tournament.entryFee}`}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        tournament.status === 'Finished' ? 'destructive' :
                                                        tournament.status === 'Ongoing' ? 'default' :
                                                        'secondary'
                                                    }>
                                                        {tournament.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">₹{tournament.prize}</TableCell>
                                                <TableCell className="text-center flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={`/admin/registrations/${tournament.id}`}>
                                                            <UsersRound className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <EditTournamentDialog tournament={tournament} />
                                                    <DeleteTournamentDialog tournamentId={tournament.id} tournamentName={tournament.name} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="users" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        Search, view, and manage user details and actions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center items-center h-48 bg-secondary rounded-lg">
                        <Button asChild>
                            <Link href="/admin/users">Go to User Management Page</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                 <TabsContent value="besties" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-pink-500" />
                        Bestie Management
                      </CardTitle>
                      <CardDescription>
                        View all users who have the special 'isBestie' role.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center items-center h-48 bg-secondary rounded-lg">
                        <Button asChild>
                            <Link href="/admin/besties">View Bestie List</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                 <TabsContent value="settings" className="mt-6 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Controls</CardTitle>
                            <CardDescription>
                                Enable or disable special features across the site.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {settingsLoading ? (
                                <Skeleton className="h-20 w-full" />
                            ) : (
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="bestie-page-switch" className="text-base font-medium">Special Bestie Page</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Activate the animated special page for all users with the 'isBestie' role.
                                        </p>
                                    </div>
                                    <Switch
                                        id="bestie-page-switch"
                                        checked={isBestiePageEnabled}
                                        onCheckedChange={handleBestiePageToggle}
                                        disabled={actionLoading['bestiePageToggle']}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <SliderAdmin />
                </TabsContent>
            </Tabs>
        </div>
    );
}
