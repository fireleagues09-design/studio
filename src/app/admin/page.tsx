

'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, query, orderBy, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, Activity, Pencil, Trash, PlusCircle, MinusCircle as MinusCircleIcon, UsersRound, Search } from 'lucide-react';
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
import { searchUsers } from './actions';
import { useDebounce } from 'use-debounce';


const FULL_MAP_RULES = [
    'You Will Get Room ID & Password 10 to 5 minutes before the match starting time.',
    'Always On Screen Recording While Playing FireLeagues Tournament matches ( if your own goods and in any major issues screenshot will not accepted ).',
    'Minimum Game Level Should be 40.',
    'Headshot ( % ) Should not be more then 70% in BR Career mode.',
    'Don\'t Invite Anyone who is not registered to this tournament and don\'t leak ID Password.',
    'Team-up not allowed.',
    'Multiple Accounts Are not Allowed and if you create multiple Accounts then it\'ll lead to suspension and all balance will be taken by us permanently.',
    'Refund Only For those players who\'s eliminated/killed by hackers',
    'PC & Emulators Players Are Not Allowed to join and play in room match ( only can access website on pc and can only register yourself for tournaments in PC/Emulators/mobile but not allowed to play tournaments )'
];

function CreateTournamentDialog() {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [prize, setPrize] = useState('');
    const [slots, setSlots] = useState('');
    const [category, setCategory] = useState('Clash Squad 4v4');
    const [teamType, setTeamType] = useState('Squad');
    const [status, setStatus] = useState<TournamentType['status']>('Upcoming');
    const [prizeDistribution, setPrizeDistribution] = useState([{ place: '1st', prize: '' }]);
    const [prizePerKill, setPrizePerKill] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handlePrizeChange = (index: number, field: 'place' | 'prize', value: string) => {
        const newDistribution = [...prizeDistribution];
        newDistribution[index][field] = value;
        setPrizeDistribution(newDistribution);
    };

    const addPrizeRow = () => {
        setPrizeDistribution([...prizeDistribution, { place: '', prize: '' }]);
    };

    const removePrizeRow = (index: number) => {
        const newDistribution = prizeDistribution.filter((_, i) => i !== index);
        setPrizeDistribution(newDistribution);
    };

    const resetForm = () => {
        setName('');
        setDate('');
        setTime('');
        setEntryFee('');
        setPrize('');
        setSlots('');
        setCategory('Clash Squad 4v4');
        setTeamType('Squad');
        setStatus('Upcoming');
        setPrizeDistribution([{ place: '1st', prize: '' }]);
        setPrizePerKill('');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const imageUrl = 'https://picsum.photos/600/400';
        const dataAiHint = 'gaming abstract';
        
        const rules = category === 'Classic Full Map' ? FULL_MAP_RULES : [];

        try {
            const finalPrizeDistribution = prizeDistribution.filter(p => p.place && p.prize);
            if (prizePerKill) {
                finalPrizeDistribution.push({ place: 'Per Kill', prize: prizePerKill });
            }

            const tournamentId = Math.floor(10000000 + Math.random() * 90000000).toString();
            const tournamentDocRef = doc(db, 'tournaments', tournamentId);

            await setDoc(tournamentDocRef, {
                id: tournamentId,
                name,
                date,
                time,
                entryFee,
                prize,
                slots: Number(slots),
                category,
                teamType,
                status,
                image: imageUrl,
                slotsFilled: 0,
                registeredPlayers: [],
                dataAiHint,
                rules: rules,
                prizeDistribution: finalPrizeDistribution,
                roomId: '',
                roomPassword: '',
                createdAt: serverTimestamp()
            });
            toast({
                title: 'Success',
                description: `Tournament "${name}" has been created.`
            });
            resetForm();
            setOpen(false);
        } catch (error) {
            console.error("Error creating tournament:", error);
            toast({
                title: 'Error',
                description: 'Failed to create tournament. Please try again.',
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
                    Create Tournament
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Tournament</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the new tournament.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
                     <div className="grid gap-2">
                        <Label htmlFor="create-name">Tournament Name</Label>
                        <Input id="create-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-date">Date</Label>
                            <Input id="create-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-time">Time</Label>
                            <Input id="create-time" type="time" value={time} onChange={e => setTime(e.target.value)} required/>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Prize Details</Label>
                        <div className="p-4 border rounded-md space-y-3 bg-secondary/50">
                             <div className="grid gap-2">
                                <Label htmlFor="create-prize">Total Prize Pool (INR)</Label>
                                <Input id="create-prize" type="number" value={prize} onChange={e => setPrize(e.target.value)} placeholder="e.g. 50000" required/>
                            </div>
                            <Label>Prize Distribution</Label>
                            {prizeDistribution.map((dist, index) => (
                                <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center">
                                    <Input placeholder="Place (e.g., 1st)" value={dist.place} onChange={e => handlePrizeChange(index, 'place', e.target.value)} />
                                    <Input type="number" placeholder="Prize (INR)" value={dist.prize} onChange={e => handlePrizeChange(index, 'prize', e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePrizeRow(index)} disabled={prizeDistribution.length === 1}>
                                        <MinusCircleIcon className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={addPrizeRow}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Rank
                            </Button>
                            <div className="grid gap-2 pt-3 border-t">
                                <Label htmlFor="prize-per-kill">Prize Per Kill (INR)</Label>
                                <Input id="prize-per-kill" type="number" value={prizePerKill} onChange={e => setPrizePerKill(e.target.value)} placeholder="e.g. 50" />
                            </div>
                        </div>
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-entryFee">Entry Fee (INR)</Label>
                            <Input id="create-entryFee" value={entryFee} onChange={e => setEntryFee(e.target.value)} required/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-slots">Total Slots</Label>
                            <Input id="create-slots" type="number" value={slots} onChange={e => setSlots(e.target.value)} required/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="create-category">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="create-category">
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Clash Squad 4v4">Clash Squad 4v4</SelectItem>
                                    <SelectItem value="Classic Full Map">Classic Full Map</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="create-teamType">Team Type</Label>
                            <Select value={teamType} onValueChange={setTeamType}>
                                <SelectTrigger id="create-teamType">
                                    <SelectValue placeholder="Select team type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Solo">Solo</SelectItem>
                                    <SelectItem value="Duo">Duo</SelectItem>
                                    <SelectItem value="Squad">Squad</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                     <div className="grid gap-2">
                        <Label htmlFor="create-status">Status</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as TournamentType['status'])}>
                            <SelectTrigger id="create-status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Upcoming">Upcoming</SelectItem>
                                <SelectItem value="Ongoing">Ongoing</SelectItem>
                                <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-4 px-4 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Tournament'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

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
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
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

function DeleteTournamentDialog({ tournamentId, tournamentName }: { tournamentId: string, tournamentName: string }) {
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
    const [users, setUsers] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<TournamentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(userSearchTerm, 300);
    const [userSearchLoading, setUserSearchLoading] = useState(false);
    
    const router = useRouter();
    const { toast } = useToast();

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
        if (!isAdmin || !user) return;

        setDataLoading(true);

        const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"));
        const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setTransactions(transactionsData);
        }, (error) => console.error("Error fetching transactions:", error));
        
        const tournamentsQuery = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
        const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
            const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentType));
            setTournaments(tournamentsData);
            setDataLoading(false); // Only set to false after the main data loads
        }, (error) => {
            console.error("Error fetching tournaments:", error)
            setDataLoading(false);
        });

        // Cleanup listeners
        return () => {
            unsubscribeTransactions();
            unsubscribeTournaments();
        };
    }, [isAdmin, user]);


     const handleSearchUsers = useCallback(async (searchTerm: string) => {
        if (!user) return;
        setUserSearchLoading(true);
        try {
            const idToken = await user.getIdToken();
            const result = await searchUsers(idToken, searchTerm);
            if (result.success) {
                setUsers(result.users || []);
            } else {
                toast({ title: "Search Error", description: result.message, variant: "destructive" });
            }
        } catch (error) {
            console.error("Failed to search users:", error);
            toast({ title: "Search Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setUserSearchLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        handleSearchUsers(debouncedSearchTerm);
    }, [debouncedSearchTerm, handleSearchUsers]);
    
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
                <div className="flex items-center justify-center h-64">
                    <p>Loading Admin Panel...</p>
                </div>
            </div>
        )
    }

    if (!isAdmin) {
         return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center justify-center h-64">
                    <p>Redirecting...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-12">
            <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            
            {dataLoading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
            ) : (
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
            )}

            <section>
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Tournament Management</CardTitle>
                            <CardDescription>View, create, edit, and delete all scheduled tournaments.</CardDescription>
                        </div>
                        <CreateTournamentDialog />
                    </CardHeader>
                    <CardContent>
                        {dataLoading ? (
                             <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Slots</TableHead>
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
                        )}
                    </CardContent>
                </Card>
            </section>

            <section>
                <Card>
                     <CardHeader>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>Search for users by name, UID, or phone number.</CardDescription>
                         <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                className="pl-9"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                         {userSearchLoading ? (
                             <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
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
                                        {users.length > 0 ? (
                                            users.map(user => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">{user.inGameName}</TableCell>
                                                    <TableCell>{user.phone}</TableCell>
                                                    <TableCell>{formatDate(user.registeredOn)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {user.isAdmin && <Badge>Admin</Badge>}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                             <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    {debouncedSearchTerm ? `No users found for "${debouncedSearchTerm}"` : "No recent users."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
    

    
    

    


