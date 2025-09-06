
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, PlusCircle, MinusCircle, ArrowUpRight, ArrowDownLeft, Gift, PiggyBank, CircleDollarSign, CalendarIcon, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requestWithdrawal } from './actions';


type UserProfile = {
    inGameName: string;
    phone: string;
    wallet?: {
        deposit: number;
        winning: number;
        bonus: number;
    };
    email: string;
};

type Transaction = {
    id: string;
    type: 'deposit' | 'entry_fee' | 'withdrawal' | 'prize';
    amount: number;
    date: Timestamp;
    status: 'Completed' | 'Pending' | 'Failed';
};

function AddFundsDialog() {
    const [amount, setAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const upiId = 'fireleagues@examplebank';

    const handleCopyUpi = () => {
        navigator.clipboard.writeText(upiId);
        toast({
            title: "Copied!",
            description: "UPI ID copied to clipboard.",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            toast({
                title: 'Error',
                description: 'You must be logged in to make a deposit.',
                variant: 'destructive',
            });
            return;
        }

        if (!amount || !transactionId) {
            toast({
                title: 'Error',
                description: 'Please fill out all fields.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'transactions'), {
                userId: user.uid,
                type: 'deposit',
                amount: Number(amount),
                transactionId: transactionId,
                status: 'Pending',
                date: serverTimestamp(),
            });

            setAmount('');
            setTransactionId('');
            setOpen(false);
            toast({
                title: 'Request Submitted',
                description: 'Your deposit request has been received. It will be processed within 24 hours after verification.',
            });
        } catch (error) {
            console.error("Error submitting deposit request:", error);
            toast({
                title: 'Error',
                description: 'Failed to submit deposit request. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Funds
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Funds to Wallet</DialogTitle>
                    <DialogDescription>
                        Complete an offline payment and submit the details here.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="p-4 bg-secondary rounded-lg">
                        <h3 className="font-semibold mb-2">Payment Instructions</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Transfer the desired amount to the UPI ID below. After the transfer, enter the amount and the transaction ID from your payment app.
                        </p>
                        <div className="flex items-center justify-between p-3 bg-background rounded-md">
                            <p className="text-lg font-mono text-primary">{upiId}</p>
                            <Button variant="ghost" size="icon" onClick={handleCopyUpi}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 px-1">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount (INR)</Label>
                            <Input 
                                id="amount"
                                type="number"
                                placeholder="e.g., 500"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="transactionId">Transaction ID / UTR</Label>
                            <Input 
                                id="transactionId"
                                type="text"
                                placeholder="Enter the 12-digit reference number"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                required 
                            />
                        </div>
                         <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function WithdrawFundsDialog({ user, winnings }: { user: FirebaseUser | null, winnings: number }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    // UPI state
    const [upiName, setUpiName] = useState('');
    const [upiId, setUpiId] = useState('');

    // Bank state
    const [bankName, setBankName] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');

    const handleSubmit = async (method: 'upi' | 'bank') => {
        if (!user) {
            toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
            return;
        }
        if (!amount || Number(amount) <= 0) {
            toast({ title: 'Error', description: 'Please enter a valid amount.', variant: 'destructive' });
            return;
        }
        if (Number(amount) > winnings) {
             toast({ title: 'Error', description: 'Withdrawal amount cannot exceed your winnings balance.', variant: 'destructive' });
            return;
        }

        let details = {};
        if (method === 'upi') {
            if (!upiName || !upiId) {
                toast({ title: 'Error', description: 'Please fill in your name and UPI ID.', variant: 'destructive' });
                return;
            }
            details = { name: upiName, upiId };
        } else { // bank
            if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
                 toast({ title: 'Error', description: 'Please fill in all bank details.', variant: 'destructive' });
                return;
            }
            details = { name: accountHolderName, bankName, accountNumber, ifscCode };
        }

        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const result = await requestWithdrawal(Number(amount), method, details, idToken);

            if (result.success) {
                toast({
                    title: 'Request Submitted',
                    description: 'Your withdrawal request has been received and will be processed soon.'
                });
                setOpen(false);
                // Reset fields
                setAmount('');
                setUpiName('');
                setUpiId('');
                setBankName('');
                setAccountHolderName('');
                setAccountNumber('');
                setIfscCode('');
            } else {
                throw new Error(result.message);
            }

        } catch (error: any) {
            toast({
                title: 'Request Failed',
                description: error.message || 'An unknown error occurred.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <MinusCircle className="mr-2 h-4 w-4" />
                    Withdraw
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Withdraw Winnings</DialogTitle>
                    <DialogDescription>
                        Request a withdrawal to your bank account or UPI. Amount will be deducted from your winnings.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="withdraw-amount">Amount to Withdraw (INR)</Label>
                        <Input
                            id="withdraw-amount"
                            type="number"
                            placeholder={`Max: ₹${winnings.toFixed(2)}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <Tabs defaultValue="upi">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upi">UPI</TabsTrigger>
                        <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upi">
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="upi-name">Your Name</Label>
                                <Input id="upi-name" placeholder="Full name" value={upiName} onChange={e => setUpiName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="upi-id">UPI ID</Label>
                                <Input id="upi-id" placeholder="yourname@bank" value={upiId} onChange={e => setUpiId(e.target.value)} />
                            </div>
                            <Button onClick={() => handleSubmit('upi')} disabled={loading} className="w-full">
                                {loading ? 'Submitting...' : 'Request via UPI'}
                            </Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="bank">
                         <div className="space-y-4 py-4">
                             <div className="grid gap-2">
                                <Label htmlFor="bank-name-holder">Account Holder Name</Label>
                                <Input id="bank-name-holder" placeholder="Full name as per bank" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="bank-name">Bank Name</Label>
                                <Input id="bank-name" placeholder="e.g. State Bank of India" value={bankName} onChange={e => setBankName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="account-number">Account Number</Label>
                                <Input id="account-number" placeholder="Enter account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="ifsc-code">IFSC Code</Label>
                                <Input id="ifsc-code" placeholder="Enter IFSC code" value={ifscCode} onChange={e => setIfscCode(e.target.value)} />
                            </div>
                             <Button onClick={() => handleSubmit('bank')} disabled={loading} className="w-full">
                                {loading ? 'Submitting...' : 'Request via Bank Transfer'}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}


export default function WalletPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubProfile = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        const profileData = doc.data() as UserProfile;
                        setProfile(profileData);
                    } else {
                        console.error("User profile not found in Firestore.");
                        router.push('/login');
                    }
                    setLoading(false);
                });
                return () => unsubProfile();
            } else {
                router.push('/login');
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);
    
     useEffect(() => {
        if (user) {
            fetchTransactions();
        } else if (!loading) {
            // If the auth state is resolved and there's no user, don't attempt to load transactions.
            setLoadingTransactions(false);
        }
     }, [user, dateRange, loading]);


    const fetchTransactions = async () => {
        if (!user) return;
        setLoadingTransactions(true);
        try {
            const transactionsRef = collection(db, "transactions");
            let q;

            if (dateRange?.from && dateRange?.to) {
                 q = query(
                    transactionsRef,
                    where("userId", "==", user.uid),
                    where("date", ">=", startOfDay(dateRange.from)),
                    where("date", "<=", endOfDay(dateRange.to)),
                    orderBy("date", "desc")
                );
            } else {
                // Default query: last 10 transactions
                q = query(
                    transactionsRef,
                    where("userId", "==", user.uid),
                    orderBy("date", "desc"),
                    limit(10)
                );
            }
            
            const querySnapshot = await getDocs(q);
            const userTransactions = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Transaction));
            setTransactions(userTransactions);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            toast({
                title: "Error",
                description: "Could not fetch transaction history.",
                variant: "destructive"
            });
        } finally {
            setLoadingTransactions(false);
        }
    };
    
    const wallet = profile?.wallet || { deposit: 0, winning: 0, bonus: 0 };
    const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl text-center">
                <p>Could not load wallet information.</p>
            </div>
        )
    }


    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
            <div className="flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">My Wallet</CardTitle>
                        <CardDescription>View your balances and transaction history.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="p-4 bg-secondary rounded-lg space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="flex items-center gap-2 text-muted-foreground mb-2"><Wallet className="h-4 w-4" /> Total Balance</p>
                                    <p className="text-4xl font-bold text-primary">₹{totalBalance.toFixed(2)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <AddFundsDialog />
                                     <WithdrawFundsDialog user={user} winnings={wallet.winning} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-muted-foreground/20">
                                <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
                                    <PiggyBank className="h-6 w-6 text-primary/80"/>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Deposit</p>
                                        <p className="font-semibold">₹{wallet.deposit.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
                                    <CircleDollarSign className="h-6 w-6 text-primary/80"/>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Winnings</p>
                                        <p className="font-semibold">₹{wallet.winning.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
                                    <Gift className="h-6 w-6 text-primary/80"/>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Bonus</p>
                                        <p className="font-semibold">₹{wallet.bonus.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Transaction History</CardTitle>
                                <CardDescription>Your last 10 transactions. Use the filter to see more.</CardDescription>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full sm:w-[300px] justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date range</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                        disabled={(date) => date > new Date() || date < subMonths(new Date(), 3)}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingTransactions ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Loading transactions...
                                            </TableCell>
                                        </TableRow>
                                    ) : transactions.length > 0 ? (
                                        transactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {tx.type === 'deposit' || tx.type === 'prize' ? <ArrowDownLeft className="h-4 w-4 text-green-500"/> : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                                                    <span className="capitalize font-medium">{tx.type.replace('_', ' ')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{format(tx.date.toDate(), 'PP')}</TableCell>
                                            <TableCell>
                                                <Badge variant={tx.status === 'Completed' ? 'secondary' : tx.status === 'Failed' ? 'destructive' : 'default'} className={tx.status === 'Pending' ? 'bg-primary/80' : ''}>
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold ${tx.type === 'deposit' || tx.type === 'prize' ? 'text-green-500' : 'text-red-500'}`}>
                                                {tx.type === 'deposit' || tx.type === 'prize' ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No transactions found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    
