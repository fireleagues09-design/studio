'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, Timestamp, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, PlusCircle, MinusCircle, ArrowUpRight, ArrowDownLeft, Gift, PiggyBank, CircleDollarSign, CalendarIcon, Copy, Info, Clock, XCircle, RefreshCw } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLoading } from '@/context/LoadingContext';


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

type PaymentDetails = {
    upiId: string;
    upiQrCodeUrl: string;
}

function AddFundsDialog({ paymentDetails }: { paymentDetails: PaymentDetails | null }) {
    const [amount, setAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const upiId = paymentDetails?.upiId || '';
    const upiQrCodeUrl = paymentDetails?.upiQrCodeUrl || '';

    const handleCopyUpi = () => {
        if (!upiId) {
            toast({
                title: "Error",
                description: "UPI ID is not set.",
                variant: "destructive"
            });
            return;
        }
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
                description: 'You must be logged in to add funds.',
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

        if (Number(amount) < 20) {
            toast({
                title: 'Invalid Amount',
                description: 'The minimum fund addition is ₹20.',
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
                description: 'Your request has been received. Funds will be added to your deposit balance within 24 hours after verification.',
            });
        } catch (error) {
            console.error("Error submitting deposit request:", error);
            toast({
                title: 'Error',
                description: 'Failed to submit request. Please try again.',
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
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Add Funds to Wallet</DialogTitle>
                    <DialogDescription>
                        Complete an offline transfer and submit the details here.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="p-3 bg-secondary rounded-lg text-center space-y-2">
                        <div>
                            <h3 className="font-semibold text-sm">Transfer Instructions</h3>
                            <p className="text-[10px] text-muted-foreground">
                                Scan the QR code or use the UPI ID below, then submit your reference number.
                            </p>
                        </div>

                        {upiQrCodeUrl ? (
                            <div className="relative w-44 h-44 mx-auto rounded-xl overflow-hidden bg-background/50 border border-primary/10 shadow-inner">
                                <Image
                                    src={upiQrCodeUrl}
                                    alt="Scan to pay"
                                    fill
                                    className="object-contain p-1"
                                    unoptimized
                                />
                            </div>
                        ) : (
                            <div className="w-40 h-40 mx-auto border border-dashed rounded-xl bg-background flex items-center justify-center">
                                <p className="text-[10px] text-muted-foreground text-center p-4">Admin has not configured a QR Code yet.</p>
                            </div>
                        )}
                        
                        {upiId ? (
                            <div className="flex items-center justify-between p-2 bg-background/80 rounded-lg border border-border/50">
                                <p className="font-mono text-primary text-xs break-all text-left flex-1 font-bold">{upiId}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyUpi}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        ) : (
                             <div className="flex items-center justify-center p-2 bg-background rounded-md">
                                <p className="text-xs text-muted-foreground italic">UPI ID not set by admin.</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3 px-1">
                        <div className="grid gap-2">
                            <Label htmlFor="amount" className="text-xs">Amount (INR)</Label>
                            <Input 
                                id="amount"
                                type="number"
                                min="0"
                                placeholder="Min: ₹20"
                                value={amount}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setAmount(val);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                                }}
                                className="h-10 rounded-xl"
                                required 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="transactionId" className="text-xs">Reference ID / UTR</Label>
                            <Input 
                                id="transactionId"
                                type="text"
                                placeholder="Enter the 12-digit reference number"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                className="h-10 rounded-xl"
                                required 
                            />
                        </div>
                         <DialogFooter className="pt-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="rounded-xl flex-1">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={loading} className="rounded-xl flex-[2] font-bold">
                                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : 'Submit Request'}
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

        const withdrawalAmount = Number(amount);
        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            toast({ title: 'Error', description: 'Please enter a valid amount.', variant: 'destructive' });
            return;
        }
        if (withdrawalAmount < 30 || withdrawalAmount > 30000) {
            toast({ title: 'Error', description: 'Amount must be between ₹30 and ₹30,000.', variant: 'destructive' });
            return;
        }
        if (withdrawalAmount > winnings) {
             toast({ title: 'Error', description: 'Amount cannot exceed your available rewards balance.', variant: 'destructive' });
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
                    title: 'Transfer Request Submitted',
                    description: 'Your request has been received and will be processed following manual verification.'
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
                    <DialogTitle>Withdraw Rewards</DialogTitle>
                    <DialogDescription>
                        Transfer your performance rewards to your bank account or UPI.
                    </DialogDescription>
                </DialogHeader>
                
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Withdrawals are processed from your Rewards balance (₹30 - ₹30,000 per request).
                    </AlertDescription>
                </Alert>

                <div className="grid gap-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="withdraw-amount">Amount to Withdraw (INR)</Label>
                        <Input
                            id="withdraw-amount"
                            type="number"
                            min="0"
                            placeholder={`Available Rewards: ₹${winnings.toFixed(2)}`}
                            value={amount}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || Number(val) >= 0) setAmount(val);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                            }}
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
                                {loading ? 'Submitting...' : 'Request Transfer'}
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
                                {loading ? 'Submitting...' : 'Request Transfer'}
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
    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const { hideLoader } = useLoading();

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
                        setProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching wallet profile:", error);
                    setLoading(false);
                });

                const paymentDocRef = doc(db, 'settings', 'paymentDetails');
                const unsubPayment = onSnapshot(paymentDocRef, (doc) => {
                    if (doc.exists()) {
                        setPaymentDetails(doc.data() as PaymentDetails);
                    }
                });
                
                return () => {
                    unsubProfile();
                    unsubPayment();
                };
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
            setLoadingTransactions(false);
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [user, dateRange, loading]);

    useEffect(() => {
        if (!loading && !loadingTransactions) {
            hideLoader();
        }
    }, [loading, loadingTransactions, hideLoader]);


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
                description: "Could not fetch history.",
                variant: "destructive"
            });
        } finally {
            setLoadingTransactions(false);
        }
    };
    
    const wallet = profile?.wallet || { deposit: 0, winning: 0, bonus: 0 };
    const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

    if (loading || !user) {
        return null;
    }

    if (!profile) {
        return null;
    }


    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
            <div className="flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">My Wallet</CardTitle>
                        <CardDescription>Monitor your competitive balance and reward history.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="p-4 bg-secondary rounded-lg space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="flex items-center gap-2 text-muted-foreground mb-2"><Wallet className="h-4 w-4" /> Combined Balance</p>
                                    <p className="text-4xl font-bold text-primary">₹{totalBalance.toFixed(2)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <AddFundsDialog paymentDetails={paymentDetails} />
                                     <WithdrawFundsDialog user={user} winnings={wallet.winning} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-muted-foreground/20">
                                <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
                                    <PiggyBank className="h-6 w-6 text-primary/80"/>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Deposit Balance</p>
                                        <p className="font-semibold">₹{wallet.deposit.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
                                    <CircleDollarSign className="h-6 w-6 text-primary/80"/>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Performance Rewards</p>
                                        <p className="font-semibold">₹{wallet.winning.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
                                    <Gift className="h-6 w-6 text-primary/80"/>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Promotional Bonus</p>
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
                                <CardTitle>History</CardTitle>
                                <CardDescription>Recent activity from your competitive sessions.</CardDescription>
                            </div>
                             <div className="flex items-center gap-2">
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
                                        <span>Select date range</span>
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
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={fetchTransactions}
                                    disabled={loadingTransactions}
                                    aria-label="Refresh list"
                                >
                                    <RefreshCw className={cn("h-4 w-4", loadingTransactions && "animate-spin")} />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Activity</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingTransactions ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Loading activity...
                                            </TableCell>
                                        </TableRow>
                                    ) : transactions.length > 0 ? (
                                        transactions.map(tx => {
                                            let icon: React.ReactNode;
                                            let amountStyle: string = "text-right font-semibold";
                                            let amountText: string;
                                            let statusBadge: React.ReactNode;

                                            switch (tx.status) {
                                                case 'Completed':
                                                    if (tx.type === 'deposit' || tx.type === 'prize') {
                                                        icon = <ArrowDownLeft className="h-4 w-4 text-green-500"/>;
                                                        amountStyle += ' text-green-500';
                                                        amountText = `+₹${tx.amount.toFixed(2)}`;
                                                    } else { // withdrawal or entry_fee
                                                        icon = <ArrowUpRight className="h-4 w-4 text-red-500"/>;
                                                        amountStyle += ' text-red-500';
                                                        amountText = `-₹${Math.abs(tx.amount).toFixed(2)}`;
                                                    }
                                                    statusBadge = <Badge variant="secondary">{tx.status}</Badge>;
                                                    break;
                                                case 'Pending':
                                                    icon = <Clock className="h-4 w-4 text-amber-500"/>;
                                                    amountStyle += ' text-muted-foreground';
                                                    amountText = `₹${tx.amount.toFixed(2)}`;
                                                    statusBadge = <Badge className="bg-amber-500 border-transparent text-white hover:bg-amber-500/90">{tx.status}</Badge>;
                                                    break;
                                                case 'Failed':
                                                    icon = <XCircle className="h-4 w-4 text-red-500"/>;
                                                    amountStyle += ' text-red-500';
                                                    amountText = `₹${tx.amount.toFixed(2)}`;
                                                    statusBadge = <Badge variant="destructive">{tx.status}</Badge>;
                                                    break;
                                                default:
                                                    icon = <Info className="h-4 w-4 text-muted-foreground"/>;
                                                    amountStyle += ' text-muted-foreground';
                                                    amountText = `₹${tx.amount.toFixed(2)}`;
                                                    statusBadge = <Badge variant="secondary">{tx.status}</Badge>;
                                                    break;
                                            }

                                            return (
                                                <TableRow key={tx.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {icon}
                                                            <span className="capitalize font-medium">{tx.type.replace('_', ' ')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{format(tx.date.toDate(), 'PP')}</TableCell>
                                                    <TableCell>
                                                        {statusBadge}
                                                    </TableCell>
                                                    <TableCell className={amountStyle}>
                                                        {amountText}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No activity found for this period.
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
