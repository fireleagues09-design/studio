
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Users, DollarSign, Activity, Trophy, Pencil } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Tournament as TournamentType } from '@/lib/mock-data';


type UserProfile = {
    id: string;
    inGameName: string;
    phone: string;
    email: string;
    registeredOn: any;
    wallet: {
        deposit: number;
        winning: number;
        bonus: number;
    };
    isAdmin?: boolean;
};

type Transaction = {
    id: string;
    type: 'deposit' | 'entry_fee' | 'withdrawal' | 'prize';
    amount: number;
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
                slots: Number(slots)
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Tournament</DialogTitle>
                    <DialogDescription>
                        Make changes to "{tournament.name}".
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                     <div className="grid gap-2">
                        <Label htmlFor="slots">Total Slots</Label>
                        <Input id="slots" type="number" value={slots} onChange={e => setSlots(e.target.value)} />
                    </div>
                    <DialogFooter>
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


export default function AdminPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [tournaments, setTournaments] = useState<TournamentType[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (isAdmin) {
            const usersQuery = query(collection(db, "users"), orderBy("registeredOn", "desc"));
            const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
                const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
                setUsers(usersData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching users:", error);
                setLoading(false);
            });

            const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"));
            const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
                const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                setTransactions(transactionsData);
            }, (error) => {
                console.error("Error fetching transactions:", error);
            });
            
            const tournamentsQuery = query(collection(db, "tournaments"), orderBy("date", "desc"));
            const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
                const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentType));
                setTournaments(tournamentsData);
            }, (error) => {
                console.error("Error fetching tournaments:", error);
            });


            return () => {
                unsubscribeUsers();
                unsubscribeTransactions();
                unsubscribeTournaments();
            };
        }
    }, [isAdmin]);
    
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'PPp');
    };

    const totalUsers = users.length;
    const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'Pending').length;

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <Skeleton className="h-10 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
            </div>
        )
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-12">
            <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">All registered users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalDeposits.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Completed deposits</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingDeposits}</div>
                        <p className="text-xs text-muted-foreground">Pending deposit requests</p>
                    </CardContent>
                </Card>
            </section>
            
            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>Tournament Management</CardTitle>
                        <CardDescription>View and edit all scheduled tournaments.</CardDescription>
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
                                            <TableCell>{tournament.entryFee}</TableCell>
                                            <TableCell className="text-right">₹{tournament.prize}</TableCell>
                                            <TableCell className="text-center">
                                                <EditTournamentDialog tournament={tournament} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
                        <CardDescription>The last 10 users who registered.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>In-Game Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Registered</TableHead>
                                        <TableHead className="text-right">Admin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.slice(0, 10).map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.inGameName}</TableCell>
                                            <TableCell>{user.phone}</TableCell>
                                            <TableCell>{formatDate(user.registeredOn)}</TableCell>
                                            <TableCell className="text-right">
                                                {user.isAdmin && <Badge>Admin</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </section>

        </div>
    );
}

    