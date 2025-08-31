
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon, Phone, Wallet, PlusCircle, MinusCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type UserProfile = {
    inGameName: string;
    phone: string;
    walletBalance: number;
    email: string;
};

const mockTransactions = [
    { id: 'txn1', type: 'deposit', amount: 500, date: '2024-07-28', status: 'Completed' },
    { id: 'txn2', type: 'entry_fee', amount: -100, date: '2024-07-28', status: 'Completed' },
    { id: 'txn3', type: 'withdrawal', amount: -200, date: '2024-07-27', status: 'Pending' },
    { id: 'txn4', type: 'prize', amount: 1000, date: '2024-07-26', status: 'Completed' },
    { id: 'txn5', type: 'deposit', amount: 250, date: '2024-07-25', status: 'Completed' },
];


export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setProfile(userDoc.data() as UserProfile);
                } else {
                    console.error("User profile not found in Firestore.");
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);
    
    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="space-y-2">
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                     <CardFooter>
                        <Skeleton className="h-10 w-32" />
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl text-center">
                <p>Could not load user profile.</p>
            </div>
        )
    }


    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
            <div className="flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={`https://api.dicebear.com/8.x/bottts/svg?seed=${user?.uid}`} />
                                <AvatarFallback>{profile.inGameName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-3xl">{profile.inGameName}</CardTitle>
                                <CardDescription>Manage your profile and wallet.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                             <div className="grid gap-2">
                                <Label htmlFor="in-game-name" className="flex items-center gap-2 text-muted-foreground"><UserIcon className="h-4 w-4" /> In-Game Name</Label>
                                <Input id="in-game-name" value={profile.inGameName} readOnly />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone" className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> Phone Number</Label>
                                <Input id="phone" value={profile.phone} readOnly />
                            </div>
                        </div>
                         <div className="p-4 bg-secondary rounded-lg">
                            <Label htmlFor="wallet" className="flex items-center gap-2 text-muted-foreground mb-2"><Wallet className="h-4 w-4" /> Wallet Balance</Label>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-4xl font-bold text-primary">₹{profile.walletBalance.toFixed(2)}</p>
                                <div className="flex gap-2">
                                    <Button>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Funds
                                    </Button>
                                     <Button variant="outline">
                                        <MinusCircle className="mr-2 h-4 w-4" />
                                        Withdraw
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Transaction History</CardTitle>
                        <CardDescription>View your recent wallet activity.</CardDescription>
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
                                    {mockTransactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {tx.amount > 0 ? <ArrowDownLeft className="h-4 w-4 text-green-500"/> : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                                                    <span className="capitalize font-medium">{tx.type.replace('_', ' ')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{tx.date}</TableCell>
                                            <TableCell>
                                                <Badge variant={tx.status === 'Completed' ? 'secondary' : 'default'} className={tx.status === 'Pending' ? 'bg-primary/80' : ''}>
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold ${tx.amount > 0 ? 'text-green-500' : ''}`}>
                                                {tx.amount > 0 ? `+₹${tx.amount.toFixed(2)}` : `₹${tx.amount.toFixed(2)}`}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
